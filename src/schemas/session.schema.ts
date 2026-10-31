import { z } from 'zod';

const SessionBaseSchema = z.object({
  date: z.iso.datetime({ message: 'Date must be a valid ISO 8601 datetime' }),
  // Nom saisi librement ; facultatif si stationId est fourni (le nom de la fiche est alors utilisé)
  station: z.string().min(1).max(100).optional(),
  // Fiche station liée ; null pour détacher la session (mise à jour uniquement)
  stationId: z.string().min(1).max(100).nullable().optional(),
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

// .partial() est interdit sur un schéma avec .refine() (Zod 4) : on applique la règle après
export const CreateSessionSchema = SessionBaseSchema.refine((d) => d.station || d.stationId, {
  message: 'Station is required (station or stationId)',
  path: ['station'],
});

export const UpdateSessionSchema = SessionBaseSchema.partial();

export type CreateSessionDTO = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionDTO = z.infer<typeof UpdateSessionSchema>;
