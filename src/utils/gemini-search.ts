import {
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

const ai = new GoogleGenAI({
  apiKey,
});

export type SearchIntent = {
  keywords: string[];
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort:
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "newest";
};

const searchSchema = {
  type: "object",

  properties: {
    keywords: {
      type: "array",

      items: {
        type: "string",
      },

      description:
        "Important product search keywords in Bangla and English.",
    },

    category: {
      type: ["string", "null"],

      description:
        "Product category if identified, otherwise null.",
    },

    minPrice: {
      type: ["number", "null"],

      description:
        "Minimum price in Bangladeshi Taka.",
    },

    maxPrice: {
      type: ["number", "null"],

      description:
        "Maximum price in Bangladeshi Taka.",
    },

    sort: {
      type: "string",

      enum: [
        "relevance",
        "price_asc",
        "price_desc",
        "newest",
      ],

      description:
        "How the products should be sorted.",
    },
  },

  required: [
    "keywords",
    "category",
    "minPrice",
    "maxPrice",
    "sort",
  ],
};

const SYSTEM_PROMPT = `
You are the AI product search engine for ShopScape,
a Bangladesh-based online fashion store.

Your job is ONLY to understand the customer's
product search intent.

Do NOT invent products.

Do NOT return product IDs.

Do NOT return fake product names.

Do NOT answer the customer directly.

Return ONLY structured search information.

ShopScape commonly sells:

- Saree
- Three Piece
- Shirt
- T-Shirt
- Bag
- Women's clothing
- Men's clothing
- Fashion products

Understand:

- Bangla
- Banglish
- English

Important Bangla/English mappings:

শাড়ি -> saree
সারি -> saree

থ্রি পিস -> three piece
থ্রিপিস -> three piece
থ্রি-পিস -> three piece
3 piece -> three piece
three-piece -> three piece

শার্ট -> shirt

টি শার্ট -> t-shirt
টি-শার্ট -> t-shirt
t shirt -> t-shirt

ব্যাগ -> bag

কালো -> black
সাদা -> white
লাল -> red
নীল -> blue
সবুজ -> green
গোলাপি -> pink
হলুদ -> yellow
বাদামি -> brown

Examples:

Customer:
"কালো থ্রি পিস"

keywords:
[
  "কালো",
  "black",
  "থ্রি পিস",
  "three piece"
]

Customer:
"১৫০০ টাকার মধ্যে থ্রি পিস"

maxPrice:
1500

Customer:
"১৫০০ থেকে ২৫০০ টাকার থ্রি পিস"

minPrice:
1500
maxPrice:
2500

Customer:
"কম দামের থ্রি পিস"

sort:
price_asc

Customer:
"সস্তা থ্রি পিস"

sort:
price_asc

Customer:
"সবচেয়ে দামি শাড়ি"

sort:
price_desc

Customer:
"নতুন শাড়ি"

sort:
newest

Customer:
"latest saree"

sort:
newest

Rules:

1. If price is not mentioned:
   minPrice = null
   maxPrice = null

2. If category is unclear:
   category = null

3. If sorting is not requested:
   sort = relevance

4. Include useful Bangla and English synonyms
   inside keywords.

5. Never invent database products.

6. Never invent product IDs.

7. Return JSON matching the requested schema.
`;

/* =========================================================
   TEXT SEARCH
========================================================= */

export async function parseTextSearch(
  query: string,
): Promise<SearchIntent> {
  const response =
    await ai.models.generateContent({
      model: "gemini-3.5-flash",

      contents: [
        {
          role: "user",

          parts: [
            {
              text: `${SYSTEM_PROMPT}

Customer search:

${query}`,
            },
          ],
        },
      ],

      config: {
        responseMimeType:
          "application/json",

        responseSchema:
          searchSchema,

        thinkingConfig: {
          thinkingLevel:
            ThinkingLevel.LOW,
        },
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini returned empty response",
    );
  }

  try {
    return JSON.parse(
      text,
    ) as SearchIntent;
  } catch {
    console.error(
      "Invalid Gemini JSON:",
      text,
    );

    throw new Error(
      "Gemini returned invalid JSON",
    );
  }
}

/* =========================================================
   IMAGE SEARCH
========================================================= */

export async function parseImageSearch(
  buffer: Buffer,
  mimeType: string,
): Promise<SearchIntent> {
  const base64Image =
    buffer.toString("base64");

  const response =
    await ai.models.generateContent({
      model: "gemini-3.5-flash",

      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },

        {
          text: `
${SYSTEM_PROMPT}

Analyze the uploaded product image.

Identify useful visual product attributes:

- product type
- clothing type
- color
- pattern
- style
- material if visually identifiable
- gender/category
- fashion keywords

Examples:

If the image looks like a black three-piece:

keywords:
[
  "কালো",
  "black",
  "থ্রি পিস",
  "three piece"
]

If the image looks like a saree:

keywords:
[
  "শাড়ি",
  "saree"
]

Do NOT guess:

- exact brand
- exact product name
- exact price
- exact SKU
- product ID

Return keywords that can help find
similar products from the ShopScape database.

Price values must be null because
the image does not provide reliable database pricing.
          `,
        },
      ],

      config: {
        responseMimeType:
          "application/json",

        responseSchema:
          searchSchema,

        thinkingConfig: {
          thinkingLevel:
            ThinkingLevel.LOW,
        },
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini returned empty response",
    );
  }

  try {
    return JSON.parse(
      text,
    ) as SearchIntent;
  } catch {
    console.error(
      "Invalid Gemini image JSON:",
      text,
    );

    throw new Error(
      "Gemini returned invalid JSON",
    );
  }
}