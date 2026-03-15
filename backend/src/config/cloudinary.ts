import { v2 as cloudinary } from 'cloudinary';
import { config } from '@config/env';
import { logger } from '@utils/logger';

/**
 * Inicializa y valida la conexión con Cloudinary.
 * Se llama una vez en el bootstrap del servidor.
 */
export const initCloudinary = (): void => {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });

  logger.info('Cloudinary initialized', {
    cloudName: config.cloudinary.cloudName,
    folder: config.cloudinary.folder,
  });
};

export { cloudinary };
