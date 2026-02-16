export interface StationQueryParams {
  region?: string;
  maxPrice?: string;
  minAltitude?: string;
  level?: string;
  search?: string;
}

export interface NearbyStationsParams {
  latitude: string;
  longitude: string;
  maxDistance?: string;
}

export interface StationWithDistance {
  id: string;
  name: string;
  region: string;
  altitudeMin: number;
  altitudeMax: number;
  latitude: number;
  longitude: number;
  numSlopes: number;
  numLifts: number;
  kmSlopes: number;
  slopesDetail: any;
  snowCannons: number;
  skiArea: string;
  level: string[];
  passes: any;
  avgAccommodationPrice: number;
  website: string;
  description: string;
  access: any;
  season: any;
  services: string[];
  activities: string[];
  createdAt: Date;
  updatedAt: Date;
  distance: number; // Distance en km
}