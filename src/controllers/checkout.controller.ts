import type { Request, Response } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";

import {
  generateOtpCode,
  otpExpiryDate,
} from "../utils/otp";

import {
  sendVerificationCodeEmail,
} from "../utils/mailer";

import {
  signCheckoutToken,
  verifyCheckoutToken,
} from "../utils/jwt";

import { generateOrderNumber } from "../utils/orderNumber";

import {
  orderEvents,
  ORDER_STATUS_CHANGED,
} from "../events/orderEvents";

import { env } from "../config/env";

/* =========================================================
   DEBUG
========================================================= */

const DEBUG_CHECKOUT = true;

function checkoutLog(
  title: string,
  data?: unknown
) {
  if (!DEBUG_CHECKOUT) return;

  console.log(
    "\n=================================================="
  );

  console.log(`[CHECKOUT] ${title}`);

  if (data !== undefined) {
    console.dir(data, {
      depth: null,
      colors: true,
    });
  }

  console.log(
    "==================================================\n"
  );
}

function checkoutError(
  title: string,
  error?: unknown
) {
  console.error(
    "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );

  console.error(
    `[CHECKOUT ERROR] ${title}`
  );

  if (error !== undefined) {
    console.dir(error, {
      depth: null,
      colors: true,
    });
  }

  console.error(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
  );
}

/* =========================================================
   CONSTANTS
========================================================= */

const CHECKOUT_PURPOSE = "CHECKOUT";

/* =========================================================
   DHAKA SUB-URBAN AREAS
========================================================= */

const DHAKA_SUBURBAN_AREAS = [
  "Ashulia",
  "Dhamrai",
  "Dohar",
  "Hemayetpur",
  "Keraniganj Model",
  "Nawabganj",
  "Savar",
  "South Keraniganj",
] as const;

type DhakaSuburbanArea =
  (typeof DHAKA_SUBURBAN_AREAS)[number];

/* =========================================================
   DELIVERY ZONE
========================================================= */

const deliveryZoneSchema = z.enum([
  "DHAKA_CITY",
  "DHAKA_SUBURBAN",
  "OUTSIDE_DHAKA",
]);

type DeliveryZone = z.infer<
  typeof deliveryZoneSchema
>;

const DELIVERY_CHARGES: Record<
  DeliveryZone,
  number
> = {
  DHAKA_CITY: 70,
  DHAKA_SUBURBAN: 100,
  OUTSIDE_DHAKA: 120,
};

/* =========================================================
   HELPERS
========================================================= */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isDhakaSuburbanArea(
  area: string
): boolean {
  const normalizedArea =
    normalize(area);

  return DHAKA_SUBURBAN_AREAS.some(
    (item) =>
      normalize(item) ===
      normalizedArea
  );
}

/* =========================================================
   DELIVERY ZONE
========================================================= */

function getDeliveryZone(
  division: string,
  district: string,
  area: string
): DeliveryZone {
  const normalizedDivision =
    normalize(division);

  const normalizedDistrict =
    normalize(district);

  checkoutLog(
    "Determining delivery zone",
    {
      division,
      district,
      area,
      normalizedDivision,
      normalizedDistrict,
      isSuburban:
        isDhakaSuburbanArea(area),
    }
  );

  if (
    normalizedDivision === normalize("ঢাকা") &&
    normalizedDistrict === normalize("ঢাকা")
  ) {
    if (
      isDhakaSuburbanArea(area)
    ) {
      return "DHAKA_SUBURBAN";
    }

    return "DHAKA_CITY";
  }

  return "OUTSIDE_DHAKA";
}

/* =========================================================
   STEP 1
   SEND EMAIL VERIFICATION CODE
========================================================= */

export const sendCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .email("সঠিক ইমেইল দিন"),
});

export async function sendCheckoutCode(
  req: Request,
  res: Response
) {
  checkoutLog(
    "STEP 1 - SEND CHECKOUT CODE"
  );

  checkoutLog(
    "Request body",
    req.body
  );

  const parsed =
    sendCodeSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    checkoutError(
      "SEND CODE VALIDATION FAILED",
      parsed.error.issues
    );

    return res.status(400).json({
      error: "Validation failed",
      details:
        parsed.error.issues.map(
          (issue) => ({
            field:
              issue.path.join(".") ||
              "body",

            message:
              issue.message,

            code:
              issue.code,
          })
        ),
    });
  }

  const { email } =
    parsed.data;

  checkoutLog(
    "Email validated",
    {
      email,
    }
  );

  const code =
    generateOtpCode();

  const expiresAt =
    otpExpiryDate(10);

  checkoutLog(
    "Generated OTP",
    {
      email,
      code,
      expiresAt,
    }
  );

  try {
    await prisma.emailVerification.create({
      data: {
        email,
        code,
        purpose:
          CHECKOUT_PURPOSE,
        expiresAt,
      },
    });

    checkoutLog(
      "OTP saved to database"
    );
  } catch (error) {
    checkoutError(
      "FAILED TO SAVE OTP",
      error
    );

    throw error;
  }

  try {
    await sendVerificationCodeEmail(
      email,
      code
    );

    checkoutLog(
      "OTP email sent successfully"
    );
  } catch (error) {
    checkoutError(
      "FAILED TO SEND OTP EMAIL",
      error
    );

    throw error;
  }

  return res.json({
    message:
      "ভেরিফিকেশন কোড পাঠানো হয়েছে",
  });
}

/* =========================================================
   STEP 2
   VERIFY EMAIL CODE
========================================================= */

export const verifyCodeSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email("সঠিক ইমেইল দিন"),

    code: z
      .string()
      .regex(
        /^\d{6}$/,
        "৬ সংখ্যার কোড দিন"
      ),
  });

export async function verifyCheckoutCode(
  req: Request,
  res: Response
) {
  checkoutLog(
    "STEP 2 - VERIFY CHECKOUT CODE"
  );

  checkoutLog(
    "Request body",
    req.body
  );

  const parsed =
    verifyCodeSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    checkoutError(
      "VERIFY CODE VALIDATION FAILED",
      parsed.error.issues
    );

    return res.status(400).json({
      error: "Validation failed",
      details:
        parsed.error.issues.map(
          (issue) => ({
            field:
              issue.path.join(".") ||
              "body",

            message:
              issue.message,

            code:
              issue.code,
          })
        ),
    });
  }

  const {
    email,
    code,
  } = parsed.data;

  const record =
    await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        purpose:
          CHECKOUT_PURPOSE,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  if (!record) {
    checkoutError(
      "OTP NOT FOUND / EXPIRED",
      {
        email,
        code,
      }
    );

    throw new AppError(
      "কোডটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে",
      400
    );
  }

  await prisma.emailVerification.update({
    where: {
      id: record.id,
    },

    data: {
      verified: true,
    },
  });

  const verifiedToken =
    signCheckoutToken(email);

  return res.json({
    verifiedToken,
  });
}

/* =========================================================
   PAYMENT CONFIG
========================================================= */

export async function getPaymentConfig(
  _req: Request,
  res: Response
) {
  return res.json({
    bkashNumber:
      env.BKASH_RECEIVE_NUMBER,

    nagadNumber:
      env.NAGAD_RECEIVE_NUMBER,
  });
}

/* =========================================================
   ORDER ITEM SCHEMA
========================================================= */

const orderItemSchema =
  z.object({
    productId: z
      .string()
      .min(
        1,
        "Product ID required"
      ),

    quantity: z
      .number()
      .int(
        "Quantity must be an integer"
      )
      .min(
        1,
        "Quantity must be at least 1"
      ),

    selectedColor: z
      .string()
      .trim()
      .optional(),

    selectedSize: z
      .string()
      .trim()
      .optional(),

    selectedImageUrl: z
      .string()
      .url()
      .optional(),
  });

/* =========================================================
   PLACE ORDER SCHEMA
========================================================= */

export const placeOrderSchema =
  z
    .object({
      verifiedToken: z
        .string()
        .min(
          1,
          "Verified token required"
        ),

      items: z
        .array(orderItemSchema)
        .min(
          1,
          "কমপক্ষে একটি প্রোডাক্ট নির্বাচন করুন"
        ),

      fullName: z
        .string()
        .trim()
        .min(
          2,
          "নাম কমপক্ষে ২ অক্ষরের হতে হবে"
        ),

      phone: z
        .string()
        .trim()
        .regex(
          /^01[3-9]\d{8}$/,
          "সঠিক বাংলাদেশি মোবাইল নম্বর দিন"
        ),

      division: z
        .string()
        .trim()
        .min(
          2,
          "বিভাগ নির্বাচন করুন"
        ),

      district: z
        .string()
        .trim()
        .min(
          2,
          "জেলা নির্বাচন করুন"
        ),

      area: z
        .string()
        .trim()
        .min(
          2,
          "এলাকা / থানা নির্বাচন করুন"
        ),

      addressLine: z
        .string()
        .trim()
        .min(
          4,
          "সম্পূর্ণ ঠিকানা দিন"
        ),

      deliveryZone:
        deliveryZoneSchema.default(
          "OUTSIDE_DHAKA"
        ),

      paymentMethod: z
        .enum([
          "COD",
          "BKASH",
          "NAGAD",
        ])
        .default("COD"),

      transactionId: z
        .string()
        .trim()
        .optional(),

      paymentProofUrl: z
        .string()
        .url()
        .optional(),
    })

    .superRefine(
      (data, ctx) => {
        if (
          data.paymentMethod === "BKASH" ||
          data.paymentMethod === "NAGAD"
        ) {
          if (
            !data.transactionId ||
            !data.transactionId.trim()
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "transactionId",
              ],

              message:
                "Transaction ID দিতে হবে",
            });
          }

          if (
            !data.paymentProofUrl
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "paymentProofUrl",
              ],

              message:
                "Payment screenshot দিতে হবে",
            });
          }
        }
      }
    );

/* =========================================================
   DELIVERY FEE
========================================================= */

function calcDeliveryFee(
  deliveryZone: DeliveryZone
): number {
  return DELIVERY_CHARGES[
    deliveryZone
  ];
}

/* =========================================================
   PLACE ORDER
========================================================= */

export async function placeOrder(
  req: Request,
  res: Response
) {
  const requestId =
    `checkout-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  checkoutLog(
    `START PLACE ORDER - ${requestId}`
  );

  /* =======================================================
     VALIDATE BODY
  ======================================================= */

  const parsed =
    placeOrderSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    const details =
      parsed.error.issues.map(
        (issue) => ({
          field:
            issue.path.length > 0
              ? issue.path.join(".")
              : "body",

          message:
            issue.message,

          code:
            issue.code,
        })
      );

    checkoutError(
      "REQUEST VALIDATION FAILED",
      {
        requestId,
        details,
      }
    );

    return res.status(400).json({
      error:
        "Validation failed",

      requestId,

      details,
    });
  }

  const body =
    parsed.data;

  /* =======================================================
     VERIFY CHECKOUT TOKEN
  ======================================================= */

  let email: string;

  try {
    const tokenData =
      verifyCheckoutToken(
        body.verifiedToken
      );

    email =
      tokenData.email;

    checkoutLog(
      "CHECKOUT TOKEN VALID",
      {
        email,
      }
    );
  } catch (error) {
    checkoutError(
      "CHECKOUT TOKEN INVALID",
      error
    );

    throw new AppError(
      "ইমেইল ভেরিফিকেশন এর মেয়াদ শেষ, আবার চেষ্টা করুন",
      401
    );
  }

  /* =======================================================
     DELIVERY ZONE
  ======================================================= */

  const deliveryZone =
    getDeliveryZone(
      body.division,
      body.district,
      body.area
    );

  checkoutLog(
    "DELIVERY ZONE",
    {
      frontend:
        body.deliveryZone,

      backend:
        deliveryZone,
    }
  );

  /* =======================================================
     PRODUCTS
  ======================================================= */

  const productIds =
    body.items.map(
      (item) =>
        item.productId
    );

  const uniqueProductIds = [
    ...new Set(productIds),
  ];

  const products =
    await prisma.product.findMany({
      where: {
        id: {
          in:
            uniqueProductIds,
        },
      },
    });

  if (
    products.length !==
    uniqueProductIds.length
  ) {
    const foundIds =
      products.map(
        (product: (typeof products)[number]) =>
          product.id
      );

    const missingIds =
      uniqueProductIds.filter(
        (id) =>
          !foundIds.includes(id)
      );

    throw new AppError(
      `এক বা একাধিক প্রোডাক্ট পাওয়া যায়নি: ${missingIds.join(
        ", "
      )}`,
      400
    );
  }

  /* =======================================================
     SUBTOTAL + STOCK STATUS
     
     IMPORTANT:
     
     stock = 1 → available
     stock = 0 → unavailable
     
     stock quantity নয়।
     
     তাই quantity-এর সাথে stock compare করা যাবে না।
  ======================================================= */

  let subtotal = 0;

  const itemsData =
    body.items.map(
      (item) => {
        const product =
          products.find(
            (product: (typeof products)[number]) =>
              product.id ===
              item.productId
          );

        if (!product) {
          throw new AppError(
            "প্রোডাক্ট পাওয়া যায়নি",
            400
          );
        }

        checkoutLog(
          "STOCK STATUS CHECK",
          {
            productId:
              product.id,

            productName:
              product.name,

            stockStatus:
              product.stock,

            requestedQuantity:
              item.quantity,
          }
        );

        /* =================================================
           NEW STOCK LOGIC

           1 = IN STOCK
           0 = OUT OF STOCK

           Quantity limit নেই।
        ================================================= */

        if (
          product.stock === 0
        ) {
          checkoutError(
            "PRODUCT OUT OF STOCK",
            {
              product:
                product.name,

              stock:
                product.stock,
            }
          );

          throw new AppError(
            `${product.name} বর্তমানে স্টকে নেই`,
            400
          );
        }

        /* =================================================
           SAFETY CHECK

           ভবিষ্যতে যদি ভুল করে stock
           negative হয়ে যায়, order বন্ধ হবে।
        ================================================= */

        if (
          product.stock < 0
        ) {
          throw new AppError(
            `${product.name} এর stock status ভুল`,
            400
          );
        }

        /* =================================================
           PRICE
        ================================================= */

        const unitPrice =
          product.discountPrice ??
          product.price;

        const itemTotal =
          unitPrice *
          item.quantity;

        subtotal +=
          itemTotal;

        return {
          productId:
            product.id,

          name:
            product.name,

          price:
            unitPrice,

          quantity:
            item.quantity,

          selectedColor:
            item.selectedColor,

          selectedSize:
            item.selectedSize,

          selectedImageUrl:
            item.selectedImageUrl,
        };
      }
    );

  checkoutLog(
    "SUBTOTAL",
    {
      subtotal,
      itemsData,
    }
  );

  /* =======================================================
     DELIVERY FEE
  ======================================================= */

  const deliveryFee =
    calcDeliveryFee(
      deliveryZone
    );

  /* =======================================================
     TOTAL
  ======================================================= */

  const total =
    subtotal +
    deliveryFee;

  checkoutLog(
    "FINAL TOTAL",
    {
      subtotal,
      deliveryFee,
      total,
    }
  );

  /* =======================================================
     USER
  ======================================================= */

  const userId =
    req.user?.id;

  /* =======================================================
     CREATE ORDER
  ======================================================= */

  let order;

  try {
    order =
      await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const orderNumber =
            generateOrderNumber();

          /* ===============================================
             CREATE ORDER
          =============================================== */

          const created =
            await tx.order.create({
              data: {
                orderNumber,

                userId:
                  userId ?? null,

                guestEmail:
                  userId
                    ? null
                    : email,

                status:
                  "PENDING",

                paymentMethod:
                  body.paymentMethod,

                transactionId:
                  body.transactionId,

                paymentProofUrl:
                  body.paymentProofUrl,

                fullName:
                  body.fullName,

                phone:
                  body.phone,

                division:
                  body.division,

                district:
                  body.district,

                area:
                  body.area,

                addressLine:
                  body.addressLine,

                subtotal,

                deliveryFee,

                total,

                items: {
                  create:
                    itemsData,
                },
              },

              include: {
                items: true,
              },
            });

          checkoutLog(
            "ORDER CREATED",
            {
              orderId:
                created.id,

              orderNumber:
                created.orderNumber,

              total:
                created.total,

              itemCount:
                created.items.length,
            }
          );

          /* ===============================================
             IMPORTANT

             এখানে stock decrement করা হবে না।

             কারণ:

             stock = 1 → available
             stock = 0 → unavailable

             Example:

             stock = 1
             customer quantity = 2

             Order:
             quantity = 2 ✅

             Product stock:
             1 ✅

             আবার quantity = 5
             Order:
             quantity = 5 ✅

             Product stock:
             1 ✅
          =============================================== */

          checkoutLog(
            "STOCK NOT DECREMENTED",
            {
              reason:
                "stock is availability flag",

              meaning:
                "1 = available, 0 = unavailable",
            }
          );

          return created;
        }
      );

    checkoutLog(
      "DATABASE TRANSACTION SUCCESS",
      {
        orderId:
          order.id,

        orderNumber:
          order.orderNumber,
      }
    );
  } catch (error) {
    checkoutError(
      "ORDER TRANSACTION FAILED",
      error
    );

    throw error;
  }

  /* =======================================================
     ORDER EVENT
  ======================================================= */

  try {
    orderEvents.emit(
      ORDER_STATUS_CHANGED,
      {
        order,

        status:
          order.status,
      }
    );
  } catch (error) {
    checkoutError(
      "ORDER EVENT FAILED",
      error
    );
  }

  /* =======================================================
     RESPONSE
  ======================================================= */

  checkoutLog(
    "CHECKOUT SUCCESS",
    {
      orderId:
        order.id,

      orderNumber:
        order.orderNumber,

      subtotal:
        order.subtotal,

      deliveryFee:
        order.deliveryFee,

      total:
        order.total,
    }
  );

  return res.status(201).json({
    order,
  });
}