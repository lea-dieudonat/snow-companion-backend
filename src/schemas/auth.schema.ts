import { z } from 'zod';

const MAX_PASSWORD_BYTES = 72; // bcrypt tronque silencieusement au-delà de 72 octets

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Invalid email address').max(254, 'Invalid email address'));

export const RegisterSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, {
      message: 'Password must be at most 72 bytes',
    }),
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long').optional(),
});

export const LoginSchema = z.object({
  email: emailField,
  // Bornage haut pour éviter de hasher des entrées démesurées
  password: z.string().min(1, 'Password is required').max(200, 'Password is too long'),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
