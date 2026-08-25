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

export async function adminListCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
}

export const categoryInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export async function adminCreateCategory(req: Request, res: Response) {
  const data = req.body as z.infer<typeof categoryInputSchema>;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const category = await prisma.category.create({ data: { ...data, slug } });
  res.status(201).json({ category });
}

export async function adminUpdateCategory(req: Request, res: Response) {
  const data = req.body as Partial<z.infer<typeof categoryInputSchema>>;
  const category = await prisma.category
    .update({
      where: { id: req.params.id },
      data: { ...data, ...(data.slug ? { slug: slugify(data.slug) } : {}) },
    })
    .catch(() => null);
  if (!category) throw new AppError("Category not found", 404);
  res.json({ category });
}

export async function adminDeleteCategory(req: Request, res: Response) {
  const productsInCategory = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (productsInCategory > 0) {
    throw new AppError("এই ক্যাটাগরিতে প্রোডাক্ট থাকায় মুছে ফেলা যাবে না", 400);
  }
  const category = await prisma.category.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!category) throw new AppError("Category not found", 404);
  res.json({ message: "Category deleted" });
}
