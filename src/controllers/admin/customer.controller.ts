import type { Request, Response } from "express";
import { prisma } from "../../config/prisma";

export async function adminListCustomers(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  res.json({ customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
