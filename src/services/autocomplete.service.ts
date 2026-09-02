import { prisma } from "../config/prisma";
import { AUTOCOMPLETE_LIMIT, normalizeSearchText } from "../utils/search.utils";
import type { AutocompleteCategory, AutocompleteProduct } from "../types/search.types";

export type AutocompleteResult = {
  suggestions: AutocompleteProduct[];
  categories: AutocompleteCategory[];
  keywords: string[];
};

export async function getAutocomplete(query: string): Promise<AutocompleteResult> {
  const normalized = normalizeSearchText(query);
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      OR: [
        { name: { contains: normalized, mode: "insensitive" } },
        { description: { contains: normalized, mode: "insensitive" } },
        { category: { name: { contains: normalized, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      discountPrice: true,
      discountPercent: true,
      description: true,
      category: { select: { name: true } },
      isFeatured: true,
      createdAt: true,
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 40,
  });

  const rankedProducts = products.map((product) => {
    const term = normalized.toLocaleLowerCase();
    const name = product.name.toLocaleLowerCase();
    const category = product.category.name.toLocaleLowerCase();
    const descriptionMatch = (product.description ?? "").toLocaleLowerCase().includes(term);
    const rank = name === term ? 400 : name.startsWith(term) ? 300 : name.includes(term) ? 200 : category.includes(term) ? 150 : descriptionMatch ? 100 : 50;
    return { product, rank };
  }).sort((left, right) => right.rank - left.rank || Number(right.product.isFeatured) - Number(left.product.isFeatured));

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: normalized, mode: "insensitive" } },
        { slug: { contains: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
    take: 5,
  });

  return {
    suggestions: rankedProducts.slice(0, AUTOCOMPLETE_LIMIT).map(({ product }) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? null,
      price: product.price,
      discountPrice: product.discountPrice,
      discountPercent: product.discountPercent,
      category: product.category.name,
      type: "product" as const,
    })),
    categories: categories.map((category) => ({ ...category, type: "category" as const })),
    keywords: Array.from(new Set(normalized.split(" ").filter(Boolean))).slice(0, 10),
  };
}
