export type SupportedLanguage =
  | "en"
  | "hi"
  | "hinglish";

export type AssistantIntent =
  | "LOCAL_SEARCH"
  | "REFINE_SEARCH"
  | "GENERAL_QUESTION"
  | "UNKNOWN";

export type AssistantSort =
  | "best"
  | "best_value"
  | "nearest"
  | "cheapest";

export type AssistantAudience =
  | "family"
  | "couple"
  | "friends"
  | "any";

export type BudgetType =
  | "total"
  | "per_person"
  | "unknown";

export type AiResultReferenceType =
  | "first"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "selected"
  | "unknown";

export interface AiLocation {
  text?: string;
  latitude?: number;
  longitude?: number;
}

export interface AiBudget {
  min?: number;
  max?: number;
  currency?: "INR";
  type?: BudgetType;
}

export interface AiIntent {
  intent: AssistantIntent;

  category?: string;

  location?: AiLocation;

  budget?: AiBudget;

  preferences?: string[];

  limit?: number;

  radiusKm?: number;

  people?: number;

  audience?: AssistantAudience;

  sort?: AssistantSort;

  language: SupportedLanguage;

  originalQuery: string;

  resultIndex?: number;

  resultReferenceType?: AiResultReferenceType;
}

export interface AiResponse {
  message: string;

  language: SupportedLanguage;

  shouldAskClarification: boolean;

  clarificationQuestion?: string;
}