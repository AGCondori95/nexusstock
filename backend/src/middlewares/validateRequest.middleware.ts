import type { NextFunction, Request, Response, RequestHandler } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '@/middlewares/errorHandler.middleware';

// Tipo explícito para el objeto a validar — evita propagación de `any`
interface ParseTarget {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
}

/**
 * Middleware factory que valida req contra un schema Zod.
 * Soporta validación de body, query y params simultáneamente.
 */
export const validateRequest =
  (schema: ZodTypeAny): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const target: ParseTarget = {
      body: req.body as Record<string, unknown>,
      query: req.query as Record<string, unknown>,
      params: req.params,
    };

    schema
      .parseAsync(target)
      .then(() => next())
      .catch((err: unknown) => {
        const zodError = err as ZodError;
        const errors = zodError.errors.map((e) => ({
          field: e.path.filter((p) => p !== 'body').join('.'),
          message: e.message,
          code: e.code,
        }));
        next(AppError.badRequest('Validation failed', errors));
      });
  };
