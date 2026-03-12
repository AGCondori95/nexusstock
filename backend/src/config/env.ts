import type { AppConfig, NodeEnv } from '@/types';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Valida que una variable de entorno exista y no esté vacía.
 * Lanza un error en startup si falta (patrón fail-fast).
 */
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[Config] Missing required environment variable: "${key}"`);
  }
  return value.trim();
};

const getEnvOrDefault = (key: string, defaultValue: string): string => {
  return process.env[key]?.trim() ?? defaultValue;
};

const parseNumber = (key: string, defaultValue: number): number => {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  if (isNaN(parsed)) {
    throw new Error(`[Config] Environment variable "${key}" must be a number, got: "${raw}"`);
  }
  return parsed;
};

// ── Construcción y validación del config ─────────────────────────────────────

const buildConfig = (): AppConfig & {
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtCookieExpiresIn: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
} => {
  const nodeEnv = getEnvOrDefault('NODE_ENV', 'development') as NodeEnv;

  const validEnvs: NodeEnv[] = ['development', 'production', 'test'];
  if (!validEnvs.includes(nodeEnv)) {
    throw new Error(`[Config] NODE_ENV must be one of: ${validEnvs.join(', ')}`);
  }

  return {
    // App
    port: parseNumber('PORT', 3001),
    nodeEnv,
    apiPrefix: getEnvOrDefault('API_PREFIX', '/api/v1'),
    corsOrigins: getEnvOrDefault('CORS_ORIGINS', 'http://localhost:5173').split(','),

    // Database
    mongoUri: requireEnv('MONGODB_URI'),

    // JWT
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: getEnvOrDefault('JWT_EXPIRES_IN', '7d'),
    jwtCookieExpiresIn: parseNumber('JWT_COOKIE_EXPIRES_IN', 7),

    // Rate limiting
    rateLimitWindowMs: parseNumber('RATE_LIMIT_WINDOW_MS', 900000),
    rateLimitMaxRequests: parseNumber('RATE_LIMIT_MAX_REQUEST', 100),
  };
};

export const config = buildConfig();
