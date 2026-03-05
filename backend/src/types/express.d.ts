import type { AccessTokenPayload } from '@/types/jwt.types.ts';

/**
 * Extensión de los tipos globales de Express.
 * Permite agregar propiedades custom al objeto Request sin usar 'any'.
 * Se usará en pasos posteriores para req.user (JWT payload).
 */

declare global {
  namespace Express {
    // Extender Request con campos custom
    interface Request {
      requestId?: string; // ID único por request (para trazabilidad)
      startTime?: [number, number]; // Para medir duración con process.hrtime()
      // Disponible en rutas protegidas tras pasar el middleware authenticate
      user?: AccessTokenPayload;
    }
  }
}

// Este archivo es un módulo de declaración - no exporta nada
export {};
