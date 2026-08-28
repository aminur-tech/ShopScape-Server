import type { Request, Response } from "express";

import { prisma } from "../config/prisma";

/* -------------------------------------------------------------------------- */
/* List Categories                                                            */
/* -------------------------------------------------------------------------- */

export async function listCategories(
  _req: Request,
  res: Response
) {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null,
    },

    orderBy: {
      name: "asc",
    },

    include: {
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
            },
          },
        },
      },

      children: {
        where: {
          isActive: true,
        },

        orderBy: {
          name: "asc",
        },

        include: {
          _count: {
            select: {
              products: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  res.json({
    categories,
  });
}