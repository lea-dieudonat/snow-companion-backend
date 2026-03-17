import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

const DISCIPLINES = ['ski', 'snowboard', 'telemark', 'ski_touring', 'cross_country'] as const;
const RIDE_STYLES = ['freestyle', 'freeride', 'piste', 'backcountry', 'moguls'] as const;
const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const FREESTYLE_LEVELS = ['none', 'beginner', 'intermediate', 'advanced'] as const;
const SNOW_PREFERENCES = ['groomed', 'powder', 'mixed'] as const;
const REGIONS = ['alpes_nord', 'alpes_sud', 'pyrenees', 'massif_central', 'vosges', 'jura'] as const;
const BUDGET_RANGES = ['budget', 'mid', 'premium'] as const;

export const UpsertProfileSchema = z.object({
  disciplines: z.array(z.enum(DISCIPLINES)).min(1),
  primaryDiscipline: z.enum(DISCIPLINES).optional(),
  rideStyles: z.array(z.enum(RIDE_STYLES)).default([]),
  freestyleLevel: z.enum(FREESTYLE_LEVELS).optional(),
  snowPreference: z.enum(SNOW_PREFERENCES).optional(),
  offPiste: z.boolean().nullable().optional(),
  level: z.enum(LEVELS).optional(),
  withChildren: z.boolean().nullable().optional(),
  regions: z.array(z.enum(REGIONS)).default([]),
  budgetRange: z.enum(BUDGET_RANGES).optional(),
});

export type UpsertProfileDTO = z.infer<typeof UpsertProfileSchema>;
