import type { AiIntent } from "../ai/ai.types";

import { mapCategory } from "../ai/ai.mapper";

import type { AssistantQuery } from "../../services/assistant/assistant.types";

export function mergeConversationQuery(
  previous: AssistantQuery,
  intent: AiIntent,
): AssistantQuery {
  return {
    ...previous,

    /**
     * Category refinement
     */
    category:
      intent.category
        ? mapCategory(intent.category)
        : previous.category,

    /**
     * Location refinement
     */
    location:
      intent.location?.text ??
      previous.location,

    /**
     * Distance/radius refinement
     *
     * Examples:
     *
     * "2 km ke andar"
     * "within 5 km"
     * "mere paas wale"
     */
    radiusKm:
      intent.radiusKm ??
      previous.radiusKm,

    /**
     * Budget amount
     */
    budget:
      intent.budget?.max ??
      previous.budget,

    /**
     * Total/per-person budget
     */
    budgetType:
      intent.budget?.type ??
      previous.budgetType,

    /**
     * Number of people
     */
    people:
      intent.people ??
      previous.people,

    /**
     * Audience
     */
    audience:
      intent.audience ??
      previous.audience,

    /**
     * Result limit
     */
    limit:
      intent.limit ??
      previous.limit,

    /**
     * Sort
     */
    sort:
      intent.sort ??
      previous.sort,
  };
}