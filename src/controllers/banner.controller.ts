import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function listBanners(_req: Request, res: Response) {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ banners });
}
