import 'dotenv/config';
import { env } from '@config/env';
import { createServer } from '@config/server';

async function bootstrap(): Promise<void> {
  const app = createServer();

  const server = app.listen(env.PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║  NexusStock API                      ║
  ║  http://localhost:${env.PORT}               ║
  ║  ENV: ${env.NODE_ENV.padEnd(28)}║
  ╚══════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = (): void => {
    console.log(`\n[Shutdown] Closing HTTP server...`);
    server.close(() => {
      console.log('[Shutdown] Done.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
