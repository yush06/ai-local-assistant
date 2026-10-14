export type AssistantCategory =
  | "restaurant"
  | "electronics"
  | "mobile_store"
  | "clothing"
  | "grocery"
  | "pharmacy"
  | "hospital"
  | "hotel"
  | "cafe"
  | "salon"
  | "bank"
  | "atm"
  | "general";

export type AssistantBudgetType =
  | "total"
  | "per_person"
  | "unknown";

export interface AssistantQuery {
  category: AssistantCategory;

  location: string;

  radiusKm?: number;

  budget?: number;

  budgetType?: AssistantBudgetType;

  people?: number;

  audience?:
    | "family"
    | "couple"
    | "friends"
    | "any";

  limit: number;

  sort:
    | "best"
    | "best_value"
    | "nearest"
    | "cheapest";
}