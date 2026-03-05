import dotenv from 'dotenv'; // Importa dotenv aquí
dotenv.config();

/**
 * Módulo de configuración de entorno.
 * Patrón: Fail-Fast — si falta una variable crítica, el proceso termina
 * inmediatamente con un mensaje claro en lugar de fallar silenciosamente en runtime.
 */

interface EnvConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly PORT: number;
  readonly ALLOWED_ORIGINS: string[];
  // ── Database ──────────────────────────────────────────────────────────────
  readonly MONGODB_URI: string;
  // ── JWT ───────────────────────────────────────────────────────────────────
  readonly JWT_ACCESS_SECRET: string;
  readonly JWT_REFRESH_SECRET: string;
  readonly JWT_ACCESS_EXPIRES_IN: string;
  readonly JWT_REFRESH_EXPIRES_IN: string;
  readonly COOKIE_SECRET: string;
  // ── Cloudinary ────────────────────────────────────────────────────────────
  readonly CLOUDINARY_CLOUD_NAME: string;
  readonly CLOUDINARY_API_KEY: string;
  readonly CLOUDINARY_API_SECRET: string;
  readonly CLOUDINARY_UPLOAD_FOLDER: string;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `❌ Environment variable "${key}" is required but was not provided.\n` +
        `   → Copy .env.example to .env and fill in the missing values.`,
    );
  }
  return value;
}

function parseNodeEnv(value: string): EnvConfig['NODE_ENV'] {
  const valid = ['development', 'production', 'test'] as const;
  if ((valid as readonly string[]).includes(value)) {
    return value as EnvConfig['NODE_ENV'];
  }
  throw new Error(`❌ NODE_ENV must be one of: ${valid.join(', ')}. Received: "${value}"`);
}

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`❌ PORT must be a valid number between 1 and 65535. Received: "${value}"`);
  }
  return port;
}

function validateSecret(key: string, value: string, minLength = 32): string {
  if (value.length < minLength) {
    throw new Error(
      `❌ "${key}" must be at least ${String(minLength)} characters long for security. ` +
        `Current length: ${String(value.length)}`,
    );
  }
  return value;
}

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

// Ejecutar validación y exportar config inmutable
function loadEnvConfig(): EnvConfig {
  return {
    NODE_ENV: parseNodeEnv(getEnvVar('NODE_ENV')),
    PORT: parsePort(getEnvVar('PORT')),
    ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173'),
    MONGODB_URI: getEnvVar('MONGODB_URI'),
    JWT_ACCESS_SECRET: validateSecret('JWT_ACCESS_SECRET', getEnvVar('JWT_ACCESS_SECRET')),
    JWT_REFRESH_SECRET: validateSecret('JWT_REFRESH_SECRET', getEnvVar('JWT_REFRESH_SECRET')),
    JWT_ACCESS_EXPIRES_IN: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    JWT_REFRESH_EXPIRES_IN: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
    COOKIE_SECRET: validateSecret('COOKIE_SECRET', getEnvVar('COOKIE_SECRET')),
    CLOUDINARY_CLOUD_NAME: getEnvVar('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: getEnvVar('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: getEnvVar('CLOUDINARY_API_SECRET'),
    CLOUDINARY_UPLOAD_FOLDER: process.env['CLOUDINARY_UPLOAD_FOLDER'] ?? 'nexusstock/products',
  };
}

export const envConfig: EnvConfig = loadEnvConfig();
