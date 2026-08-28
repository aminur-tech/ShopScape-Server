import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";

/* -------------------------------------------------------------------------- */
/* Bangla → English Word Mapping                                              */
/* -------------------------------------------------------------------------- */

const BANGLA_WORD_MAP: Record<string, string> = {
  /* General */
  "পোশাক": "clothing",
  "কাপড়": "clothing",
  "কাপড়": "clothing",
  "জামা": "clothes",
  "জামাকাপড়": "clothing",
  "জামাকাপড়": "clothing",

  /* Men */
  "পুরুষ": "men",
  "পুরুষের": "mens",
  "ছেলেদের": "mens",
  "ছেলে": "boys",

  /* Women */
  "নারী": "women",
  "নারীদের": "womens",
  "মহিলা": "women",
  "মহিলাদের": "womens",
  "মেয়েদের": "girls",
  "মেয়েদের": "girls",
  "মেয়ে": "girl",
  "মেয়ে": "girl",

  /* Kids */
  "শিশু": "kids",
  "শিশুদের": "kids",
  "বাচ্চা": "kids",
  "বাচ্চাদের": "kids",
  "ছোটদের": "kids",

  /* Clothing */
  "শার্ট": "shirt",
  "শার্টস": "shirts",
  "টি-শার্ট": "t-shirt",
  "টি শার্ট": "t-shirt",
  "টিশার্ট": "t-shirt",
  "প্যান্ট": "pants",
  "জিন্স": "jeans",
  "জ্যাকেট": "jacket",
  "কোট": "coat",
  "হুডি": "hoodie",
  "সোয়েটার": "sweater",
  "সোয়েটার": "sweater",
  "পোলো": "polo",
  "ফতুয়া": "fatua",
  "ফতুয়া": "fatua",
  "পাঞ্জাবি": "panjabi",
  "পাঞ্জাবী": "panjabi",
  "লুঙ্গি": "lungi",
  "শাড়ি": "saree",
  "শাড়ি": "saree",
  "থ্রি-পিস": "three-piece",
  "থ্রি পিস": "three-piece",
  "থ্রিপিস": "three-piece",
  "বোরকা": "burqa",
  "হিজাব": "hijab",
  "ওড়না": "orna",
  "ওড়না": "orna",
  "স্কার্ফ": "scarf",
  "গেঞ্জি": "vest",
  "অন্তর্বাস": "underwear",

  /* Footwear */
  "জুতা": "shoes",
  "জুতো": "shoes",
  "স্যান্ডেল": "sandals",
  "স্লিপার": "slippers",
  "বুট": "boots",

  /* Bags */
  "ব্যাগ": "bag",
  "হ্যান্ডব্যাগ": "handbag",
  "স্কুলব্যাগ": "school-bag",
  "ব্যাকপ্যাক": "backpack",
  "মানিব্যাগ": "wallet",

  /* Accessories */
  "ঘড়ি": "watch",
  "ঘড়ি": "watch",
  "চশমা": "glasses",
  "সানগ্লাস": "sunglasses",
  "বেল্ট": "belt",
  "টুপি": "cap",
  "মাফলার": "muffler",
  "গহনা": "jewelry",
  "গয়না": "jewelry",
  "গয়না": "jewelry",
  "হার": "necklace",
  "কানের দুল": "earrings",
  "আংটি": "ring",

  /* Beauty */
  "প্রসাধনী": "cosmetics",
  "মেকআপ": "makeup",
  "সৌন্দর্য": "beauty",
  "সাবান": "soap",
  "শ্যাম্পু": "shampoo",
  "পারফিউম": "perfume",
  "সুগন্ধি": "perfume",

  /* Electronics */
  "ইলেকট্রনিক্স": "electronics",
  "মোবাইল": "mobile",
  "ফোন": "phone",
  "ল্যাপটপ": "laptop",
  "কম্পিউটার": "computer",
  "ট্যাব": "tablet",
  "ক্যামেরা": "camera",
  "হেডফোন": "headphones",
  "ইয়ারফোন": "earphones",
  "ইয়ারফোন": "earphones",
  "চার্জার": "charger",

  /* Home */
  "বাড়ি": "home",
  "বাড়ি": "home",
  "ঘর": "home",
  "রান্নাঘর": "kitchen",
  "রান্না": "cooking",
  "আসবাবপত্র": "furniture",
  "ফার্নিচার": "furniture",
  "বিছানা": "bed",
  "বালিশ": "pillow",
  "পর্দা": "curtain",

  /* Food */
  "খাবার": "food",
  "খাদ্য": "food",
  "মিষ্টি": "sweets",
  "চকলেট": "chocolate",
  "কফি": "coffee",
  "চা": "tea",

  /* Generic */
  "নতুন": "new",
  "জনপ্রিয়": "popular",
  "জনপ্রিয়": "popular",
  "অফার": "offer",
  "ডিসকাউন্ট": "discount",
  "বেস্ট": "best",
  "বিক্রয়": "sale",
  "বিক্রয়": "sale",
};

/* -------------------------------------------------------------------------- */
/* Bangla Character Transliteration                                           */
/* -------------------------------------------------------------------------- */

const BANGLA_CHAR_MAP: Record<string, string> = {
  অ: "a",
  আ: "a",
  ই: "i",
  ঈ: "i",
  উ: "u",
  ঊ: "u",
  ঋ: "ri",
  এ: "e",
  ঐ: "oi",
  ও: "o",
  ঔ: "ou",

  ক: "k",
  খ: "kh",
  গ: "g",
  ঘ: "gh",
  ঙ: "ng",

  চ: "ch",
  ছ: "chh",
  জ: "j",
  ঝ: "jh",
  ঞ: "n",

  ট: "t",
  ঠ: "th",
  ড: "d",
  ঢ: "dh",
  ণ: "n",

  ত: "t",
  থ: "th",
  দ: "d",
  ধ: "dh",
  ন: "n",

  প: "p",
  ফ: "ph",
  ব: "b",
  ভ: "bh",
  ম: "m",

  য: "y",
  র: "r",
  ল: "l",
  শ: "sh",
  ষ: "sh",
  স: "s",
  হ: "h",

  ড়: "r",
  ঢ়: "rh",
  য়: "y",

  /* Vowel signs */
  "া": "a",
  "ি": "i",
  "ী": "i",
  "ু": "u",
  "ূ": "u",
  "ৃ": "ri",
  "ে": "e",
  "ৈ": "oi",
  "ো": "o",
  "ৌ": "ou",

  /* Special */
  "ং": "ng",
  "ঃ": "h",
  "ঁ": "n",
  "্": "",
};

/* -------------------------------------------------------------------------- */
/* Escape RegExp                                                              */
/* -------------------------------------------------------------------------- */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* -------------------------------------------------------------------------- */
/* Bangla Transliteration                                                     */
/* -------------------------------------------------------------------------- */

function transliterateBangla(text: string): string {
  let result = text;

  const combinations = Object.entries(BANGLA_CHAR_MAP).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [bangla, english] of combinations) {
    result = result.split(bangla).join(english);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Slugify                                                                    */
/* -------------------------------------------------------------------------- */

function slugify(text: string): string {
  let value = text.toLowerCase().trim();

  /*
   * Replace known Bangla words first.
   *
   * Example:
   * শার্ট → shirt
   * জুতা → shoes
   * ব্যাগ → bag
   */
  const mappedWords = Object.entries(BANGLA_WORD_MAP).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [bangla, english] of mappedWords) {
    value = value.replace(
      new RegExp(
        `(^|[\\s-])${escapeRegExp(bangla)}(?=$|[\\s-])`,
        "g",
      ),
      `$1${english}`,
    );
  }

  /*
   * Transliterate any remaining Bangla characters.
   */
  value = transliterateBangla(value);

  /*
   * Keep only:
   * English letters
   * Numbers
   * Spaces
   * Hyphens
   */
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* -------------------------------------------------------------------------- */
/* Generate Unique Slug                                                       */
/* -------------------------------------------------------------------------- */

async function generateUniqueSlug(
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  if (!baseSlug) {
    throw new AppError(
      "Valid English category name অথবা slug দিন",
      400,
    );
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    /*
     * No duplicate OR current category itself.
     */
    if (!existing || existing.id === excludeId) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Category Input Schema                                                       */
/* -------------------------------------------------------------------------- */

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name is required"),

  slug: z
    .string()
    .trim()
    .min(2)
    .optional(),

  image: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),

  isActive: z
    .boolean()
    .default(true),

  parentId: z
    .string()
    .optional()
    .nullable(),
});

/* -------------------------------------------------------------------------- */
/* List Categories                                                             */
/* -------------------------------------------------------------------------- */

export async function adminListCategories(
  _req: Request,
  res: Response,
) {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
    },

    include: {
      children: {
        orderBy: {
          name: "asc",
        },

        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      },

      _count: {
        select: {
          products: true,
        },
      },
    },

    orderBy: {
      name: "asc",
    },
  });

  res.json({
    categories,
  });
}

/* -------------------------------------------------------------------------- */
/* Create Category / Subcategory                                               */
/* -------------------------------------------------------------------------- */

export async function adminCreateCategory(
  req: Request,
  res: Response,
) {
  const data = categoryInputSchema.parse(req.body);

  /* ------------------------------------------------------------------------ */
  /* Verify Parent                                                            */
  /* ------------------------------------------------------------------------ */

  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: {
        id: data.parentId,
      },

      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    if (!parent) {
      throw new AppError(
        "Parent category not found",
        404,
      );
    }

    /*
     * Only root categories can be parents.
     *
     * Allowed:
     *
     * Men
     * ├── Shirt
     * ├── Pants
     * └── Shoes
     *
     * Not allowed:
     *
     * Men
     * └── Clothing
     *     └── Shirt
     */
    if (parent.parentId) {
      throw new AppError(
        "শুধুমাত্র Parent Category নির্বাচন করা যাবে। Subcategory-এর অধীনে আরেকটি subcategory তৈরি করা যাবে না।",
        400,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Generate English Slug                                                    */
  /* ------------------------------------------------------------------------ */

  const baseSlug = data.slug
    ? slugify(data.slug)
    : slugify(data.name);

  if (!baseSlug) {
    throw new AppError(
      "Valid English category slug তৈরি করা যায়নি। অন্য একটি category name দিন।",
      400,
    );
  }

  /*
   * Automatically handles duplicate:
   *
   * shirt
   * shirt-2
   * shirt-3
   */
  const slug = await generateUniqueSlug(baseSlug);

  /* ------------------------------------------------------------------------ */
  /* Create                                                                    */
  /* ------------------------------------------------------------------------ */

  const category = await prisma.category.create({
    data: {
      name: data.name.trim(),
      slug,
      image: data.image || null,
      isActive: data.isActive,
      parentId: data.parentId || null,
    },

    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  res.status(201).json({
    category,
  });
}

/* -------------------------------------------------------------------------- */
/* Update Category                                                             */
/* -------------------------------------------------------------------------- */

export async function adminUpdateCategory(
  req: Request,
  res: Response,
) {
  const data = categoryInputSchema
    .partial()
    .parse(req.body);

  const categoryId = req.params.id;

  /* ------------------------------------------------------------------------ */
  /* Find Category                                                             */
  /* ------------------------------------------------------------------------ */

  const existingCategory =
    await prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      include: {
        children: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!existingCategory) {
    throw new AppError(
      "Category not found",
      404,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Prevent Self Parent                                                       */
  /* ------------------------------------------------------------------------ */

  if (
    data.parentId !== undefined &&
    data.parentId === categoryId
  ) {
    throw new AppError(
      "একটি ক্যাটাগরি নিজেই নিজের parent হতে পারে না",
      400,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Verify Parent                                                             */
  /* ------------------------------------------------------------------------ */

  if (data.parentId) {
    const parent =
      await prisma.category.findUnique({
        where: {
          id: data.parentId,
        },

        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });

    if (!parent) {
      throw new AppError(
        "Parent category not found",
        404,
      );
    }

    /*
     * Parent must be a root category.
     */
    if (parent.parentId) {
      throw new AppError(
        "শুধুমাত্র Parent Category নির্বাচন করা যাবে। Subcategory-এর অধীনে আরেকটি subcategory তৈরি করা যাবে না।",
        400,
      );
    }

    /*
     * A category that already has children
     * cannot itself become a subcategory.
     *
     * Otherwise it would create a 3-level hierarchy.
     */
    if (existingCategory.children.length > 0) {
      throw new AppError(
        "এই category-এর অধীনে subcategory আছে। তাই category-টিকে subcategory করা যাবে না।",
        400,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Generate Slug                                                             */
  /* ------------------------------------------------------------------------ */

  let slug: string | undefined;

  /*
   * Explicit slug provided.
   */
  if (data.slug !== undefined) {
    const baseSlug = slugify(data.slug);

    if (!baseSlug) {
      throw new AppError(
        "Valid English slug দিন",
        400,
      );
    }

    slug = await generateUniqueSlug(
      baseSlug,
      categoryId,
    );
  }

  /*
   * Name changed but slug was not provided.
   *
   * Automatically regenerate English slug.
   */
  if (
    data.name !== undefined &&
    data.slug === undefined
  ) {
    const baseSlug = slugify(data.name);

    if (!baseSlug) {
      throw new AppError(
        "Valid English category name দিন",
        400,
      );
    }

    slug = await generateUniqueSlug(
      baseSlug,
      categoryId,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Update                                                                    */
  /* ------------------------------------------------------------------------ */

  const category =
    await prisma.category.update({
      where: {
        id: categoryId,
      },

      data: {
        ...(data.name !== undefined && {
          name: data.name.trim(),
        }),

        ...(slug !== undefined && {
          slug,
        }),

        ...(data.image !== undefined && {
          image: data.image || null,
        }),

        ...(data.isActive !== undefined && {
          isActive: data.isActive,
        }),

        ...(data.parentId !== undefined && {
          parentId: data.parentId || null,
        }),
      },

      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        _count: {
          select: {
            products: true,
          },
        },
      },
    });

  res.json({
    category,
  });
}

/* -------------------------------------------------------------------------- */
/* Delete Category                                                             */
/* -------------------------------------------------------------------------- */

export async function adminDeleteCategory(
  req: Request,
  res: Response,
) {
  const categoryId = req.params.id;

  const category =
    await prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      include: {
        children: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!category) {
    throw new AppError(
      "Category not found",
      404,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Product Check                                                             */
  /* ------------------------------------------------------------------------ */

  const productsInCategory =
    await prisma.product.count({
      where: {
        categoryId,
      },
    });

  if (productsInCategory > 0) {
    throw new AppError(
      "এই ক্যাটাগরিতে প্রোডাক্ট থাকায় মুছে ফেলা যাবে না",
      400,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Child Check                                                               */
  /* ------------------------------------------------------------------------ */

  if (category.children.length > 0) {
    throw new AppError(
      "এই ক্যাটাগরির অধীনে সাবক্যাটাগরি আছে। আগে সাবক্যাটাগরি মুছে ফেলুন।",
      400,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Delete                                                                    */
  /* ------------------------------------------------------------------------ */

  await prisma.category.delete({
    where: {
      id: categoryId,
    },
  });

  res.json({
    message: "Category deleted",
  });
}