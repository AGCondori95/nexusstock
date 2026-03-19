import type { ApiError } from '../types/api.types';
import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    // Mantiene stack trace en V8
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      timestamp,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Error desconocido — no esponemos detalles en producción
  console.error('[Unhandled Error]', err);
  const body: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
    timestamp,
  };
  res.status(500).json(body);
}
