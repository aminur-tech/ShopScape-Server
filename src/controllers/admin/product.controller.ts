import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// discountPercent is the source of truth for a % discount; discountPrice is
// derived and stored alongside it so storefront reads stay a single query.
// e.g. price=1000, discountPercent=10 -> discountPrice=900
function computeDiscountPrice(price: number, discountPercent?: number | null): number | null {
  if (discountPercent == null) return null;
  return Math.round(price - (price * discountPercent) / 100);
}

export async function adminGetProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw new AppError("Product not found", 404);
  res.json({ product });
}

export async function adminListProducts(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export const productInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0),
  discountPercent: z.number().int().min(0).max(100).optional(),
  sizeChart: z.string().optional(),
  sizes: z.array(z.string()).default([]),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string()).default([]),
  categoryId: z.string(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function adminCreateProduct(req: Request, res: Response) {
  const data = req.body as z.infer<typeof productInputSchema>;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const discountPrice = computeDiscountPrice(data.price, data.discountPercent);

  const product = await prisma.product.create({ data: { ...data, slug, discountPrice } });
  res.status(201).json({ product });
}

export async function adminUpdateProduct(req: Request, res: Response) {
  const data = req.body as Partial<z.infer<typeof productInputSchema>>;

  // If price or discountPercent changed, recompute discountPrice using the
  // final values (falling back to what's already stored for whichever
  // field wasn't sent in this request).
  let discountPriceUpdate: { discountPrice: number | null } | {} = {};
  if (data.price !== undefined || data.discountPercent !== undefined) {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError("Product not found", 404);
    const price = data.price ?? existing.price;
    const discountPercent = data.discountPercent !== undefined ? data.discountPercent : existing.discountPercent;
    discountPriceUpdate = { discountPrice: computeDiscountPrice(price, discountPercent) };
  }

  const product = await prisma.product
    .update({
      where: { id: req.params.id },
      data: { ...data, ...discountPriceUpdate, ...(data.slug ? { slug: slugify(data.slug) } : {}) },
    })
    .catch(() => null);
  if (!product) throw new AppError("Product not found", 404);
  res.json({ product });
}

// Soft delete: keeps historical OrderItem rows intact and simply hides
// the product from the storefront.
export async function adminDeleteProduct(req: Request, res: Response) {
  const product = await prisma.product
    .update({ where: { id: req.params.id }, data: { isActive: false } })
    .catch(() => null);
  if (!product) throw new AppError("Product not found", 404);
  res.json({ message: "Product deactivated" });
}
