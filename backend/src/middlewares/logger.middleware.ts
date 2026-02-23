import { envConfig } from '@/config/env.config.js';
import type { RequestHandler } from 'express';
import morgan, { type StreamOptions } from 'morgan';

/**
 * Logger HTTP basado en Morgan.
 *
 * - Development: formato colorizado y verbose ('dev')
 * - Production: formato JSON estructurado para ingestión por herramientas como Datadog/Loki
 *
 * Patrón: Environment-aware configuration
 */

// Stream que redirige morgan a console.log (preparado para reemplazar con winston/pino)
const logStream: StreamOptions = {
  write: (message: string): void => {
    // trim() para evitar doble newline en logs
    console.log(message.trim());
  },
};

// Formato JSON estructurado para producción
morgan.token('body', (req) => {
  // Nunca loguear passwords u otros campos sensibles
  const body = (req as { body?: Record<string, unknown> }).body;
  if (!body || Object.keys(body).length === 0) return '-';

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
  sensitiveFields.forEach((field) => {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  });
  return JSON.stringify(sanitized);
});

const productionFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
});

export const loggerMiddeware: RequestHandler = morgan(
  envConfig.NODE_ENV === 'production' ? productionFormat : 'dev',
  { stream: logStream },
);
