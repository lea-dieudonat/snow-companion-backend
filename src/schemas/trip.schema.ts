import { z } from 'zod';

export const CreateTripSchema = z.object({
  name: z.string().min(1, 'Le nom du trip est requis'),
  startDate: z.string().datetime({ message: 'Date de départ invalide (ISO 8601 requis)' }),
  endDate: z.string().datetime({ message: 'Date de fin invalide' }).optional(),
  stationId: z.string().min(1, 'La station est requise'),
  notes: z.string().optional(),
});

export const UpdateTripSchema = CreateTripSchema.partial();

export type CreateTripDTO = z.infer<typeof CreateTripSchema>;
export type UpdateTripDTO = z.infer<typeof UpdateTripSchema>;
