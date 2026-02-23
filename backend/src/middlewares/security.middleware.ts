import { envConfig } from '@/config/env.config.js';
import cors, { type CorsOptions } from 'cors';
import { RequestHandler } from 'express';
import helmet from 'helmet';

/**
 * Configuración de CORS con whitelist explícita.
 *
 * Patrón: Allowlist (NOT denylist) — solo permitimos orígenes conocidos.
 * En producción, ALLOWED_ORIGINS viene de variables de entorno.
 */
function buildCorsOptions(): CorsOptions {
  const allowedOrigins = new Set(envConfig.ALLOWED_ORIGINS);

  return {
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      // Permitir requests sin origin (Postman, curl, server-to-server)
      if (requestOrigin === undefined) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(requestOrigin)) {
        callback(null, true);
      } else {
        callback(
          new Error(
            `CORS policy: Origin "${requestOrigin}" is not allowed. ` +
              `Allowed origins: ${[...allowedOrigins].join(', ')}`,
          ),
        );
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    credentials: true, // Necesario para cookies httpOnly
    maxAge: 86400, // Cache preflight 24h - reduce OPTIONS requests
  };
}

/**
 * Configuración de Helmet con ajustes para API REST.
 * Helmet aplica 14 middlewares de headers de seguridad automáticamente.
 */
function buildHelmetOptions(): Parameters<typeof helmet>[0] {
  return {
    // Content Security Policy - desactivado para API pura (no sirve HTML)
    contentSecurityPolicy: false,
    // Cross-Origin Resource Policy - permite fetch desde otros orígenes
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  };
}

// Exportar middlewares ya configurados y listos para usar en app.use()
export const helmetMiddleware: RequestHandler = helmet(buildHelmetOptions());
export const corsMiddleware: RequestHandler = cors(buildCorsOptions());
