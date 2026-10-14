import type { AiIntent } from "./ai.types";

import type { AssistantQuery } from "../../services/assistant/assistant.types";

export function mapCategory(
  category?: string,
): AssistantQuery["category"] {
  switch (
    category?.trim().toLowerCase()
  ) {
    case "restaurant":
      return "restaurant";

    case "electronics":
      return "electronics";

    case "mobile_store":
      return "mobile_store";

    case "clothing":
      return "clothing";

    case "grocery":
      return "grocery";

    case "pharmacy":
      return "pharmacy";

    case "hospital":
      return "hospital";

    case "hotel":
      return "hotel";

    case "cafe":
      return "cafe";

    case "salon":
      return "salon";

    case "bank":
      return "bank";

    case "atm":
      return "atm";

    default:
      return "general";
  }
}

export function mapAiIntentToAssistantQuery(
  intent: AiIntent,
): AssistantQuery {
  return {
    category: mapCategory(
      intent.category,
    ),

    location:
      intent.location?.text ?? "",

    radiusKm:
      intent.radiusKm,

    budget:
      intent.budget?.max,

    budgetType:
      intent.budget?.type ?? "unknown",

    people:
      intent.people,

    audience:
      intent.audience,

    limit:
      intent.limit ?? 5,

    sort:
      intent.sort ?? "best",
  };
}