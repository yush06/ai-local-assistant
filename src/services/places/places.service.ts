import type {
  GooglePlace,
  GoogleTextSearchResponse,
  Restaurant,
} from "./places.types";

import type {
  Coordinates,
} from "../location/location.types";

import type {
  AssistantCategory,
} from "../assistant/assistant.types";

const GOOGLE_PLACES_URL =
  "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.location",
  "places.types",
].join(",");

export interface PlaceSearchOptions {
  location?: Coordinates;
  radiusKm?: number;
}

export interface LocalPlace {
  id: string;

  name: string;

  address: string;

  rating?: number;

  reviewCount?: number;

  priceLevel?: string;

  coordinates?: Coordinates;

  category: AssistantCategory;
}

export class PlacesService {
  constructor(
    private readonly apiKey: string,
  ) {}

  // ======================================================
  // Generic local place search
  // ======================================================

  async searchPlaces(
    category: AssistantCategory,
    city: string,
    limit = 10,
    options: PlaceSearchOptions = {},
  ): Promise<LocalPlace[]> {
    const safeLimit =
      Math.min(
        Math.max(limit, 1),
        20,
      );

    const searchTerm =
      this.getSearchTerm(category);

    const body: Record<
      string,
      unknown
    > = {
      textQuery:
        `${searchTerm} in ${city}, India`,

      pageSize: safeLimit,

      regionCode: "IN",

      rankPreference:
        "RELEVANCE",
    };

    // --------------------------------------------------
    // Location bias
    // --------------------------------------------------

    if (options.location) {
      body.locationBias = {
        circle: {
          center: {
            latitude:
              options.location.latitude,

            longitude:
              options.location.longitude,
          },

          radius:
            (options.radiusKm ?? 5) *
            1000,
        },
      };
    }

    // --------------------------------------------------
    // Google Places request
    // --------------------------------------------------

    const response =
      await fetch(
        GOOGLE_PLACES_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Goog-Api-Key":
              this.apiKey,

            "X-Goog-FieldMask":
              FIELD_MASK,
          },

          body:
            JSON.stringify(body),
        },
      );

    // --------------------------------------------------
    // Google API error
    // --------------------------------------------------

    if (!response.ok) {
      const errorBody =
        await response.text();

      throw new Error(
        `Google Places API failed (${response.status}): ${errorBody}`,
      );
    }

    // --------------------------------------------------
    // Parse response
    // --------------------------------------------------

    const data =
      (await response.json()) as GoogleTextSearchResponse;

    // --------------------------------------------------
    // Normalize results
    // --------------------------------------------------

    const normalizedPlaces =
      (data.places ?? [])
        .filter(
          (
            place,
          ): place is GooglePlace & {
            id: string;
          } =>
            Boolean(place.id),
        )
        .map(
          (place) =>
            this.normalizePlace(
              place,
              category,
            ),
        );

    // --------------------------------------------------
    // Filter places by actual distance
    // --------------------------------------------------

    if (
      options.location &&
      options.radiusKm !== undefined
    ) {
      return normalizedPlaces.filter(
        (place) => {
          if (!place.coordinates) {
            return false;
          }

          const distanceKm =
            this.calculateDistanceKm(
              options.location!,
              place.coordinates,
            );

          return (
            distanceKm <=
            options.radiusKm!
          );
        },
      );
    }

    return normalizedPlaces;
  }

  // ======================================================
  // Restaurant compatibility method
  //
  // Existing code can continue using:
  //
  // searchRestaurants(...)
  //
  // ======================================================

  async searchRestaurants(
    city: string,
    limit = 10,
    options: PlaceSearchOptions = {},
  ): Promise<Restaurant[]> {
    const places =
      await this.searchPlaces(
        "restaurant",
        city,
        limit,
        options,
      );

    return places.map(
      (place) => ({
        id:
          place.id,

        name:
          place.name,

        address:
          place.address,

        rating:
          place.rating,

        reviewCount:
          place.reviewCount,

        priceLevel:
          place.priceLevel,

        coordinates:
          place.coordinates,
      }),
    );
  }

  // ======================================================
  // Category -> Google search term
  // ======================================================

  private getSearchTerm(
    category: AssistantCategory,
  ): string {
    switch (category) {
      case "restaurant":
        return "restaurants";

      case "electronics":
        return "electronics stores";

      case "mobile_store":
        return "mobile phone stores";

      case "clothing":
        return "clothing stores";

      case "grocery":
        return "grocery stores";

      case "pharmacy":
        return "pharmacies";

      case "hospital":
        return "hospitals";

      case "hotel":
        return "hotels";

      case "cafe":
        return "cafes";

      case "salon":
        return "salons";

      case "bank":
        return "banks";

      case "atm":
        return "ATMs";

      case "general":
      default:
        return "shops";
    }
  }

  // ======================================================
  // Calculate distance between two coordinates
  // ======================================================

  private calculateDistanceKm(
    from: Coordinates,
    to: Coordinates,
  ): number {
    const earthRadiusKm =
      6371;

    const latitudeDifference =
      this.toRadians(
        to.latitude -
          from.latitude,
      );

    const longitudeDifference =
      this.toRadians(
        to.longitude -
          from.longitude,
      );

    const fromLatitude =
      this.toRadians(
        from.latitude,
      );

    const toLatitude =
      this.toRadians(
        to.latitude,
      );

    const a =
      Math.sin(
        latitudeDifference / 2,
      ) **
        2 +
      Math.cos(
        fromLatitude,
      ) *
        Math.cos(
          toLatitude,
        ) *
        Math.sin(
          longitudeDifference / 2,
        ) **
          2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return (
      earthRadiusKm * c
    );
  }

  // ======================================================
  // Convert degrees to radians
  // ======================================================

  private toRadians(
    degrees: number,
  ): number {
    return (
      degrees *
      (Math.PI / 180)
    );
  }

  // ======================================================
  // Normalize Google Place
  // ======================================================

  private normalizePlace(
    place: GooglePlace & {
      id: string;
    },
    category: AssistantCategory,
  ): LocalPlace {
    return {
      id:
        place.id,

      name:
        place.displayName?.text ??
        "Unknown place",

      address:
        place.formattedAddress ??
        "Address unavailable",

      rating:
        place.rating,

      reviewCount:
        place.userRatingCount,

      priceLevel:
        place.priceLevel,

      coordinates:
        place.location?.latitude !==
          undefined &&
        place.location?.longitude !==
          undefined
          ? {
              latitude:
                place.location.latitude,

              longitude:
                place.location.longitude,
            }
          : undefined,

      category,
    };
  }
}