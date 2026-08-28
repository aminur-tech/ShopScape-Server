import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";

/*
|--------------------------------------------------------------------------
| Slugify
|--------------------------------------------------------------------------
*/

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/*
|--------------------------------------------------------------------------
| Discount Price
|--------------------------------------------------------------------------
*/

function computeDiscountPrice(
  price: number,
  discountPercent?: number | null
): number | null {
  if (discountPercent == null) return null;

  return Math.round(
    price - (price * discountPercent) / 100
  );
}

/*
|--------------------------------------------------------------------------
| Get Single Product
|--------------------------------------------------------------------------
*/

export async function adminGetProduct(
  req: Request,
  res: Response
) {
  const product = await prisma.product.findUnique({
    where: {
      id: req.params.id,
    },

    include: {
      category: {
        include: {
          parent: true,
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

/*
|--------------------------------------------------------------------------
| List Products
|--------------------------------------------------------------------------
*/

export async function adminListProducts(
  req: Request,
  res: Response
) {
  const page = Math.max(
    Number(req.query.page ?? 1),
    1
  );

  const limit = Math.min(
    Math.max(
      Number(req.query.limit ?? 20),
      1
    ),
    100
  );

  const q =
    typeof req.query.q === "string"
      ? req.query.q.trim()
      : undefined;

  const where = q
    ? {
        name: {
          contains: q,
          mode: "insensitive" as const,
        },
      }
    : {};

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

      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.product.count({
      where,
    }),
  ]);

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

/*
|--------------------------------------------------------------------------
| Product Input Schema
|--------------------------------------------------------------------------
*/

export const productInputSchema =
  z.object({
    name: z
      .string()
      .min(2),

    slug: z
      .string()
      .min(2)
      .optional(),

    description:
      z.string().optional(),

    price: z
      .number()
      .int()
      .min(0),

    discountPercent: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional(),

    sizeChart:
      z.string().optional(),

    sizes: z
      .array(z.string())
      .default([]),

    /*
     * 0 = out of stock
     * 1 = in stock
     */
    stock: z
      .number()
      .int()
      .min(0)
      .max(1)
      .default(1),

    images: z
      .array(z.string())
      .default([]),

    categoryId:
      z.string(),

    isFeatured:
      z.boolean().default(false),

    isActive:
      z.boolean().default(true),
  });

/*
|--------------------------------------------------------------------------
| Create Product
|--------------------------------------------------------------------------
*/

export async function adminCreateProduct(
  req: Request,
  res: Response
) {
  const data =
    productInputSchema.parse(
      req.body
    );

  /*
   * Verify category
   */

  const category =
    await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

  if (!category) {
    throw new AppError(
      "Category not found",
      404
    );
  }

  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.name);

  /*
   * Duplicate slug
   */

  const existing =
    await prisma.product.findUnique({
      where: {
        slug,
      },
    });

  if (existing) {
    throw new AppError(
      "এই slug ইতিমধ্যে ব্যবহার করা হয়েছে",
      409
    );
  }

  const discountPrice =
    computeDiscountPrice(
      data.price,
      data.discountPercent
    );

  const product =
    await prisma.product.create({
      data: {
        ...data,
        slug,
        discountPrice,
      },

      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
    });

  res.status(201).json({
    product,
  });
}

/*
|--------------------------------------------------------------------------
| Update Product
|--------------------------------------------------------------------------
*/

export async function adminUpdateProduct(
  req: Request,
  res: Response
) {
  const data =
    productInputSchema
      .partial()
      .parse(req.body);

  const productId =
    req.params.id;

  const existing =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

  if (!existing) {
    throw new AppError(
      "Product not found",
      404
    );
  }

  /*
   * Verify category if changed
   */

  if (data.categoryId) {
    const category =
      await prisma.category.findUnique({
        where: {
          id: data.categoryId,
        },
      });

    if (!category) {
      throw new AppError(
        "Category not found",
        404
      );
    }
  }

  /*
   * Slug
   */

  let slug: string | undefined;

  if (data.slug) {
    slug = slugify(data.slug);

    const duplicate =
      await prisma.product.findFirst({
        where: {
          slug,
          NOT: {
            id: productId,
          },
        },
      });

    if (duplicate) {
      throw new AppError(
        "এই slug ইতিমধ্যে ব্যবহার করা হয়েছে",
        409
      );
    }
  }

  /*
   * Discount
   */

  let discountPriceUpdate: {
    discountPrice: number | null;
  } | undefined;

  if (
    data.price !== undefined ||
    data.discountPercent !== undefined
  ) {
    const price =
      data.price ??
      existing.price;

    const discountPercent =
      data.discountPercent !== undefined
        ? data.discountPercent
        : existing.discountPercent;

    discountPriceUpdate = {
      discountPrice:
        computeDiscountPrice(
          price,
          discountPercent
        ),
    };
  }

  const product =
    await prisma.product.update({
      where: {
        id: productId,
      },

      data: {
        ...data,

        ...(slug !== undefined && {
          slug,
        }),

        ...(discountPriceUpdate ?? {}),
      },

      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
    });

  res.json({
    product,
  });
}

/*
|--------------------------------------------------------------------------
| Soft Delete / Deactivate
|--------------------------------------------------------------------------
*/

export async function adminDeleteProduct(
  req: Request,
  res: Response
) {
  const product =
    await prisma.product
      .update({
        where: {
          id: req.params.id,
        },

        data: {
          isActive: false,
        },
      })
      .catch(() => null);

  if (!product) {
    throw new AppError(
      "Product not found",
      404
    );
  }

  res.json({
    message:
      "Product deactivated",
    product,
  });
}