import type { Request, Response } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";

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

/* =========================================================
   DELIVERY CHARGES
========================================================= */

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
    (item: DhakaSuburbanArea) =>
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

  /*
   * Dhaka Division + Dhaka District
   */

  if (
    normalizedDivision ===
      normalize("ঢাকা") &&
    normalizedDistrict ===
      normalize("ঢাকা")
  ) {
    if (
      isDhakaSuburbanArea(area)
    ) {
      return "DHAKA_SUBURBAN";
    }

    return "DHAKA_CITY";
  }

  /*
   * Everything outside Dhaka
   */

  return "OUTSIDE_DHAKA";
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
      /* =====================================================
         PRODUCTS
      ===================================================== */

      items: z
        .array(orderItemSchema)
        .min(
          1,
          "কমপক্ষে একটি প্রোডাক্ট নির্বাচন করুন"
        ),

      /* =====================================================
         CUSTOMER INFORMATION
      ===================================================== */

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

      /* =====================================================
         ADDRESS
      ===================================================== */

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

      /* =====================================================
         DELIVERY

         Frontend value is accepted for compatibility,
         but backend calculates the actual zone.
      ===================================================== */

      deliveryZone:
        deliveryZoneSchema.default(
          "OUTSIDE_DHAKA"
        ),

      /* =====================================================
         PAYMENT
      ===================================================== */

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

    /* =======================================================
       PAYMENT VALIDATION
    ======================================================= */

    .superRefine(
      (data, ctx) => {
        /*
         * bKash / Nagad payment হলে
         * Transaction ID required
         */

        if (
          data.paymentMethod ===
            "BKASH" ||
          data.paymentMethod ===
            "NAGAD"
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

          /*
           * Payment screenshot required
           */

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
     REQUEST BODY
  ======================================================= */

  checkoutLog(
    "Request body",
    req.body
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

  checkoutLog(
    "REQUEST VALIDATION SUCCESS",
    {
      requestId,
    }
  );

  /* =======================================================
     DELIVERY ZONE
  ======================================================= */

  /*
   * IMPORTANT:
   *
   * Frontend deliveryZone কে trust করা হচ্ছে না।
   *
   * Backend division + district + area দেখে
   * actual delivery zone determine করবে।
   */

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

  checkoutLog(
    "PRODUCT IDS",
    {
      productIds,
      uniqueProductIds,
    }
  );

  const products =
    await prisma.product.findMany({
      where: {
        id: {
          in:
            uniqueProductIds,
        },
      },
    });

  checkoutLog(
    "PRODUCTS FOUND",
    {
      count:
        products.length,
    }
  );

  /* =======================================================
     CHECK MISSING PRODUCTS
  ======================================================= */

  if (
    products.length !==
    uniqueProductIds.length
  ) {
    const foundIds =
      products.map(
        (
          product: (typeof products)[number]
        ) =>
          product.id
      );

    const missingIds =
      uniqueProductIds.filter(
        (id) =>
          !foundIds.includes(id)
      );

    checkoutError(
      "PRODUCTS NOT FOUND",
      {
        missingIds,
      }
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
  ======================================================= */

  let subtotal = 0;

  const itemsData =
    body.items.map(
      (item) => {
        const product =
          products.find(
            (
              product: (typeof products)[number]
            ) =>
              product.id ===
              item.productId
          );

        if (!product) {
          throw new AppError(
            "প্রোডাক্ট পাওয়া যায়নি",
            400
          );
        }

        /* =================================================
           STOCK STATUS
           
           stock = 1
           → IN STOCK

           stock = 0
           → OUT OF STOCK

           Quantity limit নেই।
        ================================================= */

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
           OUT OF STOCK
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
           INVALID NEGATIVE STOCK
        ================================================= */

        if (
          product.stock < 0
        ) {
          checkoutError(
            "INVALID NEGATIVE STOCK",
            {
              productId:
                product.id,

              productName:
                product.name,

              stock:
                product.stock,
            }
          );

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

        checkoutLog(
          "PRODUCT PRICE",
          {
            productId:
              product.id,

            productName:
              product.name,

            regularPrice:
              product.price,

            discountPrice:
              product.discountPrice,

            finalUnitPrice:
              unitPrice,

            quantity:
              item.quantity,
          }
        );

        /* =================================================
           ITEM TOTAL
        ================================================= */

        const itemTotal =
          unitPrice *
          item.quantity;

        subtotal +=
          itemTotal;

        /* =================================================
           ORDER ITEM
        ================================================= */

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

  /* =======================================================
     SUBTOTAL LOG
  ======================================================= */

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

  checkoutLog(
    "DELIVERY FEE",
    {
      deliveryZone,
      deliveryFee,
    }
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

  /*
   * Logged-in user হলে req.user.id থাকবে।
   *
   * Guest checkout হলে null হবে।
   */

  const userId =
    req.user?.id ?? null;

  checkoutLog(
    "CUSTOMER",
    {
      userId,
      fullName:
        body.fullName,
      phone:
        body.phone,
    }
  );

  /* =======================================================
     CREATE ORDER
  ======================================================= */

  let order;

  try {
    order =
      await prisma.$transaction(
        async (
          tx: Prisma.TransactionClient
        ) => {
          /* ===============================================
             ORDER NUMBER
          =============================================== */

          const orderNumber =
            generateOrderNumber();

          checkoutLog(
            "GENERATED ORDER NUMBER",
            {
              orderNumber,
            }
          );

          /* ===============================================
             CREATE ORDER
          =============================================== */

          const created =
            await tx.order.create({
              data: {
                /* =========================================
                   BASIC
                ========================================= */

                orderNumber,

                userId,

                status:
                  "PENDING",

                /* =========================================
                   PAYMENT
                ========================================= */

                paymentMethod:
                  body.paymentMethod,

                transactionId:
                  body.transactionId,

                paymentProofUrl:
                  body.paymentProofUrl,

                /* =========================================
                   CUSTOMER
                ========================================= */

                fullName:
                  body.fullName,

                phone:
                  body.phone,

                /* =========================================
                   ADDRESS
                ========================================= */

                division:
                  body.division,

                district:
                  body.district,

                area:
                  body.area,

                addressLine:
                  body.addressLine,

                /* =========================================
                   PRICE
                ========================================= */

                subtotal,

                deliveryFee,

                total,

                /* =========================================
                   ORDER ITEMS
                ========================================= */

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
             STOCK NOT DECREMENTED

             stock is availability flag:

             1 = available
             0 = unavailable

             Example:

             Product stock = 1
             Customer quantity = 2

             Order quantity = 2 ✅
             Product stock = 1 ✅

             Customer quantity = 5

             Order quantity = 5 ✅
             Product stock = 1 ✅

             তাই এখানে stock decrement হবে না।
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

    /* =====================================================
       TRANSACTION SUCCESS
    ===================================================== */

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
      {
        requestId,
        error,
      }
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

    checkoutLog(
      "ORDER EVENT EMITTED",
      {
        orderId:
          order.id,

        status:
          order.status,
      }
    );
  } catch (error) {
    checkoutError(
      "ORDER EVENT FAILED",
      error
    );

    /*
     * Order already successfully created.
     *
     * তাই event fail হওয়ার কারণে
     * customer order fail দেখানো হচ্ছে না।
     */
  }

  /* =======================================================
     FINAL RESPONSE
  ======================================================= */

  checkoutLog(
    "CHECKOUT SUCCESS",
    {
      requestId,

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