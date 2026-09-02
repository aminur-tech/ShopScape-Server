import type { SearchIntent, SearchSort } from "../types/search.types";

export const MAX_SEARCH_QUERY_LENGTH = 500;
export const MAX_SEARCH_RESULTS = 24;
export const AUTOCOMPLETE_LIMIT = 8;

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function getEffectivePrice(product: {
  price: number;
  discountPrice: number | null;
}): number {
  return product.discountPrice ?? product.price;
}

export function fallbackTextIntent(query: string): SearchIntent {
  const normalizedQuery = normalizeSearchText(query);
  const keywords = Array.from(
    new Set(normalizeSearchText(query).split(" ").filter(Boolean)),
  ).slice(0, 20);
  const toNumber = (value: string) => Number(value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/,/g, ""));
  const amounts = [...normalizedQuery.matchAll(/[০-৯0-9][০-৯0-9,]*/g)]
    .map((match) => toNumber(match[0]))
    .filter(Number.isFinite);
  const range = normalizedQuery.match(/([০-৯0-9,]+)\s*(?:থেকে| থেকে |-)\s*([০-৯0-9,]+)/);
  const hasUpperBound = /(?:মধ্যে|ভিতরে|under|within|কমে|টাকার মধ্যে)/i.test(normalizedQuery);

  return {
    keywords,
    category: null,
    minPrice: range ? toNumber(range[1]) : null,
    maxPrice: range ? toNumber(range[2]) : (hasUpperBound ? amounts[0] ?? null : null),
    sort: "relevance" as SearchSort,
  };
}

export function cleanIntent(value: Partial<SearchIntent>): SearchIntent {
  const validSort: SearchSort[] = [
    "relevance",
    "price_asc",
    "price_desc",
    "newest",
    null,
  ];

  return {
    keywords: Array.from(
      new Set(
        (Array.isArray(value.keywords) ? value.keywords : [])
          .filter((item): item is string => typeof item === "string")
          .map(normalizeSearchText)
          .filter(Boolean),
      ),
    ).slice(0, 20),
    category: typeof value.category === "string" && value.category.trim()
      ? normalizeSearchText(value.category)
      : null,
    minPrice: typeof value.minPrice === "number" && Number.isFinite(value.minPrice) && value.minPrice >= 0
      ? Math.floor(value.minPrice)
      : null,
    maxPrice: typeof value.maxPrice === "number" && Number.isFinite(value.maxPrice) && value.maxPrice >= 0
      ? Math.floor(value.maxPrice)
      : null,
    sort: validSort.includes(value.sort ?? null) ? (value.sort ?? null) : "relevance",
  };
}
