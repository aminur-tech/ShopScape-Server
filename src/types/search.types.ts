export type SearchSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | null;

export type SearchIntent = {
  keywords: string[];
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: SearchSort;
};

export type AutocompleteProduct = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  discountPrice: number | null;
  discountPercent: number | null;
  category: string | null;
  type: "product";
};

export type AutocompleteCategory = {
  id: string;
  name: string;
  slug: string;
  type: "category";
};
