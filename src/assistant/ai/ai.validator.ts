// src/assistant/ai/ai.validator.ts

import type {
  AiIntent,
  AssistantAudience,
  AssistantIntent,
  AssistantSort,
  SupportedLanguage,
} from "./ai.types";

const SUPPORTED_INTENTS: AssistantIntent[] = [
  "LOCAL_SEARCH",
  "REFINE_SEARCH",
  "GENERAL_QUESTION",
  "UNKNOWN",
];

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "en",
  "hi",
  "hinglish",
];

const SUPPORTED_SORTS: AssistantSort[] = [
  "best",
  "best_value",
  "nearest",
  "cheapest",
];

const SUPPORTED_AUDIENCES: AssistantAudience[] = [
  "family",
  "couple",
  "friends",
  "any",
];

export function validateAiIntent(
  value: unknown,
): value is AiIntent {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const intent =
    value as Record<string, unknown>;

  if (
    typeof intent.intent !== "string" ||
    !SUPPORTED_INTENTS.includes(
      intent.intent as AssistantIntent,
    )
  ) {
    return false;
  }

  if (
    typeof intent.language !== "string" ||
    !SUPPORTED_LANGUAGES.includes(
      intent.language as SupportedLanguage,
    )
  ) {
    return false;
  }

  if (
    typeof intent.originalQuery !== "string"
  ) {
    return false;
  }

  if (
    intent.category !== undefined &&
    typeof intent.category !== "string"
  ) {
    return false;
  }

  if (
    intent.location !== undefined &&
    intent.location !== null
  ) {
    if (
      typeof intent.location !== "object"
    ) {
      return false;
    }

    const location =
      intent.location as Record<
        string,
        unknown
      >;

    if (
      location.text !== undefined &&
      typeof location.text !== "string"
    ) {
      return false;
    }

    if (
      location.latitude !== undefined &&
      typeof location.latitude !== "number"
    ) {
      return false;
    }

    if (
      location.longitude !== undefined &&
      typeof location.longitude !== "number"
    ) {
      return false;
    }
  }

  if (
    intent.budget !== undefined &&
    intent.budget !== null
  ) {
    if (
      typeof intent.budget !== "object"
    ) {
      return false;
    }

    const budget =
      intent.budget as Record<
        string,
        unknown
      >;

    if (
      budget.min !== undefined &&
      (
        typeof budget.min !== "number" ||
        budget.min < 0
      )
    ) {
      return false;
    }

    if (
      budget.max !== undefined &&
      (
        typeof budget.max !== "number" ||
        budget.max <= 0
      )
    ) {
      return false;
    }

    if (
      budget.currency !== undefined &&
      budget.currency !== "INR"
    ) {
      return false;
    }
  }

  if (
    intent.preferences !== undefined
  ) {
    if (
      !Array.isArray(
        intent.preferences,
      )
    ) {
      return false;
    }

    if (
      intent.preferences.some(
        (item) =>
          typeof item !== "string",
      )
    ) {
      return false;
    }
  }

  if (
    intent.limit !== undefined &&
    (
      typeof intent.limit !== "number" ||
      intent.limit < 1 ||
      intent.limit > 20
    )
  ) {
    return false;
  }

  if (
    intent.radiusKm !== undefined &&
    (
      typeof intent.radiusKm !== "number" ||
      intent.radiusKm <= 0 ||
      intent.radiusKm > 50
    )
  ) {
    return false;
  }

  if (
    intent.people !== undefined &&
    (
      typeof intent.people !== "number" ||
      intent.people <= 0 ||
      intent.people > 50
    )
  ) {
    return false;
  }

  if (
    intent.audience !== undefined &&
    !SUPPORTED_AUDIENCES.includes(
      intent.audience as AssistantAudience,
    )
  ) {
    return false;
  }

  if (
    intent.sort !== undefined &&
    !SUPPORTED_SORTS.includes(
      intent.sort as AssistantSort,
    )
  ) {
    return false;
  }

  return true;
}