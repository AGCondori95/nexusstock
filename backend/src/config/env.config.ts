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

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

// Ejecutar validación y exportar config inmutable
function loadEnvConfig(): EnvConfig {
  return {
    NODE_ENV: parseNodeEnv(getEnvVar('NODE_ENV')),
    PORT: parsePort(getEnvVar('PORT')),
    ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173'),
  };
}

export const envConfig: EnvConfig = loadEnvConfig();
