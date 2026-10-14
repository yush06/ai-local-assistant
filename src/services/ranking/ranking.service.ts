import type {
  LocalPlace,
} from "../places/places.service";

import type {
  AffordabilityResult,
} from "../affordability/affordability.types";

export interface RankOptions {
  budget?: number;

  sort:
    | "best"
    | "best_value"
    | "nearest"
    | "cheapest";
}

export interface RankableLocalPlace
  extends LocalPlace {
  distanceKm?: number;

  affordability?: AffordabilityResult;
}

export interface RankedLocalPlace
  extends RankableLocalPlace {
  score: number;
}

// ======================================================
// Generic local place ranking
// ======================================================

export function rankLocalPlaces(
  places: RankableLocalPlace[],
  options: RankOptions,
): RankedLocalPlace[] {
  const ranked =
    places.map(
      (place) => ({
        ...place,

        score:
          calculateScore(
            place,
            options,
          ),
      }),
    );

  // --------------------------------------------------
  // Cheapest
  //
  // Lower Google price level comes first.
  // Existing behavior preserved.
  // --------------------------------------------------

  if (
    options.sort ===
    "cheapest"
  ) {
    return ranked.sort(
      (a, b) => {
        const priceA =
          getPriceLevelScore(
            a.priceLevel ?? "",
          );

        const priceB =
          getPriceLevelScore(
            b.priceLevel ?? "",
          );

        return (
          priceA - priceB ||
          b.score - a.score
        );
      },
    );
  }

  // --------------------------------------------------
  // All other ranking strategies
  // --------------------------------------------------

  return ranked.sort(
    (a, b) =>
      b.score - a.score,
  );
}

// ======================================================
// Score calculation
// ======================================================

function calculateScore(
  place: RankableLocalPlace,
  options: RankOptions,
): number {
  // --------------------------------------------------
  // Rating
  // --------------------------------------------------

  const ratingScore =
    place.rating !== undefined
      ? place.rating * 15
      : 0;

  // --------------------------------------------------
  // Review count
  // --------------------------------------------------

  const reviewScore =
    place.reviewCount !==
      undefined
      ? Math.min(
          Math.log10(
            place.reviewCount + 1,
          ) * 10,
          25,
        )
      : 0;

  // --------------------------------------------------
  // Distance
  // --------------------------------------------------

  const distanceScore =
    place.distanceKm !==
      undefined
      ? Math.max(
          20 -
            place.distanceKm * 3,
          0,
        )
      : 0;

  // --------------------------------------------------
  // Budget
  // --------------------------------------------------

  const budgetScore =
    options.budget !== undefined
      ? calculateBudgetScore(
          place,
        )
      : 0;

  // --------------------------------------------------
  // Sort strategy
  // --------------------------------------------------

  switch (options.sort) {
    case "nearest":
      return (
        distanceScore +
        ratingScore * 0.25 +
        reviewScore * 0.25
      );

    case "cheapest":
      return (
        budgetScore +
        ratingScore * 0.5 +
        reviewScore * 0.25
      );

    case "best_value":
      return (
        budgetScore +
        ratingScore +
        reviewScore
      );

    case "best":
    default:
      return (
        ratingScore +
        reviewScore +
        distanceScore * 0.5 +
        budgetScore * 0.5
      );
  }
}

// ======================================================
// Budget score
// ======================================================

function calculateBudgetScore(
  place: RankableLocalPlace,
): number {
  if (!place.priceLevel) {
    return 0;
  }

  const priceScore =
    getPriceLevelScore(
      place.priceLevel,
    );

  /*
   * Lower Google price level
   * gets a better budget score.
   */
  return (
    (4 - priceScore) * 5
  );
}

// ======================================================
// Google price level -> numeric score
// ======================================================

function getPriceLevelScore(
  priceLevel: string,
): number {
  switch (
    priceLevel
      .toUpperCase()
  ) {
    case "PRICE_LEVEL_FREE":
      return 0;

    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;

    case "PRICE_LEVEL_MODERATE":
      return 2;

    case "PRICE_LEVEL_EXPENSIVE":
      return 3;

    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;

    default:
      return 2;
  }
}

// ======================================================
// Backward compatibility
//
// Existing restaurant code can continue to call
// rankRestaurants().
//
// Internally it now uses the generic ranking engine.
// ======================================================

export function rankRestaurants(
  places: RankableLocalPlace[],
  options: RankOptions,
): RankedLocalPlace[] {
  return rankLocalPlaces(
    places,
    options,
  );
}