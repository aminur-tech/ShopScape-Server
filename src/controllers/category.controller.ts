import type { Request, Response } from "express";

import { prisma } from "../config/prisma";

/* -------------------------------------------------------------------------- */
/* List Categories                                                            */
/* -------------------------------------------------------------------------- */

export async function listCategories(
  _req: Request,
  res: Response
) {
  const categories =
    await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
      },

      orderBy: {
        name: "asc",
      },

      include: {
        /* ------------------------------------------------------------------ */
        /* Main Category Own Products                                         */
        /* ------------------------------------------------------------------ */

        _count: {
          select: {
            products: {
              where: {
                isActive: true,
              },
            },
          },
        },

        /* ------------------------------------------------------------------ */
        /* Sub Categories                                                     */
        /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Calculate Total Count                                                    */
  /* ------------------------------------------------------------------------ */

  const formattedCategories =
    categories.map((category: (typeof categories)[number]) => {
      /* -------------------------------------------------------------- */
      /* Main category own products                                    */
      /* -------------------------------------------------------------- */

      const ownProductCount =
        category._count.products;

      /* -------------------------------------------------------------- */
      /* All subcategory products                                      */
      /* -------------------------------------------------------------- */

      const subCategoryProductCount =
        category.children.reduce(
          (
            total: number,
            child: (typeof category.children)[number]
          ) =>
            total +
            child._count.products,
          0
        );

      /* -------------------------------------------------------------- */
      /* Main total = own + children                                   */
      /* -------------------------------------------------------------- */

      const totalProductCount =
        ownProductCount +
        subCategoryProductCount;

      return {
        ...category,

        _count: {
          products: totalProductCount,
        },
      };
    });

  /* ------------------------------------------------------------------------ */
  /* Response                                                                 */
  /* ------------------------------------------------------------------------ */

  return res.json({
    categories:
      formattedCategories,
  });
}