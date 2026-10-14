// src/assistant/ai/groq.provider.ts

import type {
  AiIntent,
  AiResponse,
} from "./ai.types";

import {
  ASSISTANT_INTENT_SYSTEM_PROMPT,
  ASSISTANT_RESPONSE_SYSTEM_PROMPT,
} from "./ai.prompt";

import {
  validateAiIntent,
} from "./ai.validator";

import {
  extractIntentFallback,
} from "./ai.fallback";
import { AiProvider } from "./ai.service.js";


const DEFAULT_MODEL =
  "llama-3.3-70b-versatile";

const DEFAULT_TIMEOUT_MS = 5000;

const DEFAULT_RETRY_COUNT = 2;

const DEFAULT_RETRY_DELAY_MS = 300;

export class GroqProvider
  implements AiProvider
{
  private readonly apiKey: string;

  private readonly model: string;

  private readonly timeoutMs: number;

  private readonly retryCount: number;

  private readonly retryDelayMs: number;

  constructor() {
    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not configured",
      );
    }

    this.apiKey = apiKey;

    this.model =
      process.env.GROQ_MODEL?.trim() ||
      DEFAULT_MODEL;

    this.timeoutMs =
      parsePositiveNumber(
        process.env.AI_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
      );

    this.retryCount =
      parseNonNegativeNumber(
        process.env.AI_RETRY_COUNT,
        DEFAULT_RETRY_COUNT,
      );

    this.retryDelayMs =
      parseNonNegativeNumber(
        process.env.AI_RETRY_DELAY_MS,
        DEFAULT_RETRY_DELAY_MS,
      );
  }

  async extractIntent(
    query: string,
  ): Promise<AiIntent> {
    const rawResponse =
      await this.callGroq(
        ASSISTANT_INTENT_SYSTEM_PROMPT,
        query,
      );

    console.log(
      "[GroqProvider] Raw intent response:",
      rawResponse,
    );

    const parsed =
      parseJsonResponse(
        rawResponse,
      );

    if (!parsed) {
      console.error(
        "[GroqProvider] Unable to parse AI response as JSON.",
      );

      console.error(
        "[GroqProvider] Raw response:",
        rawResponse,
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
        "[GroqProvider] AI returned invalid intent.",
      );

      console.error(
        "[GroqProvider] Parsed intent:",
        JSON.stringify(
          parsed,
          null,
          2,
        ),
      );

      console.error(
        "[GroqProvider] Original query:",
        query,
      );

      return extractIntentFallback(
        query,
      );
    }

    return parsed as AiIntent;
  }

  async generateResponse(
    intent: AiIntent,
    results: unknown[],
  ): Promise<AiResponse> {
    const prompt =
      buildResponsePrompt(
        intent,
        results,
      );

    const rawResponse =
      await this.callGroq(
        ASSISTANT_RESPONSE_SYSTEM_PROMPT,
        prompt,
      );

    return {
      message:
        cleanTextResponse(
          rawResponse,
        ),

      language:
        intent.language,

      shouldAskClarification:
        false,
    };
  }

  private async callGroq(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= this.retryCount;
      attempt += 1
    ) {
      try {
        return await this.callGroqOnce(
          systemPrompt,
          userPrompt,
        );
      } catch (error) {
        lastError = error;

        console.error(
          `[GroqProvider] Request failed. Attempt ${
            attempt + 1
          }/${this.retryCount + 1}`,
          error,
        );

        if (
          attempt <
          this.retryCount
        ) {
          await delay(
            this.retryDelayMs,
          );
        }
      }
    }

    throw (
      lastError ??
      new Error(
        "Groq request failed",
      )
    );
  }

  private async callGroqOnce(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        this.timeoutMs,
      );

    try {
      const response =
        await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${this.apiKey}`,
            },

            body: JSON.stringify({
              model:
                this.model,

              temperature: 0,

              messages: [
                {
                  role: "system",
                  content:
                    systemPrompt,
                },
                {
                  role: "user",
                  content:
                    userPrompt,
                },
              ],

              response_format: {
                type: "json_object",
              },
            }),

            signal:
              controller.signal,
          },
        );

      const responseText =
        await response.text();

      if (!response.ok) {
        throw new Error(
          `Groq API error ${response.status}: ${responseText}`,
        );
      }

      let data: unknown;

      try {
        data =
          JSON.parse(
            responseText,
          );
      } catch {
        throw new Error(
          `Invalid JSON returned by Groq HTTP API: ${responseText}`,
        );
      }

      const content =
        extractMessageContent(
          data,
        );

      if (!content) {
        throw new Error(
          "Groq response did not contain message content",
        );
      }

      return content;
    } finally {
      clearTimeout(
        timeout,
      );
    }
  }
}

function extractMessageContent(
  value: unknown,
): string | undefined {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  const response =
    value as Record<
      string,
      unknown
    >;

  const choices =
    response.choices;

  if (
    !Array.isArray(
      choices,
    ) ||
    choices.length === 0
  ) {
    return undefined;
  }

  const firstChoice =
    choices[0];

  if (
    !firstChoice ||
    typeof firstChoice !==
      "object"
  ) {
    return undefined;
  }

  const choice =
    firstChoice as Record<
      string,
      unknown
    >;

  const message =
    choice.message;

  if (
    !message ||
    typeof message !==
      "object"
  ) {
    return undefined;
  }

  const messageObject =
    message as Record<
      string,
      unknown
    >;

  const content =
    messageObject.content;

  if (
    typeof content !== "string"
  ) {
    return undefined;
  }

  return content.trim();
}

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

  // Remove markdown code fences if the model
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
    // Continue with object extraction below.
  }

  // Sometimes the model may return a short explanation
  // before/after the JSON. Try extracting the first JSON object.
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

function normalizeIntent(
  intent: Record<
    string,
    unknown
  >,
  originalQuery: string,
): void {
  intent.originalQuery =
    originalQuery;

  if (
    typeof intent.intent ===
    "string"
  ) {
    intent.intent =
      intent.intent
        .trim()
        .toUpperCase();
  }

  // Normalize AI language values to the
  // SupportedLanguage contract:
  // "en" | "hi" | "hinglish"
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

  if (
    intent.audience ===
    "family"
  ) {
    ensurePreference(
      intent,
      "family",
    );
  }

  if (
    intent.audience ===
    "couple"
  ) {
    ensurePreference(
      intent,
      "couple",
    );
  }

  if (
    intent.audience ===
    "friends"
  ) {
    ensurePreference(
      intent,
      "friends",
    );
  }

  if (
    intent.limit ===
    undefined
  ) {
    intent.limit = 5;
  }

  if (
    intent.intent ===
      "LOCAL_SEARCH" &&
    intent.sort ===
      undefined
  ) {
    intent.sort =
      "best";
  }
}

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

function buildResponsePrompt(
  intent: AiIntent,
  results: unknown[],
): string {
  return JSON.stringify({
    intent,
    results,
  });
}

function cleanTextResponse(
  value: string,
): string {
  return value
    .replace(
      /^```(?:text)?\s*/i,
      "",
    )
    .replace(
      /\s*```$/i,
      "",
    )
    .trim();
}

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed =
    Number(value);

  if (
    Number.isFinite(
      parsed,
    ) &&
    parsed > 0
  ) {
    return parsed;
  }

  return fallback;
}

function parseNonNegativeNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed =
    Number(value);

  if (
    Number.isFinite(
      parsed,
    ) &&
    parsed >= 0
  ) {
    return parsed;
  }

  return fallback;
}

function delay(
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