import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './env';
import { notFoundHandler } from '@middleware/notFound';
import { errorHandler } from '@middleware/errorHandler';

export function createServer(): Express {
  const app = express();

  // ── Security middleware ──────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
          imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // Necesario para httpOnly cookies (JWT)
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health check (no auth requerido) ─────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        environment: env.NODE_ENV,
        version: process.env.npm_package_version ?? '0.0.0',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes (se añadirán en Fase 2) ───────────────────────────────────
  // app.use('/api/v1/auth',      authRouter);
  // app.use('/api/v1/inventory', inventoryRouter);

  // ── Error handlers (deben ir AL FINAL) ───────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
