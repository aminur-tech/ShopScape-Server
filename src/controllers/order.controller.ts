import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";
import { streamInvoicePdf } from "../utils/invoice";

export async function myOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
}

export async function getMyOrder(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { items: true },
  });
  if (!order) throw new AppError("Order not found", 404);
  res.json({ order });
}

export async function downloadMyInvoice(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { items: true },
  });
  if (!order) throw new AppError("Order not found", 404);
  streamInvoicePdf(res, order);
}

export const trackOrderSchema = z.object({
  orderNumber: z.string(),
  phone: z.string().min(6),
});

// Public endpoint - requires orderNumber + phone together so a stranger
// can't enumerate someone else's order just by guessing the number.
export async function trackOrder(req: Request, res: Response) {
  const { orderNumber, phone } = req.query as unknown as z.infer<typeof trackOrderSchema>;

  const order = await prisma.order.findFirst({
    where: { orderNumber, phone },
    include: { items: true },
  });
  if (!order) throw new AppError("অর্ডার খুঁজে পাওয়া যায়নি", 404);
  res.json({ order });
}

// Public invoice download for guest checkouts, gated the same way as
// tracking - orderNumber + phone together.
export async function downloadPublicInvoice(req: Request, res: Response) {
  const { orderNumber, phone } = req.query as unknown as z.infer<typeof trackOrderSchema>;

  const order = await prisma.order.findFirst({
    where: { orderNumber, phone },
    include: { items: true },
  });
  if (!order) throw new AppError("অর্ডার খুঁজে পাওয়া যায়নি", 404);
  streamInvoicePdf(res, order);
}
