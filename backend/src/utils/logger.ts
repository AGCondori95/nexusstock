import type { NodeEnv } from '@/types';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

const formatEntry = (entry: LogEntry): string => {
  const { level, message, timestamp, ...meta } = entry;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

const createLogger = (env: NodeEnv): Logger => {
  const isDev = env === 'development';

  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    const output = isDev ? formatEntry(entry) : JSON.stringify(entry);

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.info(output);
    }
  };

  return {
    info: (message: string, meta?: Record<string, unknown>): void => log('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>): void => log('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>): void => log('error', message, meta),
    debug: (message: string, meta?: Record<string, unknown>): void => {
      if (isDev) log('debug', message, meta);
    },
  };
};

export const logger = createLogger(process.env['NODE_ENV'] as NodeEnv) ?? 'development';
