import { connectDatabase } from '@/config/database.js';
import { envConfig } from '@/config/env.config.js';
import { createApp } from '@/server.js';
import type { Server } from 'http';

/**
 * Bootstrap del servidor con Graceful Shutdown.
 *
 * Patrón: Graceful Shutdown — al recibir SIGTERM o SIGINT:
 *   1. Dejar de aceptar nuevas conexiones
 *   2. Esperar a que las conexiones activas terminen (timeout: 10s)
 *   3. Cerrar recursos (DB, caches) — se expandirá en Paso 3
 *   4. Salir con código 0 (éxito)
 *
 * Esto es crítico en producción con Docker/K8s para evitar
 * cortar requests en vuelo durante un rolling update.
 */

function setupGracefulShutdown(server: Server): void {
  const shutdown = (signal: string): void => {
    console.log(`\n🛑 Received ${signal}. Starting gracefully shutdown...`);

    server.close((err?: Error) => {
      if (err) {
        console.error('❌ Error during server close:', err);
        process.exit(1);
      }
      console.log('✅ HTTP server closed successfully.');
      process.exit(1);
    });

    // Forzar cierre después de 10 segundos si no termina solo
    setTimeout(() => {
      console.error('⏰ Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  // Capturar promesas rechazadas no manejadas - evitar chashes silenciosos
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('💥 UNCAUGHT PROMISE REJECTION:', reason);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    shutdown('uncaughtException');
  });
}

async function bootstrap(): Promise<void> {
  console.log('🚀 NexusStock Backend starting...');

  // 1. Conectar a MongoDB ANTES de aceptar requests
  await connectDatabase();

  // 2. Crear y levantar servidor Express
  const app = createApp();

  const server = app.listen(envConfig.PORT, () => {
    console.log(`\n✅ Server running   → http://localhost:${String(envConfig.PORT)}`);
    console.log(`📡 Health check     → http://localhost:${String(envConfig.PORT)}/api/v1/health`);
    console.log(`🔐 Auth endpoints   → http://localhost:${String(envConfig.PORT)}/api/v1/auth`);
    console.log(`🌍 Environment      → ${envConfig.NODE_ENV}\n`);
  });

  setupGracefulShutdown(server);
}

bootstrap().catch((error: unknown) => {
  console.error('💥 Fatal bootstrap error:', error);
  process.exit(1);
});
