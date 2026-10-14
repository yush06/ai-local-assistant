
import { PlacesService } from "../places/places.service";
import { rankLocalPlaces } from "../ranking/ranking.service";
import { LocationService } from "../location/location.service";
import { calculateAffordability } from "../affordability/affordability.service";

import type { AssistantQuery } from "./assistant.types";

export class AssistantService {
  constructor(
    private readonly placesService: PlacesService,
    private readonly locationService: LocationService,
  ) {}

  async search(query: AssistantQuery) {
    const limit = Math.min(
      Math.max(query.limit || 10, 1),
      20,
    );

    // STEP 1: Resolve the destination for the search.
    // Example: "Lucknow" when searching for hotels there.
    const resolvedLocation =
      await this.locationService.resolveLocation(
        query.location,
      );

    const radiusKm = query.radiusKm ?? 5;

    // STEP 2: Search in the requested destination.
    const candidateLimit = Math.min(
      Math.max(limit * 2, 10),
      20,
    );

    const places = await this.placesService.searchPlaces(
      query.category,
      resolvedLocation.name,
      candidateLimit,
      {
        location: resolvedLocation.coordinates,
        radiusKm,
      },
    );

    // STEP 3: Calculate distance from the user's current
    // GPS location, NOT from the search destination.
    const distanceOrigin = query.currentLocation;

    const placesWithDistance = places.map((place) => ({
      ...place,
      distanceKm: distanceOrigin
        ? calculateDistanceKm(
            distanceOrigin,
            place.coordinates,
          )
        : undefined,
    }));

    // STEP 4: Calculate affordability.
    const placesWithAffordability =
      placesWithDistance.map((place) => ({
        ...place,
        affordability: calculateAffordability({
          priceLevel: place.priceLevel,
          budget: query.budget,
          people: query.people,
        }),
      }));

    // STEP 5: Preserve the existing ranking engine.
    const rankedPlaces = rankLocalPlaces(
      placesWithAffordability,
      {
        budget: query.budget,
        sort: query.sort,
      },
    );

    // STEP 6: Sort results.
    // If GPS is missing, don't claim that results are
    // nearest to the user.
    const sortedResults =
      query.sort === "nearest" && distanceOrigin
        ? sortByDistance(placesWithAffordability)
        : query.budget !== undefined
          ? sortByBudgetFit(rankedPlaces)
          : rankedPlaces;

    // STEP 7: Limit results.
    const results = sortedResults.slice(0, limit);

    return {
      query,

      location: {
        searched: resolvedLocation.name,
        address: resolvedLocation.address,
        coordinates: resolvedLocation.coordinates,
        radiusKm,

        // Indicates which origin was used for distance.
        distanceOrigin: distanceOrigin
          ? "current_location"
          : "unavailable",
      },

      budgetSummary: createBudgetSummary(
        query.budget,
        query.people,
      ),

      count: results.length,
      results,
    };
  }
}

// Budget ordering
function sortByBudgetFit<
  T extends {
    affordability?: {
      budgetFit?: string;
    };
  },
>(places: T[]): T[] {
  const budgetPriority: Record<string, number> = {
    WITHIN_BUDGET: 1,
    LIKELY_WITHIN_BUDGET: 2,
    UNKNOWN: 3,
    MAY_EXCEED_BUDGET: 4,
  };

  return [...places].sort(
    (a, b) =>
      (budgetPriority[
        a.affordability?.budgetFit ?? "UNKNOWN"
      ] ?? 3) -
      (budgetPriority[
        b.affordability?.budgetFit ?? "UNKNOWN"
      ] ?? 3),
  );
}

// Distance ordering
function sortByDistance<
  T extends {
    distanceKm?: number;
  },
>(places: T[]): T[] {
  return [...places].sort(
    (a, b) =>
      (a.distanceKm ?? Number.MAX_VALUE) -
      (b.distanceKm ?? Number.MAX_VALUE),
  );
}

function createBudgetSummary(
  budget?: number,
  people?: number,
) {
  if (budget === undefined || budget <= 0) {
    return undefined;
  }

  const resolvedPeople = people ?? 1;

  return {
    totalBudget: budget,
    people: resolvedPeople,
    budgetPerPerson: round(budget / resolvedPeople),
  };
}

function calculateDistanceKm(
  origin: {
    latitude: number;
    longitude: number;
  },
  destination?: {
    latitude: number;
    longitude: number;
  },
): number | undefined {
  if (!destination) {
    return undefined;
  }

  const earthRadiusKm = 6371;

  const latitudeDifference = toRadians(
    destination.latitude - origin.latitude,
  );

  const longitudeDifference = toRadians(
    destination.longitude - origin.longitude,
  );

  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(
    destination.latitude,
  );

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return round(earthRadiusKm * c);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
