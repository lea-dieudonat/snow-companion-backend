import { z } from 'zod';

export const CreateSessionSchema = z.object({
  date: z.iso.datetime({ message: 'Date must be a valid ISO 8601 datetime' }),
  station: z.string().min(1, 'Station is required').max(100),
  conditions: z.string().max(200).optional(),
  tricks: z.array(z.string().min(1).max(60)).max(50).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.url().max(2048)).max(10).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  runCount: z.number().int().min(0).optional(),
  maxSpeed: z.number().min(0).optional(),
  totalDistance: z.number().min(0).optional(),
  verticalDrop: z.number().int().min(0).optional(),
});

export const UpdateSessionSchema = CreateSessionSchema.partial();

export type CreateSessionDTO = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionDTO = z.infer<typeof UpdateSessionSchema>;
