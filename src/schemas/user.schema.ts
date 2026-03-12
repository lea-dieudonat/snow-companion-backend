import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
