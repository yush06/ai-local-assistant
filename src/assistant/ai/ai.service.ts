// src/assistant/ai/ai.service.ts

import type {
  AiIntent,
  AiResponse,
} from "./ai.types";

import {
  extractIntentFallback,
} from "./ai.fallback";


/*
 * =========================================
 * PROVIDER CONTRACT
 * =========================================
 */

export interface AiProvider {
  extractIntent(
    query: string,
  ): Promise<AiIntent>;

  generateResponse(
    intent: AiIntent,
    results: unknown[],
  ): Promise<AiResponse>;
}


/*
 * =========================================
 * AI SERVICE
 * =========================================
 */

export class AiService {
  constructor(
    private readonly provider: AiProvider,
  ) {}


  /*
   * =======================================
   * EXTRACT INTENT
   * =======================================
   */

  async extractIntent(
    query: string,
  ): Promise<AiIntent> {
    if (
      !query?.trim()
    ) {
      throw new Error(
        "Query is required",
      );
    }


    const normalizedQuery =
      query.trim();


    /*
     * ---------------------------------------
     * FIRST: AI PROVIDER
     * ---------------------------------------
     */

    try {
      const aiIntent =
        await this.provider
          .extractIntent(
            normalizedQuery,
          );


      /*
       * -------------------------------------
       * DETERMINISTIC ENRICHMENT
       * -------------------------------------
       *
       * Run fallback parsing as an additional
       * safety layer.
       *
       * We DO NOT replace the AI result.
       *
       * We only fill fields that AI missed.
       */

      const fallbackIntent =
        extractIntentFallback(
          normalizedQuery,
        );


      return mergeMissingIntentFields(
        aiIntent,
        fallbackIntent,
      );

    } catch (
      error
    ) {
      /*
       * -------------------------------------
       * PROVIDER FAILED
       * -------------------------------------
       *
       * Use deterministic fallback.
       */

      console.error(
        "AI intent extraction failed. " +
          "Using deterministic fallback.",
        error,
      );


      return extractIntentFallback(
        normalizedQuery,
      );
    }
  }


  /*
   * =======================================
   * GENERATE RESPONSE
   * =======================================
   */

  async generateResponse(
    intent: AiIntent,
    results: unknown[],
  ): Promise<AiResponse> {
    return this.provider
      .generateResponse(
        intent,
        results,
      );
  }
}


/*
 * =========================================
 * MERGE AI + FALLBACK
 * =========================================
 *
 * AI remains the primary source.
 *
 * Fallback only supplies missing fields.
 */

function mergeMissingIntentFields(
  aiIntent: AiIntent,
  fallbackIntent: AiIntent,
): AiIntent {
  return {
    /*
     * AI remains authoritative for intent.
     */
    ...aiIntent,


    /*
     * ---------------------------------------
     * CATEGORY
     * ---------------------------------------
     */

    category:
      aiIntent.category ??
      fallbackIntent.category,


    /*
     * ---------------------------------------
     * LOCATION
     * ---------------------------------------
     *
     * This is the main fix for:
     *
     * "500 ke andar family restaurant
     *  in Kanpur"
     */

    location:
      aiIntent.location ??
      fallbackIntent.location,


    /*
     * ---------------------------------------
     * BUDGET
     * ---------------------------------------
     */

    budget:
      aiIntent.budget ??
      fallbackIntent.budget,


    /*
     * ---------------------------------------
     * PEOPLE
     * ---------------------------------------
     */

    people:
      aiIntent.people ??
      fallbackIntent.people,


    /*
     * ---------------------------------------
     * AUDIENCE
     * ---------------------------------------
     */

    audience:
      aiIntent.audience ??
      fallbackIntent.audience,


    /*
     * ---------------------------------------
     * PREFERENCES
     * ---------------------------------------
     */

    preferences:
      mergePreferences(
        aiIntent.preferences,
        fallbackIntent.preferences,
      ),


    /*
     * ---------------------------------------
     * LIMIT
     * ---------------------------------------
     */

    limit:
      aiIntent.limit ??
      fallbackIntent.limit,


    /*
     * ---------------------------------------
     * SORT
     * ---------------------------------------
     */

    sort:
      aiIntent.sort ??
      fallbackIntent.sort,


    /*
     * ---------------------------------------
     * ORIGINAL QUERY
     * ---------------------------------------
     *
     * Always preserve the real user query.
     */

    originalQuery:
      aiIntent.originalQuery ||
      fallbackIntent.originalQuery,
  };
}


/*
 * =========================================
 * MERGE PREFERENCES
 * =========================================
 */

function mergePreferences(
  aiPreferences?: string[],
  fallbackPreferences?: string[],
): string[] | undefined {
  const values = [
    ...(aiPreferences ?? []),
    ...(fallbackPreferences ?? []),
  ];


  if (
    values.length === 0
  ) {
    return undefined;
  }


  return [
    ...new Set(
      values.map(
        (value) =>
          value.trim(),
      ).filter(Boolean),
    ),
  ];
}