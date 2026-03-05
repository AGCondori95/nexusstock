/**
 * Interfaces de dominio para el módulo de media.
 * Desacopladas del SDK de Cloudinary para no filtrar
 * tipos de infraestructura al resto de la aplicación.
 */

export interface UploadedImage {
  readonly publicId: string; // Identificador único en Cloudinary (para delete)
  readonly secureUrl: string; // URL HTTPS de la imagen en CDN
  readonly width: number;
  readonly height: number;
  readonly format: string; // 'webp', 'jpg', etc.
  readonly bytes: number; // Tamaño en bytes tras transformación
  readonly originalFilename: string;
}

export interface UploadOptions {
  readonly folder: string;
  readonly publicIdPrefix?: string; // Prefijo para el nombre del archivo
  readonly maxWidth?: number; // Para el resize de transformación
  readonly maxHeight?: number;
  readonly quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco';
}

export interface DeleteImageResult {
  readonly publicId: string;
  readonly deleted: boolean;
}

// Tipos MIME permitidos para imágenes de productos
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_SIZE_LABEL = '5MB';
