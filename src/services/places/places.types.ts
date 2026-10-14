import type {
  AffordabilityResult,
} from "../affordability/affordability.types";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Restaurant {
  id: string;

  name: string;

  address: string;

  rating?: number;

  reviewCount?: number;

  priceLevel?: string;

  coordinates?: Coordinates;

  distanceKm?: number;

  affordability?: AffordabilityResult;
}

interface GoogleDisplayName {
  text?: string;
}

interface GoogleLocation {
  latitude?: number;
  longitude?: number;
}

export interface GooglePlace {
  id?: string;

  displayName?: GoogleDisplayName;

  formattedAddress?: string;

  rating?: number;

  userRatingCount?: number;

  priceLevel?: string;

  location?: GoogleLocation;
}

export interface GoogleTextSearchResponse {
  places?: GooglePlace[];

  nextPageToken?: string;
}