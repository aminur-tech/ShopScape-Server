import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";
import { generateOtpCode, otpExpiryDate } from "../utils/otp";
import { sendVerificationCodeEmail } from "../utils/mailer";
import { signCheckoutToken, verifyCheckoutToken } from "../utils/jwt";
import { generateOrderNumber } from "../utils/orderNumber";
import { orderEvents, ORDER_STATUS_CHANGED } from "../events/orderEvents";
import { env } from "../config/env";

const CHECKOUT_PURPOSE = "CHECKOUT";

// ---- Step 1: send a 6-digit code to the customer's email ----

export const sendCodeSchema = z.object({
  email: z.string().email(),
});

export async function sendCheckoutCode(req: Request, res: Response) {
  const { email } = req.body as z.infer<typeof sendCodeSchema>;

  const code = generateOtpCode();
  await prisma.emailVerification.create({
    data: { email, code, purpose: CHECKOUT_PURPOSE, expiresAt: otpExpiryDate(10) },
  });

  await sendVerificationCodeEmail(email, code);
  res.json({ message: "ভেরিফিকেশন কোড পাঠানো হয়েছে" });
}

// ---- Step 2: confirm the code, get a short-lived checkout token ----

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function verifyCheckoutCode(req: Request, res: Response) {
  const { email, code } = req.body as z.infer<typeof verifyCodeSchema>;

  const record = await prisma.emailVerification.findFirst({
    where: { email, code, purpose: CHECKOUT_PURPOSE, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw new AppError("কোডটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে", 400);

  await prisma.emailVerification.update({ where: { id: record.id }, data: { verified: true } });

  const verifiedToken = signCheckoutToken(email);
  res.json({ verifiedToken });
}

// ---- Public: bKash/Nagad receive numbers, shown on the checkout page ----

export async function getPaymentConfig(_req: Request, res: Response) {
  res.json({
    bkashNumber: env.BKASH_RECEIVE_NUMBER,
    nagadNumber: env.NAGAD_RECEIVE_NUMBER,
  });
}

// ---- Step 3: place the order using the verified token ----

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
});

export const placeOrderSchema = z
  .object({
    verifiedToken: z.string(),
    items: z.array(orderItemSchema).min(1),
    fullName: z.string().min(2),
    phone: z.string().min(6),
    division: z.string().min(2),
    district: z.string().min(2),
    area: z.string().min(2),
    addressLine: z.string().min(4),
    paymentMethod: z.enum(["COD", "BKASH", "NAGAD"]).default("COD"),
    transactionId: z.string().optional(),
    paymentProofUrl: z.string().url().optional(),
  })
  // bKash/Nagad are manual/offline payments - we require proof so the
  // admin can verify before approving the order.
  .refine(
    (data) => data.paymentMethod === "COD" || (data.transactionId && data.paymentProofUrl),
    { message: "bKash/Nagad পেমেন্টের জন্য ট্রানজেকশন আইডি ও পেমেন্ট স্ক্রিনশট আবশ্যক", path: ["transactionId"] }
  );

// Flat-rate delivery fee, kept simple on purpose - swap for a real rate
// table (by division/district) when needed.
function calcDeliveryFee(division: string): number {
  return division.trim().toLowerCase() === "dhaka" ? 70 : 120;
}

export async function placeOrder(req: Request, res: Response) {
  const body = req.body as z.infer<typeof placeOrderSchema>;

  let email: string;
  try {
    email = verifyCheckoutToken(body.verifiedToken).email;
  } catch {
    throw new AppError("ইমেইল ভেরিফিকেশন এর মেয়াদ শেষ, আবার চেষ্টা করুন", 401);
  }

  const productIds = body.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    throw new AppError("এক বা একাধিক প্রোডাক্ট পাওয়া যায়নি", 400);
  }

  let subtotal = 0;
  const itemsData = body.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    if (product.stock < item.quantity) {
      throw new AppError(`${product.name} - পর্যাপ্ত স্টক নেই`, 400);
    }
    const unitPrice = product.discountPrice ?? product.price;
    subtotal += unitPrice * item.quantity;
    return {
      productId: product.id,
      name: product.name,
      price: unitPrice,
      quantity: item.quantity,
    };
  });

  const deliveryFee = calcDeliveryFee(body.division);
  const total = subtotal + deliveryFee;

  // Optional: link to a logged-in user if a valid bearer token was sent too.
  const userId = req.user?.id;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: userId ?? null,
        guestEmail: userId ? null : email,
        // Every new order starts as PENDING - an admin must explicitly
        // Confirm/Approve it (PATCH /admin/orders/:id/status) before it
        // moves into processing. This applies to COD too, since COD
        // orders can still be fake/mistaken and benefit from a review step.
        status: "PENDING",
        paymentMethod: body.paymentMethod,
        transactionId: body.transactionId,
        paymentProofUrl: body.paymentProofUrl,
        fullName: body.fullName,
        phone: body.phone,
        division: body.division,
        district: body.district,
        area: body.area,
        addressLine: body.addressLine,
        subtotal,
        deliveryFee,
        total,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    for (const item of itemsData) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return created;
  });

  orderEvents.emit(ORDER_STATUS_CHANGED, { order, status: order.status });

  res.status(201).json({ order });
}
