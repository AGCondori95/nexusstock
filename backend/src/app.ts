import mongoSanitize from 'express-mongo-sanitize';
import type { Application, Request, RequestHandler, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import compression from 'compression';

import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { config } from './config/env';
import type { ApiResponse } from './types';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware';
import cookieParser from 'cookie-parser';
import authRoutes from '@routes/auth.routes';
import productRoutes from '@routes/product.routes';

export const createApp = (): Application => {
  const app = express();

  // ── 1. Request ID (primero para trazabilidad en todos los logs) ───────────
  app.use(requestIdMiddleware);

  // ── 2. Seguridad: Headers HTTP ────────────────────────────────────────────
  app.use(helmet());

  // ── 3. Seguridad: CORS ────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`CORS: Origin "${origin}" not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  // ── 4. Seguridad: Rate Limiting ───────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      status: 'fail',
      message: 'Too many requests from this IP. Please try again later.',
    } satisfies ApiResponse,
    skip: () => config.nodeEnv === 'test',
  }) as unknown as RequestHandler;
  app.use(config.apiPrefix, limiter);

  // ── 5. Body Parsers ──────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  // ── 5.5 Cookie Parser ─────────────────────────────────────────────────────
  app.use(cookieParser() as unknown as RequestHandler);

  // ── 6. Seguridad: Sanitización ────────────────────────────────────────────
  app.use(mongoSanitize() as unknown as RequestHandler);
  app.use(hpp() as unknown as RequestHandler);

  // ── 7. Performance: Compresión ────────────────────────────────────────────
  app.use(compression() as unknown as RequestHandler);

  // ── 8. Health Check ───────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response): void => {
    const response: ApiResponse<{ uptime: number; environment: string }> = {
      status: 'success',
      message: 'NexusStock API is operational',
      data: {
        uptime: process.uptime(),
        environment: config.nodeEnv,
      },
    };
    res.status(200).json(response);
  });

  // ── 9. Rutas API (se agregan en pasos siguientes) ─────────────────────────
  app.use(config.apiPrefix, authRoutes);
  app.use(`${config.apiPrefix}/products`, productRoutes);

  // ── 10. Handlers de cierre (orden importa: 404 → Error) ──────────────────
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
};
