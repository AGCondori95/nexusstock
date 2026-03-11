import { createApp } from './app';

const PORT = Number(process.env['PORT'] ?? 3001);

const bootstrap = (): void => {
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.info(`
╔══════════════════════════════════════════╗
║     🚀 NexusStock API — RUNNING          ║
╠══════════════════════════════════════════╣
║  Environment : ${(process.env['NODE_ENV'] ?? 'development').padEnd(25)}║
║  Port        : ${String(PORT).padEnd(25)}║
║  Health      : http://localhost:${String(PORT)}/health  ║
╚══════════════════════════════════════════╝
    `);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string): void => {
    console.info(`\n[Server] ${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.info('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
};

bootstrap();
