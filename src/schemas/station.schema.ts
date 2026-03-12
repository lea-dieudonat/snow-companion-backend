import { z } from 'zod';

export const StationQuerySchema = z.object({
  region: z.string().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minAltitude: z.coerce.number().nonnegative().optional(),
  level: z.string().optional(),
  search: z.string().optional(),
});

export const NearbyStationsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  maxDistance: z.coerce.number().positive().optional().default(300),
});

export type StationQueryParams = z.infer<typeof StationQuerySchema>;
export type NearbyStationsParams = z.infer<typeof NearbyStationsSchema>;
