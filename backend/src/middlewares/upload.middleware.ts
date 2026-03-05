import { ValidationError } from '@/errors/http.errors.js';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_LABEL,
} from '@/types/media.types.js';
import type { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

/**
 * Configuración de Multer para upload de imágenes.
 *
 * Usamos memoryStorage (buffer en RAM) en lugar de diskStorage:
 * - No crea archivos temporales en el servidor
 * - El buffer se pasa directamente al stream de Cloudinary
 * - Más seguro en entornos serverless o con discos efímeros (Docker)
 *
 * Límite práctico: 5MB en RAM por request es seguro con concurrencia normal.
 * Para archivos mayores, considerar streaming directo a Cloudinary.
 */

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  const allowedTypes: readonly string[] = ALLOWED_IMAGE_MIME_TYPES;

  if (allowedTypes.includes(file.mimetype)) {
    callback(null, true); // Aceptar
  } else {
    callback(
      new ValidationError(
        `File type "${file.mimetype}" is not allowed. ` +
          `Accepted types: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
      ) as unknown as null,
      false,
    );
  }
}

// Instancia de multer configurada para imágenes de productos
const multerUploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1, // Un archivo por request
    fields: 10, // Máximo de campos no-file (por seguridad)
  },
  fileFilter: imageFileFilter,
});

/**
 * Middleware de upload para un solo archivo de imagen.
 * El campo del form-data debe llamarse "image".
 *
 * Errores que maneja automáticamente:
 * - LIMIT_FILE_SIZE → 413 (tamaño excede límite)
 * - LIMIT_UNEXPECTED_FILE → 400 (campo con nombre incorrecto)
 */
export const uploadImageMiddleware = multerUploader.single('image');

/**
 * Middleware que valida que req.file exista después del upload.
 * Se usa como segundo middleware en la cadena:
 * router.post('/image', uploadImageMiddleware, requireFile, handler)
 */
export function requireFile(req: Request, _res: unknown, next: (error?: unknown) => void): void {
  if (!req.file) {
    next(
      new ValidationError(
        `No image file provided. ` +
          `Send a multipart/form-data request with an "image" field. ` +
          `Max size: ${MAX_IMAGE_SIZE_LABEL}`,
      ),
    );
    return;
  }
  next();
}
