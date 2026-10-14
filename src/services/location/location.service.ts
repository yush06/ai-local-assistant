import type {
  Coordinates,
  ResolvedLocation,
} from "./location.types";

interface GoogleLocation {
  latitude?: number;
  longitude?: number;
}

interface GoogleDisplayName {
  text?: string;
}

interface GooglePlace {
  id?: string;

  displayName?: GoogleDisplayName;

  formattedAddress?: string;

  location?: GoogleLocation;
}

interface GoogleLocationSearchResponse {
  places?: GooglePlace[];
}

const GOOGLE_PLACES_URL =
  "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
].join(",");

export class LocationService {
  constructor(
    private readonly apiKey: string,
  ) {}

  async resolveLocation(
    locationQuery: string,
  ): Promise<ResolvedLocation> {
    const response = await fetch(
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

        body: JSON.stringify({
          textQuery: locationQuery,

          pageSize: 5,

          regionCode: "IN",
        }),
      },
    );

    if (!response.ok) {
      const errorBody =
        await response.text();

      throw new Error(
        `Location resolution failed (${response.status}): ${errorBody}`,
      );
    }

    const data =
      (await response.json()) as GoogleLocationSearchResponse;

    const place = data.places?.find(
      (item) =>
        item.location?.latitude !==
          undefined &&
        item.location?.longitude !==
          undefined,
    );

    if (!place) {
      throw new Error(
        `Could not resolve location: ${locationQuery}`,
      );
    }

    const coordinates: Coordinates = {
      latitude:
        place.location!.latitude!,

      longitude:
        place.location!.longitude!,
    };

    return {
      query: locationQuery,

      name:
        place.displayName?.text ??
        locationQuery,

      address:
        place.formattedAddress ??
        locationQuery,

      coordinates,
    };
  }
}