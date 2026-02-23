import { AppError } from '@/errors/AppError.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Colección de errores HTTP semánticos.
 * Cada clase encapsula status code y error code — el llamador solo provee el mensaje.
 *
 * Uso en controllers:
 *   throw new NotFoundError('Product with ID 123 does not exist');
 *   throw new ValidationError('Invalid input', { fields: ['name', 'price'] });
 */

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      statusCode: StatusCodes.NOT_FOUND, // 404
      errorCode: 'RESOURCE_NOT_FOUND',
      details,
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      statusCode: StatusCodes.UNPROCESSABLE_ENTITY, // 422
      errorCode: 'VALIDATION_FAILED',
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super({
      message,
      statusCode: StatusCodes.UNAUTHORIZED, // 401
      errorCode: 'UNAUTHORIZED',
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super({
      message,
      statusCode: StatusCodes.FORBIDDEN, // 403
      errorCode: 'FORBIDDEN',
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      statusCode: StatusCodes.CONFLICT, // 409
      errorCode: 'RESOURCE_CONFLICT',
      details,
    });
  }
}

export class InternalServiceError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super({
      message,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR, // 500
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

// Type guard: determinar si un error desconocido es un AppError controlado
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}
