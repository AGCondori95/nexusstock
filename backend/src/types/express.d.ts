/**
 * Extensión de los tipos globales de Express.
 * Permite agregar propiedades custom al objeto Request sin usar 'any'.
 * Se usará en pasos posteriores para req.user (JWT payload).
 */

declare global {
  namespace Express {
    interface Request {
      requestId?: string; // ID único por request (para trazabilidad)
      startTime?: [number, number]; // Para medir duración con process.hrtime()
    }
  }
}

// Este archivo es un módulo de declaración - no exporta nada
export {};
