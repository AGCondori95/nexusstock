import { envConfig } from '@/config/env.config.js';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Inicialización del SDK de Cloudinary.
 *
 * Cloudinary SDK es un singleton — basta con configurarlo una vez
 * y todas las importaciones de `v2` en la app compartirán esta config.
 * Llamar a esta función en el bootstrap (index.ts) garantiza que
 * las credenciales estén validadas antes de aceptar requests.
 */
export function initCloudinary(): void {
  cloudinary.config({
    cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
    api_key: envConfig.CLOUDINARY_API_KEY,
    api_secret: envConfig.CLOUDINARY_API_SECRET,
    secure: true, // Forzar HTTPS en todas las URLs generadas
  });

  console.log(`☁️ Cloudinary initialized → cloud: "${envConfig.CLOUDINARY_CLOUD_NAME}"`);
}

// Re-exportar la instancia configurada para uso en services
export { cloudinary };
