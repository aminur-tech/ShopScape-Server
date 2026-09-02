import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../config/env";
import { cleanIntent } from "../utils/search.utils";
import type { SearchIntent } from "../types/search.types";

type GeminiContent = Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"];

const responseSchema = {
  type: "object",
  properties: {
    keywords: { type: "array", items: { type: "string" } },
    category: { type: ["string", "null"] },
    minPrice: { type: ["number", "null"] },
    maxPrice: { type: ["number", "null"] },
    sort: { type: ["string", "null"], enum: ["relevance", "price_asc", "price_desc", "newest", null] },
  },
  required: ["keywords", "category", "minPrice", "maxPrice", "sort"],
} as const;

const instruction = `You are ShopScape's product search intent parser. Understand Bangla, Banglish and English fashion queries. Return only JSON matching the schema. Include useful original and English synonyms in keywords. Map colors and product types when possible. Never invent products or IDs. Prices are Bangladeshi Taka. Use null when unknown.`;

function timeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini request timed out")), milliseconds);
    }),
  ]);
}

export async function generateSearchIntent(contents: GeminiContent): Promise<SearchIntent> {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured");

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await timeout(ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  }), env.GEMINI_TIMEOUT_MS);

  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response");

  return cleanIntent(JSON.parse(text) as Partial<SearchIntent>);
}

export async function parseTextSearch(query: string): Promise<SearchIntent> {
  return generateSearchIntent([{ role: "user", parts: [{ text: query }] }]);
}
