import type { Request, Response } from "express";
import { prisma } from "../../config/prisma";

const LOW_STOCK_THRESHOLD = 5;

export async function adminDashboard(_req: Request, res: Response) {
  const [
    totalOrders,
    totalCustomers,
    revenueAgg,
    ordersByStatus,
    lowStockProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "CANCELLED" } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lt: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, stock: true },
      take: 10,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
    }),
  ]);

  res.json({
    totalOrders,
    totalCustomers,
    totalRevenue: revenueAgg._sum.total ?? 0,
    ordersByStatus: ordersByStatus.map((o) => ({ status: o.status, count: o._count._all })),
    lowStockProducts,
    recentOrders,
  });
}
