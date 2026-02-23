import { envConfig } from '@/config/env.config.js';
import { type AppErrorOptions } from '@/errors/AppError.js';
import { isAppError } from '@/errors/http.errors.js';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Estructura de respuesta de error — contrato con el frontend.
 * Todos los errores de NexusStock responden con esta forma exacta.
 */
interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly timestamp: string;
    // Solo en development - nunca exponer stack en producción
    readonly stack?: string;
  };
}

function buildErrorResponse(
  options: AppErrorOptions & { stack?: string | undefined },
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: options.errorCode,
      message: options.message,
      timestamp: new Date().toISOString(),
      ...(options.details !== undefined && { details: options.details }),
      ...(envConfig.NODE_ENV === 'development' &&
        options.stack !== undefined && { stack: options.stack }),
    },
  };
  return response;
}

/**
 * Global Error Handler — DEBE tener exactamente 4 parámetros para que Express
 * lo reconozca como error handler (aunque _next no se use).
 *
 * Convención: prefijo _ en parámetros no utilizados para satisfacer
 * la regla ESLint @typescript-eslint/no-unused-vars
 */
export const globalErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // CASO 1: Error operacional controlado (instancia de AppError)
  if (isAppError(error)) {
    const response = buildErrorResponse({
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      details: error.details,
      stack: error.stack,
    });
    res.status(error.statusCode).json(response);
    return;
  }

  // CASO 2: Error de programación (bug no controlado)
  // Logueamos el error completo internamente pero enviamos respuesta genérica
  console.error('💥 UNHANDLED PROGRAMMING ERROR:', error);

  const response = buildErrorResponse({
    message:
      envConfig.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : error instanceof Error
          ? error.message
          : 'Unknown error',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    errorCode: 'INTERNAL_SERVER_ERROR',
    stack: error instanceof Error ? error.stack : undefined,
  });

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
};

/**
 * Middleware para rutas no encontradas (404).
 * Se registra DESPUÉS de todas las rutas pero ANTES del error handler.
 */
export const notFoundHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const { NotFoundError } = await import('../errors/http.errors.js');
  next(
    new NotFoundError(`Route "${req.method} ${req.originalUrl}" does not exist on this server.`),
  );
};
