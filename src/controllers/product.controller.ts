import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";

/* -------------------------------------------------------------------------- */
/* Query Schema                                                               */
/* -------------------------------------------------------------------------- */

export const listProductsQuerySchema =
  z.object({
    category: z.string().trim().optional(),

    subcategory: z
      .string()
      .trim()
      .optional(),

    q: z
      .string()
      .trim()
      .optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20),

    featured:
      z.coerce
        .boolean()
        .optional(),
  });

/* -------------------------------------------------------------------------- */
/* List Products                                                              */
/*                                                                            */
/* category = main category                                                   */
/* subcategory = child category                                               */
/*                                                                            */
/* Example:                                                                   */
/* /products?category=fashion                                                 */
/* → Fashion + all subcategory products                                       */
/*                                                                            */
/* /products?category=fashion&subcategory=shirt                               */
/* → Only Shirt products                                                      */
/* -------------------------------------------------------------------------- */

export async function listProducts(
  req: Request,
  res: Response
) {
  /* ------------------------------------------------------------------------ */
  /* Validate Query                                                           */
  /* ------------------------------------------------------------------------ */

  const query =
    listProductsQuerySchema.parse(
      req.query
    );

  const {
    category,
    subcategory,
    q,
    page,
    limit,
    featured,
  } = query;

  /* ------------------------------------------------------------------------ */
  /* Base Where                                                               */
  /* ------------------------------------------------------------------------ */

  const where: any = {
    isActive: true,
  };

  /* ------------------------------------------------------------------------ */
  /* Featured                                                                 */
  /* ------------------------------------------------------------------------ */

  if (featured !== undefined) {
    where.isFeatured = featured;
  }

  /* ------------------------------------------------------------------------ */
  /* Search                                                                   */
  /* ------------------------------------------------------------------------ */

  if (q) {
    where.name = {
      contains: q,
      mode: "insensitive",
    };
  }

  /* ------------------------------------------------------------------------ */
  /* Category Filter                                                          */
  /* ------------------------------------------------------------------------ */

  if (category) {
    /*
     * First find the requested category.
     */
    const mainCategory =
      await prisma.category.findUnique({
        where: {
          slug: category,
        },

        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,

          children: {
            where: {
              isActive: true,
            },

            select: {
              id: true,
              name: true,
              slug: true,
            },

            orderBy: {
              name: "asc",
            },
          },
        },
      });

    if (!mainCategory) {
      throw new AppError(
        "Category not found",
        404
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Subcategory Filter                                                     */
    /* ---------------------------------------------------------------------- */

    if (subcategory) {
      /*
       * Main category-এর child হিসেবে
       * subcategory খুঁজছি।
       */

      const selectedSubcategory =
        mainCategory.children.find(
          (child) =>
            child.slug === subcategory
        );

      if (!selectedSubcategory) {
        throw new AppError(
          "Subcategory not found in this category",
          404
        );
      }

      /*
       * শুধু selected subcategory-এর products।
       */

      where.categoryId =
        selectedSubcategory.id;
    } else {
      /* -------------------------------------------------------------------- */
      /* Main Category                                                        */
      /* -------------------------------------------------------------------- */

      /*
       * Main category নিজে + তার সব subcategory।
       *
       * Example:
       *
       * Fashion
       * ├── Shirt
       * ├── T-Shirt
       * └── Saree
       *
       * Fashion select করলে:
       *
       * Fashion + Shirt + T-Shirt + Saree
       */

      const categoryIds = [
        mainCategory.id,

        ...mainCategory.children.map(
          (child) => child.id
        ),
      ];

      where.categoryId = {
        in: categoryIds,
      };
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Query Products                                                           */
  /* ------------------------------------------------------------------------ */

  const [
    products,
    total,
  ] = await Promise.all([
    prisma.product.findMany({
      where,

      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,

            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      skip:
        (page - 1) * limit,

      take: limit,
    }),

    prisma.product.count({
      where,
    }),
  ]);

  /* ------------------------------------------------------------------------ */
  /* Response                                                                 */
  /* ------------------------------------------------------------------------ */

  res.json({
    products,

    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(
        total / limit
      ),
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Get Product By Slug                                                        */
/* -------------------------------------------------------------------------- */

export async function getProductBySlug(
  req: Request,
  res: Response
) {
  const product =
    await prisma.product.findFirst({
      where: {
        slug: req.params.slug,
        isActive: true,
      },

      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,

            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

  if (!product) {
    throw new AppError(
      "Product not found",
      404
    );
  }

  res.json({
    product,
  });
}