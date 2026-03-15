import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '@middlewares/errorHandler.middleware';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5mb
const MAX_FILES = 5;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const isAllowedMimeType = (mimetype: string): mimetype is AllowedMimeType =>
  (ALLOWED_MIME_TYPES as readonly string[]).includes(mimetype);

/**
 * Multer configurado con almacenamiento en memoria (buffer).
 * Las imágenes nunca tocan el disco — van directo a Cloudinary via stream.
 */
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void => {
  if (isAllowedMimeType(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        `Invalid file type "${file.mimetype}". Allowed: JPEG, PNG, WEBP`,
        400,
        'INVALID_FILE_TYPE',
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

/**
 * Middleware para subir múltiples imágenes de producto.
 * Field name: "images" (hasta 5 archivos).
 */
export const uploadProductImages: RequestHandler = upload.array(
  'images',
  MAX_FILES,
) as unknown as RequestHandler;

/**
 * Middleware para subir una sola imagen.
 */
export const uploadSingleImage: RequestHandler = upload.single(
  'image',
) as unknown as RequestHandler;
