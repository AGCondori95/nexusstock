import type { Application } from 'express';
import express from 'express';

/**
 * Crea y configura la instancia de Express.
 * Separar la app del server.listen() es un patrón clave
 * para poder hacer testing sin abrir puertos reales.
 */
export const createApp = (): Application => {
  const app = express();

  // ── Body Parsers ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Health Check (sin prefijo de API) ────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'NexusStock API is operational',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] ?? 'development',
    });
  });

  return app;
};
