
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

export interface AssistantCoordinates {
  latitude: number;
  longitude: number;
}

export interface AssistantQuery {
  category: AssistantCategory;

  /**
   * Destination where the user wants to search.
   * Example: "Lucknow".
   */
  location: string;

  /**
   * User's actual current GPS location.
   * Example: coordinates from the browser.
   */
  currentLocation?: AssistantCoordinates;

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
