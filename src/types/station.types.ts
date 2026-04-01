export type { StationQueryParams, NearbyStationsParams } from '@/schemas/station.schema';

export interface StationWithDistance {
  id: string;
  name: string;
  region: string;
  altitudeMin: number;
  altitudeMax: number;
  latitude: number;
  longitude: number;
  snowCannons: number;
  skiArea: { id: string; name: string; region: string | null; website: string | null } | null;
  passes: unknown;
  avgAccommodationPrice: number;
  website: string;
  description: string;
  access: unknown;
  season: unknown;
  services: string[];
  activities: string[];
  createdAt: Date;
  updatedAt: Date;
  distance: number;
}
