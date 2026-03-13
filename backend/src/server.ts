import { createApp } from './app';
import { config } from '@config/env';
import { logger } from '@utils/logger';
import { database } from './config/database';

const bootstrap = async (): Promise<void> => {
  // Conectar a MongoDB antes de levantar el servidor
  await database.connect();

  // La validación de config ocurre al importar — fail-fast garantizado
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('NexusStock API started', {
      environment: config.nodeEnv,
      port: config.port,
      apiPrefix: config.apiPrefix,
      health: `http://localhost:${config.port}/health`,
    });
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  const shutdown = (signal: string): void => {
    logger.warn(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });

    // Forzar cierre si tarda más de 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
};

void bootstrap();
