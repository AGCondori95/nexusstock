"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const env_1 = require("@config/env");
const server_1 = require("@config/server");
async function bootstrap() {
    const app = (0, server_1.createServer)();
    const server = app.listen(env_1.env.PORT, () => {
        console.log(`
  ╔══════════════════════════════════════╗
  ║  NexusStock API                      ║
  ║  http://localhost:${env_1.env.PORT}               ║
  ║  ENV: ${env_1.env.NODE_ENV.padEnd(28)}║
  ╚══════════════════════════════════════╝
    `);
    });
    // Graceful shutdown
    const shutdown = () => {
        console.log(`\n[Shutdown] Closing HTTP server...`);
        server.close(() => {
            console.log('[Shutdown] Done.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});
