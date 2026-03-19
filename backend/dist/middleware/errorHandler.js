"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
        // Mantiene stack trace en V8
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    const timestamp = new Date().toISOString();
    if (err instanceof AppError) {
        const body = {
            success: false,
            error: { code: err.code, message: err.message, details: err.details },
            timestamp,
        };
        res.status(err.statusCode).json(body);
        return;
    }
    // Error desconocido — no esponemos detalles en producción
    console.error('[Unhandled Error]', err);
    const body = {
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        },
        timestamp,
    };
    res.status(500).json(body);
}
exports.errorHandler = errorHandler;
