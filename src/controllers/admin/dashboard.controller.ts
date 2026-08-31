import type { Request, Response } from "express";
import { prisma } from "../../config/prisma";

const LOW_STOCK_THRESHOLD = 1;

/* =========================================================
   TYPES
========================================================= */

type MonthlyBucket = {
  month: string;
  monthLabel: string;
  orders: number;
  customers: Set<string>;
  revenue: number;
};

/* =========================================================
   HELPERS
========================================================= */

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(
    "bn-BD",
    {
      month: "short",
    }
  ).format(date);
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

export async function adminDashboard(
  _req: Request,
  res: Response
) {
  /* =======================================================
     LAST 12 MONTHS RANGE
  ======================================================= */

  const now = new Date();

  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - 11,
    1
  );

  /* =======================================================
     BASIC DASHBOARD DATA
  ======================================================= */

  const [
    totalOrders,

    customerPhones,

    revenueAgg,

    ordersByStatus,

    outOfStockProducts,

    recentOrders,

    monthlyOrders,
  ] = await Promise.all([
    /* =====================================================
       TOTAL ORDERS
    ===================================================== */

    prisma.order.count(),

    /* =====================================================
       TOTAL CUSTOMERS

       Customer means:
       যে phone number দিয়ে অন্তত ১টি order করেছে।

       Guest customer-ও এখানে count হবে।
    ===================================================== */

    prisma.order.findMany({
      where: {
        phone: {
          not: "",
        },
      },

      select: {
        phone: true,
      },

      distinct: ["phone"],
    }),

    /* =====================================================
       TOTAL REVENUE

       CANCELLED বাদ
    ===================================================== */

    prisma.order.aggregate({
      _sum: {
        total: true,
      },

      where: {
        status: {
          not: "CANCELLED",
        },
      },
    }),

    /* =====================================================
       ORDER STATUS
    ===================================================== */

    prisma.order.groupBy({
      by: ["status"],

      _count: {
        _all: true,
      },
    }),

    /* =====================================================
       OUT OF STOCK PRODUCTS

       stock:
       1 = In Stock
       0 = Out of Stock
    ===================================================== */

    prisma.product.findMany({
      where: {
        isActive: true,

        stock: {
          equals: 0,
        },
      },

      select: {
        id: true,
        name: true,
        stock: true,
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 10,
    }),

    /* =====================================================
       RECENT ORDERS
    ===================================================== */

    prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
      },
    }),

    /* =====================================================
       MONTHLY ORDERS

       Last 12 months
       CANCELLED বাদ
    ===================================================== */

    prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },

        status: {
          not: "CANCELLED",
        },
      },

      select: {
        phone: true,
        total: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  /* =======================================================
     TOTAL CUSTOMERS
  ======================================================= */

  const totalCustomers =
    customerPhones.length;

  /* =======================================================
     CREATE 12 MONTHS

     Empty month-ও chart-এ থাকবে।
  ======================================================= */

  const monthlyMap =
    new Map<string, MonthlyBucket>();

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (11 - i),
      1
    );

    const key = getMonthKey(date);

    monthlyMap.set(key, {
      month: key,

      monthLabel:
        getMonthLabel(date),

      orders: 0,

      customers:
        new Set<string>(),

      revenue: 0,
    });
  }

  /* =======================================================
     PROCESS MONTHLY ORDERS
  ======================================================= */

  for (const order of monthlyOrders) {
    const date = new Date(
      order.createdAt
    );

    const key = getMonthKey(date);

    const bucket =
      monthlyMap.get(key);

    if (!bucket) {
      continue;
    }

    /* Orders */

    bucket.orders += 1;

    /* Revenue */

    bucket.revenue +=
      Number(order.total ?? 0);

    /* Unique customer */

    const phone =
      order.phone?.trim();

    if (phone) {
      bucket.customers.add(phone);
    }
  }

  /* =======================================================
     MONTHLY ANALYTICS
  ======================================================= */

  const monthlyAnalytics =
    Array.from(
      monthlyMap.values()
    ).map((item) => ({
      month: item.month,

      monthLabel:
        item.monthLabel,

      orders: item.orders,

      customers:
        item.customers.size,

      revenue:
        item.revenue,
    }));

  /* =======================================================
     RESPONSE
  ======================================================= */

  return res.json({
    /* =====================================================
       SUMMARY
    ===================================================== */

    totalOrders,

    totalCustomers,

    totalRevenue:
      revenueAgg._sum.total ?? 0,

    /* =====================================================
       STATUS
    ===================================================== */

    ordersByStatus:
      ordersByStatus.map(
        (item: (typeof ordersByStatus)[number]) => ({
          status: item.status,

          count:
            item._count._all,
        })
      ),

    /* =====================================================
       STOCK

       Only OUT OF STOCK products
    ===================================================== */

    lowStockProducts:
      outOfStockProducts,

    /* =====================================================
       RECENT ORDERS
    ===================================================== */

    recentOrders,

    /* =====================================================
       CHART
    ===================================================== */

    monthlyAnalytics,
  });
}