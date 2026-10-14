// src/assistant/ai/gemini.provider.ts

import { GoogleGenAI } from "@google/genai";

import {
  ASSISTANT_INTENT_SYSTEM_PROMPT,
  ASSISTANT_RESPONSE_SYSTEM_PROMPT,
} from "./ai.prompt.js";

import type {
  AiIntent,
  AiResponse,
} from "./ai.types.js";


import {
  validateAiIntent,
} from "./ai.validator.js";

import {
  extractIntentFallback,
} from "./ai.fallback.js";
import { AiProvider } from "./ai.service.js";

const AI_INTENT_SCHEMA = {
  type: "object",

  properties: {
    intent: {
      type: "string",
      enum: [
        "LOCAL_SEARCH",
        "REFINE_SEARCH",
        "GENERAL_QUESTION",
        "UNKNOWN",
      ],
    },

    category: {
      type: ["string", "null"],
    },

    location: {
      type: ["object", "null"],

      properties: {
        text: {
          type: ["string", "null"],
        },

        latitude: {
          type: ["number", "null"],
        },

        longitude: {
          type: ["number", "null"],
        },
      },

      required: [
        "text",
        "latitude",
        "longitude",
      ],
    },

    budget: {
      type: ["object", "null"],

      properties: {
        min: {
          type: ["number", "null"],
        },

        max: {
          type: ["number", "null"],
        },

        currency: {
          type: ["string", "null"],
        },
      },

      required: [
        "min",
        "max",
        "currency",
      ],
    },

    audience: {
      type: ["string", "null"],
    },

    people: {
      type: ["number", "null"],
    },

    preferences: {
      type: ["array", "null"],

      items: {
        type: "string",
      },
    },

    limit: {
      type: ["number", "null"],
    },

    sort: {
      type: ["string", "null"],
    },

    language: {
      type: "string",
      enum: [
        "en",
        "hi",
        "hinglish",
      ],
    },

    originalQuery: {
      type: "string",
    },
  },

  required: [
    "intent",
    "category",
    "location",
    "budget",
    "audience",
    "people",
    "preferences",
    "limit",
    "sort",
    "language",
    "originalQuery",
  ],
};

export class GeminiProvider
  implements AiProvider
{
  private readonly client: GoogleGenAI;

  private readonly model: string;

  constructor() {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured",
      );
    }

    this.client =
      new GoogleGenAI({
        apiKey,
      });

    this.model =
      process.env.GEMINI_MODEL?.trim() ||
      "gemini-3.8-flash";
  }

  // ======================================================
  // 1. Extract user intent
  // ======================================================

  async extractIntent(
    query: string,
  ): Promise<AiIntent> {
    const response =
      await this.generateWithRetry(
        () =>
          this.client.models.generateContent(
            {
              model: this.model,

              contents: query,

              config: {
                systemInstruction:
                  ASSISTANT_INTENT_SYSTEM_PROMPT,

                responseMimeType:
                  "application/json",

                responseSchema:
                  AI_INTENT_SCHEMA,

                temperature: 0,

                maxOutputTokens: 700,
              },
            },
          ),
      );

    const output =
      response.text?.trim();

    if (!output) {
      console.error(
        "[GeminiProvider] Gemini returned an empty response.",
      );

      return extractIntentFallback(
        query,
      );
    }

    console.log(
      "[GeminiProvider] Raw intent response:",
      output,
    );

    const parsed =
      parseJsonResponse(output);

    if (!parsed) {
      console.error(
        "[GeminiProvider] Unable to parse Gemini response as JSON.",
      );

      console.error(
        "[GeminiProvider] Raw response:",
        output,
      );

      return extractIntentFallback(
        query,
      );
    }

    normalizeIntent(
      parsed,
      query,
    );

    if (
      !validateAiIntent(parsed)
    ) {
      console.error(
        "[GeminiProvider] AI returned invalid intent.",
      );

      console.error(
        "[GeminiProvider] Parsed intent:",
        JSON.stringify(
          parsed,
          null,
          2,
        ),
      );

      console.error(
        "[GeminiProvider] Original query:",
        query,
      );

      return extractIntentFallback(
        query,
      );
    }

    console.log(
      "[GeminiProvider] Parsed intent:",
      JSON.stringify(
        parsed,
        null,
        2,
      ),
    );

    return parsed as AiIntent;
  }

  // ======================================================
  // 2. Generate natural-language response
  // ======================================================

  async generateResponse(
    intent: AiIntent,
    results: unknown[],
  ): Promise<AiResponse> {
    const compactResults =
      results.map(
        (result) =>
          this.compactRestaurantResult(
            result,
          ),
      );

    const prompt = `
USER INTENT:
${JSON.stringify(intent)}

VERIFIED RESTAURANT RESULTS:
${JSON.stringify(compactResults)}

Generate a concise response for the user.

Mention the best matching restaurants using ONLY
the verified information above.

Do not invent or assume any information.

Respond in the same language as the user's intent.
`.trim();

    const response =
      await this.generateWithRetry(
        () =>
          this.client.models.generateContent(
            {
              model: this.model,

              contents: prompt,

              config: {
                systemInstruction:
                  ASSISTANT_RESPONSE_SYSTEM_PROMPT,

                temperature: 0.2,

                maxOutputTokens: 300,
              },
            },
          ),
      );

    const message =
      response.text?.trim();

    if (!message) {
      throw new Error(
        "Gemini returned an empty response",
      );
    }

    return {
      message,

      language:
        intent.language,

      shouldAskClarification:
        false,
    };
  }

  // ======================================================
  // 3. Compact restaurant result
  // ======================================================

  private compactRestaurantResult(
    result: unknown,
  ): Record<string, unknown> {
    if (
      !result ||
      typeof result !== "object"
    ) {
      return {};
    }

    const restaurant =
      result as Record<
        string,
        unknown
      >;

    return {
      name:
        restaurant.name,

      rating:
        restaurant.rating,

      reviews:
        restaurant.reviews ??
        restaurant.userRatingCount,

      priceLevel:
        restaurant.priceLevel,

      address:
        restaurant.address,

      distanceKm:
        restaurant.distanceKm,

      affordability:
        restaurant.affordability,
    };
  }

  // ======================================================
  // 4. Retry transient Gemini errors
  // ======================================================

  private async generateWithRetry(
    request: () => Promise<any>,
  ): Promise<any> {
    const delays = [
      1000,
      2000,
      4000,
    ];

    for (
      let attempt = 0;
      attempt <= delays.length;
      attempt++
    ) {
      try {
        return await request();
      } catch (error) {
        const status =
          this.getErrorStatus(error);

        const isRetryable =
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504;

        const hasRetry =
          attempt < delays.length;

        if (
          !isRetryable ||
          !hasRetry
        ) {
          throw error;
        }

        console.warn(
          `[GeminiProvider] Request failed with status ${status}. ` +
            `Retrying in ${delays[attempt]} ms...`,
        );

        await this.sleep(
          delays[attempt],
        );
      }
    }

    throw new Error(
      "Gemini request failed after retries",
    );
  }

  // ======================================================
  // 5. Extract HTTP status from Gemini error
  // ======================================================

  private getErrorStatus(
    error: unknown,
  ): number | undefined {
    if (
      !error ||
      typeof error !== "object"
    ) {
      return undefined;
    }

    const errorObject =
      error as Record<
        string,
        unknown
      >;

    if (
      typeof errorObject.status ===
      "number"
    ) {
      return errorObject.status;
    }

    if (
      typeof errorObject.code ===
      "number"
    ) {
      return errorObject.code;
    }

    return undefined;
  }

  // ======================================================
  // 6. Sleep helper
  // ======================================================

  private sleep(
    milliseconds: number,
  ): Promise<void> {
    return new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          milliseconds,
        ),
    );
  }
}

// ========================================================
// JSON parser
// ========================================================

function parseJsonResponse(
  rawResponse: string,
): Record<
  string,
  unknown
> | undefined {
  if (!rawResponse?.trim()) {
    return undefined;
  }

  let cleaned =
    rawResponse.trim();

  // Remove markdown code fences if Gemini
  // unexpectedly returns them.
  cleaned =
    cleaned.replace(
      /^```json\s*/i,
      "",
    );

  cleaned =
    cleaned.replace(
      /^```\s*/i,
      "",
    );

  cleaned =
    cleaned.replace(
      /\s*```$/i,
      "",
    );

  cleaned =
    cleaned.trim();

  try {
    const parsed =
      JSON.parse(
        cleaned,
      );

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(
        parsed,
      )
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    // Continue with object extraction.
  }

  const firstBrace =
    cleaned.indexOf("{");

  const lastBrace =
    cleaned.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    return undefined;
  }

  const jsonCandidate =
    cleaned.slice(
      firstBrace,
      lastBrace + 1,
    );

  try {
    const parsed =
      JSON.parse(
        jsonCandidate,
      );

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(
        parsed,
      )
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

// ========================================================
// Intent normalization
// ========================================================

function normalizeIntent(
  intent: Record<
    string,
    unknown
  >,
  originalQuery: string,
): void {
  // Always trust the actual user query.
  intent.originalQuery =
    originalQuery;

  // ------------------------------------------------------
  // Intent
  // ------------------------------------------------------

  if (
    typeof intent.intent ===
    "string"
  ) {
    intent.intent =
      intent.intent
        .trim()
        .toUpperCase();
  }

  // ------------------------------------------------------
  // Language
  // ------------------------------------------------------

  if (
    typeof intent.language ===
    "string"
  ) {
    const language =
      intent.language
        .trim()
        .toLowerCase();

    const languageMap: Record<
      string,
      string
    > = {
      english: "en",
      en: "en",

      hindi: "hi",
      hi: "hi",

      hinglish: "hinglish",
    };

    intent.language =
      languageMap[language] ??
      language;
  }

  // ------------------------------------------------------
  // Category
  // ------------------------------------------------------

  if (
    typeof intent.category ===
    "string"
  ) {
    const category =
      intent.category
        .trim()
        .toLowerCase();

    if (
      category === "dhaba" ||
      category === "restro" ||
      category === "restaurant"
    ) {
      intent.category =
        "restaurant";
    } else {
      intent.category =
        category;
    }
  }

  // ------------------------------------------------------
  // Sort
  // ------------------------------------------------------

  if (
    typeof intent.sort ===
    "string"
  ) {
    const sort =
      intent.sort
        .trim()
        .toLowerCase();

    const sortMap: Record<
      string,
      string
    > = {
      recommended: "best",
      recommend: "best",
      good: "best",

      closest: "nearest",
      nearby: "nearest",

      cheap: "cheapest",
      lowest: "cheapest",
      "lowest price":
        "cheapest",

      "best value":
        "best_value",
    };

    intent.sort =
      sortMap[sort] ??
      sort;
  }

  // ------------------------------------------------------
  // Audience → preferences
  // ------------------------------------------------------

  if (
    typeof intent.audience ===
    "string"
  ) {
    const audience =
      intent.audience
        .trim()
        .toLowerCase();

    intent.audience =
      audience;

    if (
      audience ===
      "family"
    ) {
      ensurePreference(
        intent,
        "family",
      );
    }

    if (
      audience ===
      "couple"
    ) {
      ensurePreference(
        intent,
        "couple",
      );
    }

    if (
      audience ===
      "friends"
    ) {
      ensurePreference(
        intent,
        "friends",
      );
    }
  }

  // ------------------------------------------------------
  // Default recommendation limit
  // ------------------------------------------------------

  if (
    intent.limit ===
      undefined ||
    intent.limit ===
      null
  ) {
    intent.limit = 5;
  }

  // ------------------------------------------------------
  // Default sorting
  // ------------------------------------------------------

  if (
    intent.intent ===
      "LOCAL_SEARCH" &&
    (
      intent.sort ===
        undefined ||
      intent.sort ===
        null
    )
  ) {
    intent.sort =
      "best";
  }
}

// ========================================================
// Add preference safely
// ========================================================

function ensurePreference(
  intent: Record<
    string,
    unknown
  >,
  preference: string,
): void {
  const existing =
    Array.isArray(
      intent.preferences,
    )
      ? intent.preferences.filter(
          (item) =>
            typeof item ===
            "string",
        )
      : [];

  if (
    !existing.includes(
      preference,
    )
  ) {
    existing.push(
      preference,
    );
  }

  intent.preferences =
    existing;
}