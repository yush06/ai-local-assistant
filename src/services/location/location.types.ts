export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation {
  query: string;
  name: string;
  address: string;
  coordinates: Coordinates;
}