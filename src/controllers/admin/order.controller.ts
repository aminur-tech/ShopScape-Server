import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { orderEvents, ORDER_STATUS_CHANGED } from "../../events/orderEvents";
import { streamInvoicePdf } from "../../utils/invoice";

export async function adminListOrders(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const where = status ? { status: status as any } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function adminGetOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true, user: { select: { name: true, email: true, phone: true } }, notifications: true },
  });
  if (!order) throw new AppError("Order not found", 404);
  res.json({ order });
}

export async function adminDownloadInvoice(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!order) throw new AppError("Order not found", 404);
  streamInvoicePdf(res, order);
}

export const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

// This is the "প্রতি Action এর status notification" requirement:
// whenever an admin changes an order's status here, orderEvents fires
// and the customer gets an email + a NotificationLog row is written.
export async function adminUpdateOrderStatus(req: Request, res: Response) {
  const { status } = req.body as z.infer<typeof updateStatusSchema>;

  const order = await prisma.order
    .update({ where: { id: req.params.id }, data: { status } })
    .catch(() => null);
  if (!order) throw new AppError("Order not found", 404);

  orderEvents.emit(ORDER_STATUS_CHANGED, { order, status });

  res.json({ order });
}
