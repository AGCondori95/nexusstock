import type { ApiResponse, HttpStatusCode, ValidationError } from '@/types';
import { logger } from '@/utils/logger';
import type { NextFunction, Request, Response } from 'express';

/**
 * Clase base para errores operacionales de la aplicación.
 * Distingue errores esperados (operacionales) de bugs inesperados.
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors?: ValidationError[] | undefined;

  constructor(
    message: string,
    statusCode: HttpStatusCode,
    code: string,
    options?: {
      isOperational?: boolean;
      errors?: ValidationError[];
    },
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = options?.isOperational ?? true;
    this.errors = options?.errors;

    // Necesario oara que instanceof funcione con clases que extiended Error en TS
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory Methods ───────────────────────────────────────────────────────

  static badRequest(message: string, errors?: ValidationError[]): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', errors ? { errors } : undefined);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  static tooManyRequest(message = 'Too many requests'): AppError {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR', { isOperational: false });
  }
}

// ── Manejadores por tipo de error ─────────────────────────────────────────────

const handleMongooseCastError = (err: Record<string, unknown>): AppError => {
  const message = `Invalid value for field "${String(err['path'])}": ${String(err['value'])}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleMongooseDuplicateKey = (err: Record<string, unknown>): AppError => {
  const keyValue = err['keyValue'] as Record<string, unknown>;
  const field = Object.keys(keyValue)[0] ?? 'field';
  return new AppError(`Duplicate value for "${field}"`, 409, 'DUPLICATE_KEY');
};

const handleMongooseValidation = (err: Record<string, unknown>): AppError => {
  const errors = Object.values(
    err['errors'] as Record<string, { path: string; message: string }>,
  ).map(({ path, message }) => ({
    field: path,
    message,
    code: 'VALIDATION_ERROR',
  }));
  return new AppError('Validation failed', 422, 'MONGOOSE_VALIDATION', { errors });
};

const handleJwtError = (): AppError => AppError.unauthorized('Invalid token. Please log in');

const handleJwtExpired = (): AppError =>
  AppError.unauthorized('Token expired. Please log in again.');

// ── Middleware global de errores ──────────────────────────────────────────────

export const errorHandlerMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let error: AppError;

  // Normalizar el error a AppError
  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof Error) {
    const raw = err as unknown as Record<string, unknown>;

    if (raw['name'] === 'CastError') {
      error = handleMongooseCastError(raw);
    } else if (raw['code'] === 11000) {
      error = handleMongooseDuplicateKey(raw);
    } else if (raw['name'] === 'ValidationError') {
      error = handleMongooseValidation(raw);
    } else if (raw['name'] === 'JsonWebTokenError') {
      error = handleJwtError();
    } else if (raw['name'] === 'TokenExpiredError') {
      error = handleJwtExpired();
    } else {
      error = AppError.internal(err.message);
    }
  } else {
    error = AppError.internal();
  }

  // Log del error
  if (error.statusCode >= 500) {
    logger.error('Unhandled server error', {
      requestId: req.requestId,
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn('Operational error', {
      requestId: req.requestId,
      code: error.code,
      message: error.message,
      url: req.originalUrl,
    });
  }

  // Construir respuesta
  const isProduction = process.env['NODE_ENV'] === 'production';

  const response: ApiResponse<null> = {
    status: error.statusCode >= 500 ? 'error' : 'fail',
    message:
      isProduction && !error.isOperational
        ? 'Something went wrong. Please try again later.'
        : error.message,
    ...(error.errors && { errors: error.errors }),
  };

  res.status(error.statusCode).json(response);
};
