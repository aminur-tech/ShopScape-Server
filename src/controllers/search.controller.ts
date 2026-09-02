import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { parseTextSearch } from "../services/ai-search.service";
import { parseImageSearch } from "../services/image-search.service";
import { getAutocomplete } from "../services/autocomplete.service";
import {
  cleanIntent,
  fallbackTextIntent,
  getEffectivePrice,
  MAX_SEARCH_QUERY_LENGTH,
  MAX_SEARCH_RESULTS,
  normalizeSearchText,
} from "../utils/search.utils";
import type { SearchIntent } from "../types/search.types";

function validateQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return normalizeSearchText(value).slice(0, MAX_SEARCH_QUERY_LENGTH);
}

async function findProducts(intent: SearchIntent, page = 1, limit = MAX_SEARCH_RESULTS) {
  const keywords = Array.from(new Set([
    ...intent.keywords,
    ...(intent.category ? [intent.category] : []),
  ].map(normalizeSearchText).filter(Boolean))).slice(0, 20);
  const where: Prisma.ProductWhereInput = { isActive: true, stock: { gt: 0 } };
  const filters: Prisma.ProductWhereInput[] = [];

  if (intent.minPrice !== null || intent.maxPrice !== null) {
    const price: Prisma.IntFilter = {};
    if (intent.minPrice !== null) price.gte = intent.minPrice;
    if (intent.maxPrice !== null) price.lte = intent.maxPrice;
    filters.push({ OR: [{ price }, { discountPrice: price }] });
  }

  if (keywords.length) {
    filters.push({
      OR: keywords.flatMap((keyword) => [
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { category: { name: { contains: keyword, mode: "insensitive" } } },
      ]),
    });
  }

  if (filters.length) where.AND = filters;

  const products = await prisma.product.findMany({
    where,
    include: { category: { select: { id: true, name: true, slug: true } } },
    orderBy: intent.sort === "newest" ? { createdAt: "desc" } : { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const queryTerms = Array.from(new Set([
    ...keywords,
  ].map((term) => term.toLowerCase()).filter(Boolean)));
  const scored = products.map((product) => {
    const name = product.name.toLowerCase();
    const description = (product.description ?? "").toLowerCase();
    const category = product.category.name.toLowerCase();
    let score = product.isFeatured ? 5 : 0;
    for (const term of queryTerms) {
      if (name === term) score += 100;
      else if (name.startsWith(term)) score += 70;
      else if (name.includes(term)) score += 50;
      else if (category.includes(term)) score += 35;
      else if (description.includes(term)) score += 20;
    }
    return { product, score };
  });

  if (intent.sort === "price_asc") scored.sort((a, b) => getEffectivePrice(a.product) - getEffectivePrice(b.product));
  else if (intent.sort === "price_desc") scored.sort((a, b) => getEffectivePrice(b.product) - getEffectivePrice(a.product));
  else if (intent.sort !== "newest") scored.sort((a, b) => b.score - a.score);

  return scored.map(({ product }) => product);
}

async function findPopularProducts(limit = 12) {
  return prisma.product.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    include: { category: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

function isDatabaseTimeout(error: unknown): boolean {
  return error instanceof Error &&
    (("code" in error && error.code === "ETIMEDOUT") || error.message.includes("ETIMEDOUT"));
}

async function intentFromText(query: string): Promise<SearchIntent> {
  try {
    return await parseTextSearch(query);
  } catch (error) {
    console.error("Text search AI fallback:", error);
    return fallbackTextIntent(query);
  }
}

export async function autocomplete(req: Request, res: Response) {
  const query = validateQuery(req.query.q);
  if (!query) return res.json({ success: true, suggestions: [], categories: [], keywords: [] });
  const result = await getAutocomplete(query);
  return res.json({ success: true, ...result });
}

export async function aiTextSearch(req: Request, res: Response) {
  const query = validateQuery(req.body?.query);
  if (!query) return res.status(400).json({ success: false, message: "Search query is required" });
  const page = Math.max(1, Number(req.body?.page) || 1);
  const intent = await intentFromText(query);
  let products;
  try {
    products = await findProducts(intent, page);
  } catch (error) {
    if (isDatabaseTimeout(error)) {
      return res.status(503).json({ success: false, message: "Search database is temporarily unavailable" });
    }
    throw error;
  }
  return res.json({ success: true, type: "text", query, intent, count: products.length, page, products });
}

export async function aiImageSearch(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ success: false, message: "Product image is required" });
  let intent: SearchIntent;
  try {
    intent = await parseImageSearch(req.file.buffer, req.file.mimetype);
  } catch (error) {
    console.error("Image search AI fallback:", error);
    intent = fallbackTextIntent(validateQuery(req.body?.query));
  }
  const normalizedIntent = cleanIntent(intent);
  let products;
  try {
    products = normalizedIntent.keywords.length || normalizedIntent.category || normalizedIntent.minPrice !== null || normalizedIntent.maxPrice !== null
      ? await findProducts(normalizedIntent)
      : await findPopularProducts();
  } catch (error) {
    if (isDatabaseTimeout(error)) {
      return res.status(503).json({ success: false, message: "Search database is temporarily unavailable" });
    }
    throw error;
  }
  return res.json({ success: true, type: "image", intent: normalizedIntent, count: products.length, products });
}

export async function combinedSearch(req: Request, res: Response) {
  const query = validateQuery(req.body?.query);
  if (!query && !req.file) return res.status(400).json({ success: false, message: "Query or image is required" });

  let imageIntent: SearchIntent = fallbackTextIntent("");
  let textIntent: SearchIntent = fallbackTextIntent(query);
  if (req.file) {
    try { imageIntent = await parseImageSearch(req.file.buffer, req.file.mimetype); }
    catch (error) { console.error("Combined image AI fallback:", error); }
  }
  if (query) textIntent = await intentFromText(query);

  const intent = cleanIntent({
    keywords: Array.from(new Set([...imageIntent.keywords, ...textIntent.keywords])),
    category: textIntent.category ?? imageIntent.category,
    minPrice: textIntent.minPrice ?? imageIntent.minPrice,
    maxPrice: textIntent.maxPrice ?? imageIntent.maxPrice,
    sort: textIntent.sort !== "relevance" && textIntent.sort !== null ? textIntent.sort : imageIntent.sort,
  });
  const hasSearchSignal = intent.keywords.length > 0 || intent.category !== null || intent.minPrice !== null || intent.maxPrice !== null;
  let products;
  try {
    products = hasSearchSignal
      ? await findProducts(intent, Math.max(1, Number(req.body?.page) || 1))
      : await findPopularProducts();
  } catch (error) {
    if (isDatabaseTimeout(error)) {
      return res.status(503).json({ success: false, message: "Search database is temporarily unavailable" });
    }
    throw error;
  }
  const suggestions = query ? await getAutocomplete(query) : { suggestions: [], categories: [], keywords: [] };
  return res.json({ success: true, intent, products, suggestions: suggestions.suggestions });
}
