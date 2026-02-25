import { z } from 'zod';

/**
 * Schemas Zod para validación de input de autenticación.
 *
 * Zod nos da dos cosas simultáneamente:
 * 1. Validación en runtime con mensajes de error descriptivos
 * 2. Inferencia de tipos TypeScript (z.infer<typeof Schema>)
 *
 * Esto elimina la duplicación entre "tipo TS" y "validación runtime".
 */

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  );

export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .max(255, 'Email cannot exceed 255 characters')
    .toLowerCase(),
  password: passwordSchema,
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(1, 'First name cannot be empty')
    .max(50, 'First name cannot exceed 50 characters')
    .trim(),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(1, 'Last name cannot be empty')
    .max(50, 'Last name cannot exceed 50 characters')
    .trim(),
});

export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(1),
});

export const RefreshTokenSchema = z.object({
  // El refresh token llega por cookie, no por body.
  // Este schema valida que la cookie exista y tenga formato JWT básico.
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(10, 'Invalid refresh token format'),
});

// Tipos referidos de los schemas - usados en controllers y services
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
