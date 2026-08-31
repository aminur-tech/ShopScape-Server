import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import {
  orderEvents,
  ORDER_STATUS_CHANGED,
} from "../../events/orderEvents";
import { streamInvoicePdf } from "../../utils/invoice";
import { sendAdminOrderMessageEmail } from "../../utils/mailer";

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

export const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

/* -------------------------------------------------------------------------- */
/* Admin Order List                                                           */
/* -------------------------------------------------------------------------- */

export async function adminListOrders(req: Request, res: Response) {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(
    Math.max(Number(req.query.limit ?? 20), 1),
    100
  );

  const status =
    typeof req.query.status === "string"
      ? req.query.status
      : undefined;

  const where = status
    ? {
        status: status as any,
      }
    : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.order.count({
      where,
    }),
  ]);

  res.json({
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Get Single Order                                                           */
/* -------------------------------------------------------------------------- */

export async function adminGetOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: {
      id: req.params.id,
    },

    include: {
      items: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },

      notifications: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  /*
   * Find previous orders from the same customer.
   *
   * Priority:
   * 1. Logged-in customer -> userId
   * 2. Guest customer -> phone
   */
  const previousOrders = await prisma.order.findMany({
    where: {
      id: {
        not: order.id,
      },

      OR: [
        ...(order.userId
          ? [
              {
                userId: order.userId,
              },
            ]
          : []),

        {
          phone: order.phone,
        },
      ],
    },

    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      returnRequired: true,
      deliveryPaymentRequired: true,
      deliveryPaymentStatus: true,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 20,
  });

  const hasPreviousReturns = previousOrders.some(
    (item: (typeof previousOrders)[number]) =>
      item.returnRequired === true ||
      item.status === "CANCELLED"
  );

  res.json({
    order,

    customerHistory: {
      totalPreviousOrders: previousOrders.length,

      hasPreviousReturns,

      previousOrders,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Download Invoice                                                           */
/* -------------------------------------------------------------------------- */

export async function adminDownloadInvoice(
  req: Request,
  res: Response
) {
  const order = await prisma.order.findUnique({
    where: {
      id: req.params.id,
    },

    include: {
      items: true,
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  streamInvoicePdf(res, order);
}

/* -------------------------------------------------------------------------- */
/* Update Order Status                                                        */
/* -------------------------------------------------------------------------- */

export async function adminUpdateOrderStatus(
  req: Request,
  res: Response
) {
  const { status } = req.body as z.infer<
    typeof updateStatusSchema
  >;

  const currentOrder = await prisma.order.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!currentOrder) {
    throw new AppError("Order not found", 404);
  }

  /*
   * If customer has previous return history,
   * confirmation requires delivery payment.
   */
  if (
    status === "CONFIRMED" &&
    currentOrder.deliveryPaymentRequired &&
    currentOrder.deliveryPaymentStatus !== "PAID"
  ) {
    throw new AppError(
      "এই অর্ডার Confirm করার আগে Delivery Charge Payment সম্পন্ন করতে হবে।",
      400
    );
  }

  const order = await prisma.order.update({
    where: {
      id: req.params.id,
    },

    data: {
      status,
    },
  });

  orderEvents.emit(ORDER_STATUS_CHANGED, {
    order,
    status,
  });

  res.json({
    order,
  });
}

/* -------------------------------------------------------------------------- */
/* Courier Tracking                                                           */
/* -------------------------------------------------------------------------- */

export const courierTrackingSchema = z.object({
  courierName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),

  courierTrackingUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("")),
});

export async function adminUpdateCourierTracking(
  req: Request,
  res: Response
) {
  const data = courierTrackingSchema.parse(req.body);

  const order = await prisma.order.update({
    where: {
      id: req.params.id,
    },

    data: {
      courierName: data.courierName || null,
      courierTrackingUrl:
        data.courierTrackingUrl || null,
    },
  });

  res.json({
    message: "Courier tracking information updated",
    order,
  });
}

/* -------------------------------------------------------------------------- */
/* Admin Customer Message                                                    */
/* -------------------------------------------------------------------------- */

export const adminMessageSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(2, "Subject is required")
    .max(150),

  message: z
    .string()
    .trim()
    .min(2, "Message is required")
    .max(5000),
});

export async function adminSendOrderMessage(
  req: Request,
  res: Response
) {
  const { subject, message } =
    adminMessageSchema.parse(req.body);

  const order = await prisma.order.findUnique({
    where: {
      id: req.params.id,
    },

    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const email = order.user?.email ?? order.guestEmail;

  if (!email) {
    throw new AppError(
      "এই customer-এর কোনো email address নেই।",
      400
    );
  }

  await sendAdminOrderMessageEmail({
    email,
    orderNumber: order.orderNumber,
    subject,
    message,
  });

  await prisma.notificationLog.create({
    data: {
      orderId: order.id,
      event: "ADMIN_CUSTOMER_MESSAGE",
      channel: "EMAIL",
      status: "SENT",
      payload: {
        subject,
        message,
      },
    },
  });

  res.json({
    success: true,
    message: "Customer-কে message পাঠানো হয়েছে।",
  });
}

/* -------------------------------------------------------------------------- */
/* Previous Return / Delivery Payment Requirement                             */
/* -------------------------------------------------------------------------- */

export const deliveryPaymentSchema = z.object({
  required: z.boolean(),

  paymentMethod: z
    .enum(["BKASH", "NAGAD"])
    .optional(),

  paymentStatus: z
    .enum(["UNPAID", "PENDING", "PAID"])
    .optional(),

  transactionId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),

  paymentProofUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
});

export async function adminUpdateDeliveryPayment(
  req: Request,
  res: Response
) {
  const data = deliveryPaymentSchema.parse(req.body);

  const order = await prisma.order.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const updated = await prisma.order.update({
    where: {
      id: order.id,
    },

    data: {
      returnRequired: data.required,

      deliveryPaymentRequired: data.required,

      deliveryPaymentMethod:
        data.paymentMethod ?? null,

      deliveryPaymentStatus:
        data.required
          ? data.paymentStatus ?? "UNPAID"
          : null,

      deliveryTransactionId:
        data.transactionId || null,

      deliveryPaymentProofUrl:
        data.paymentProofUrl || null,
    },
  });

  res.json({
    message: data.required
      ? "Delivery payment requirement updated."
      : "Delivery payment requirement removed.",

    order: updated,
  });
}