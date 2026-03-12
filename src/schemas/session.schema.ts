import { z } from 'zod';

export const CreateSessionSchema = z.object({
  date: z.string().datetime({ message: 'Date must be a valid ISO 8601 datetime' }),
  station: z.string().min(1, 'Station is required'),
  conditions: z.string().optional(),
  tricks: z.array(z.string()).optional(),
  notes: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  userId: z.string().min(1, 'userId is required'),
});

export const UpdateSessionSchema = CreateSessionSchema.omit({ userId: true }).partial();

export type CreateSessionDTO = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionDTO = z.infer<typeof UpdateSessionSchema>;
