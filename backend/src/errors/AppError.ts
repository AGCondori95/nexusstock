/**
 * Jerarquía de errores de la aplicación.
 *
 * Patrón: Error Class Hierarchy
 * - AppError: clase base para TODOS los errores controlados (operacionales)
 * - Los errores operacionales son predecibles (ej: usuario no encontrado, validación fallida)
 * - Los errores de programación son bugs (ej: TypeError, ReferenceError) — no extienden AppError
 *
 * El Error Handler global los distingue para decidir:
 * - Error operacional → enviar detalles al cliente (es seguro)
 * - Error de programación → loguear internamente, respuesta genérica 500 al cliente
 */

export interface AppErrorOptions {
  readonly message: string;
  readonly statusCode: number;
  readonly errorCode: string; // Código interno: "USER_NOT_FOUND", "VALIDATION_FAILED", etc.
  readonly details?: unknown; // Información adicional estructurada (ej: campos inválidos)
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: unknown;
  public readonly isOperational: boolean = true; // Siempre true en AppError
  public readonly timestamp: string;

  constructor(options: AppErrorOptions) {
    super(options.message);

    // Restaurar cadena de prototipo (necesario al extender Error en TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name; // Nombre de la clase hija (ej: "NotFoundError")
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode;
    this.details = options.details;
    this.timestamp = new Date().toISOString();

    // Capturar stack trace limpio (excluir al constructor de AppError)
    Error.captureStackTrace(this, new.target);
  }
}
