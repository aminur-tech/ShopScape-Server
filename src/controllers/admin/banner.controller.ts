import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";

export async function adminListBanners(_req: Request, res: Response) {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ banners });
}

export const bannerInputSchema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function adminCreateBanner(req: Request, res: Response) {
  const data = req.body as z.infer<typeof bannerInputSchema>;
  const banner = await prisma.banner.create({ data });
  res.status(201).json({ banner });
}

export async function adminUpdateBanner(req: Request, res: Response) {
  const data = req.body as Partial<z.infer<typeof bannerInputSchema>>;
  const banner = await prisma.banner.update({ where: { id: req.params.id }, data }).catch(() => null);
  if (!banner) throw new AppError("Banner not found", 404);
  res.json({ banner });
}

export async function adminDeleteBanner(req: Request, res: Response) {
  const banner = await prisma.banner.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!banner) throw new AppError("Banner not found", 404);
  res.json({ message: "Banner deleted" });
}
