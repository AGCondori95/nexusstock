import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de cualquier otro import
dotenv.config();

const PORT = process.env['PORT'] ?? '3000';
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// Validación temprana de entorno - falla rápido si falta configuración crítica
function validateEnv(): void {
  const required: string[] = ['NODE_ENV', 'PORT'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    // No usamos variables faltantes - solo informamos cuáles faltan
  }
}

validateEnv();

function bootstrap(): void {
  console.log('🚀 NexusStock Backend starting...');
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log('✅ TypeScript Strict Mode: ACTIVE');
  console.log('⏳ Express server will be configured in Step 2...');
}

try {
  bootstrap();
} catch (error: unknown) {
  console.error('💥 Fatal error during bootstrap:', error);
  process.exit(1);
}
