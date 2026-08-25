import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
}
