import { loggerMiddeware } from '@/middlewares/logger.middleware.js';
import { corsMiddleware, helmetMiddleware } from '@/middlewares/security.middleware.js';
import express, { type Express } from 'express';
import indexRouter from './routes/index.routes.js';
import { globalErrorHandler, notFoundHandler } from '@/middlewares/error.middleware.js';
import cookieParser from 'cookie-parser';
import { envConfig } from '@/config/env.config.js';

/**
 * Factory function para crear la Express App.
 *
 * Patrón: App Factory — separar la creación de la app de su inicio (.listen()).
 * Beneficios:
 *   1. Testabilidad — los tests importan createApp() sin iniciar el servidor real.
 *   2. Claridad — el orden de middlewares es explícito y documentado.
 *   3. Reutilización — útil para supertest en pruebas de integración.
 *
 * ORDEN CRÍTICO DE MIDDLEWARES (no cambiar):
 *   1. Security (helmet, cors) — lo primero, antes de procesar nada
 *   2. Logger — para loguear TODAS las requests incluyendo errores
 *   3. Body parsers — necesarios antes de acceder a req.body
 *   4. Routes — lógica de negocio
 *   5. 404 handler — captura rutas no registradas
 *   6. Error handler — SIEMPRE el último middleware
 */
export function createApp(): Express {
  const app = express();

  // ── 1. SECURITY LAYER ─────────────────────────────────────────────────────
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // ── 2. OBSERVABILITY LAYER ────────────────────────────────────────────────
  app.use(loggerMiddeware);

  // ── 3. BODY PARSING ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(envConfig.COOKIE_SECRET));

  // ── 4. ROUTES ─────────────────────────────────────────────────────────────
  app.use('/api/v1', indexRouter);

  // ── 5. NOT FOUND HANDLER (después de rutas) ───────────────────────────────
  app.use((req, res, next) => {
    notFoundHandler(req, res, next).catch((err: unknown) => {
      next(err);
    });
  });

  // ── 6. GLOBAL ERROR HANDLER (siempre último) ──────────────────────────────
  app.use(globalErrorHandler);

  return app;
}
