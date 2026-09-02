import { generateSearchIntent } from "./ai-search.service";
import type { SearchIntent } from "../types/search.types";

enum ImageMimeType {
  JPEG = "image/jpeg",
  PNG = "image/png",
  WEBP = "image/webp",
  GIF = "image/gif",
  AVIF = "image/avif",
}

export async function parseImageSearch(buffer: Buffer, mimeType: string): Promise<SearchIntent> {
  const prompt = `Analyze this product image for visual search. Identify product type, color, pattern, material, style, design, gender and possible category. Add Bangla and English visual keywords. Do not guess brand, exact product, SKU or price. Always return null for minPrice and maxPrice, and relevance for sort.`;

  return generateSearchIntent([
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: mimeType as ImageMimeType, data: buffer.toString("base64") } },
        { text: prompt },
      ],
    },
  ]);
}
