import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";

export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  featured: z.coerce.boolean().optional(),
});

export async function listProducts(req: Request, res: Response) {
  const { category, q, page, limit, featured } = req.query as unknown as z.infer<
    typeof listProductsQuerySchema
  >;

  const where = {
    isActive: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(featured ? { isFeatured: true } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getProductBySlug(req: Request, res: Response) {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!product) throw new AppError("Product not found", 404);
  res.json({ product });
}
