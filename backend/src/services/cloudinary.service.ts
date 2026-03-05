import { cloudinary } from '@/config/cloudinary.config.js';
import { envConfig } from '@/config/env.config.js';
import { InternalServiceError } from '@/errors/http.errors.js';
import { DeleteImageResult, UploadedImage, UploadOptions } from '@/types/media.types.js';

/**
 * CloudinaryService — abstrae todas las operaciones con la API de Cloudinary.
 *
 * Patrón: Adapter — convierte la API del SDK externo a nuestra interfaz interna.
 * El resto de la app nunca importa el SDK directamente, solo este servicio.
 * Beneficio: si migramos a S3 o cualquier otro proveedor, solo cambia este archivo.
 */

/**
 * Extrae el public_id de una URL de Cloudinary.
 *
 * URL ejemplo:
 * https://res.cloudinary.com/demo/image/upload/v1234567890/nexusstock/products/abc123.webp
 * public_id resultante: nexusstock/products/abc123
 *
 * Necesario para eliminar imágenes por su ID sin guardarlo por separado.
 */
export function extractPublicId(cloudinaryUrl: string): string | null {
  try {
    const url = new URL(cloudinaryUrl);
    const pathParts = url.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');

    if (uploadIndex === -1) return null;

    // Buscamos la versión (v12345678). Si existe, el ID empieza después.
    // Si no existe, el ID empieza justo después de 'upload'.
    const nextPart = pathParts[uploadIndex + 1];
    const hasVersion = nextPart && /^v\d+/.test(nextPart);
    const startIndex = hasVersion ? uploadIndex + 2 : uploadIndex + 1;

    const afterUpload = pathParts.slice(startIndex);
    const fullPath = afterUpload.join('/');

    // Quitar la extensión (.jpg, .webp, etc)
    return fullPath.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
}

export const cloudinaryService = {
  /**
   * Sube un buffer de imagen a Cloudinary con transformaciones optimizadas.
   *
   * Usa upload_stream para evitar escribir archivos temporales al disco.
   * Las transformaciones se aplican en el servidor de Cloudinary:
   * - c_limit: resize proporcional sin recortar (no distorsiona)
   * - f_auto: selecciona el mejor formato (WebP en navegadores modernos)
   * - q_auto: compresión inteligente según el contenido de la imagen
   */
  async upload(
    buffer: Buffer,
    originalFilename: string,
    options?: Partial<UploadOptions>,
  ): Promise<UploadedImage> {
    const folder = options?.folder ?? envConfig.CLOUDINARY_UPLOAD_FOLDER;
    const maxWidth = options?.maxWidth ?? 1200;
    const maxHeight = options?.maxHeight ?? 1200;
    const quality = options?.quality ?? 'auto:good';

    return new Promise<UploadedImage>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          // Generar public_id único usando timestamp + random para evitar colisiones
          public_id: `${String(Date.now())}-${Math.random().toString(36).substring(2, 9)}`,
          resource_type: 'image',
          transformation: [
            {
              width: maxWidth,
              height: maxHeight, // Mantiene proporciones, no recorte
              crop: 'limit',
              quality,
              fetch_format: 'auto', // WebP en navegadores que lo soportan
            },
          ],
          // Mantener referencia al nombre original para auditoría
          context: { original_filename: originalFilename },
        },
        (error, result) => {
          if (error ?? !result) {
            reject(
              new InternalServiceError(
                `Cloudinary upload file: ${error?.message ?? 'Unknown error'}`,
              ),
            );
            return;
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            originalFilename,
          });
        },
      );

      // Escribir el buffer en el stream de subida
      uploadStream.end(buffer);
    });
  },

  /**
   * Elimina una imagen de Cloudinary por su public_id o URL.
   *
   * Best-effort: si falla, logueamos pero NO propagamos el error.
   * La eliminación de assets de media nunca debe bloquear operaciones de negocio.
   */
  async delete(publicIdOrUrl: string): Promise<DeleteImageResult> {
    // Detectar si es URL y extraer public_id
    const publicId = publicIdOrUrl.startsWith('http')
      ? extractPublicId(publicIdOrUrl)
      : publicIdOrUrl;

    if (!publicId) {
      console.warn(
        `⚠️ CloudinaryService.delete: could not extract public_id from "${publicIdOrUrl}"`,
      );
      return { publicId: publicIdOrUrl, deleted: false };
    }

    try {
      const result = (await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true, // Invalidar caché del CDN inmediatamente
      })) as { result: string };

      const deleted = result.result === 'ok';

      if (!deleted) {
        console.warn(
          `⚠️ CloudinaryService.delete: asset "${publicId}" result was "${String(result.result)}"`,
        );
      }

      return { publicId, deleted };
    } catch (error) {
      // Best-effort: solo logueamos, nunca propagamos
      console.error(
        `❌ CloudinaryService.delete failed for "${publicId}":`,
        error instanceof Error ? error.message : error,
      );
      return { publicId, deleted: false };
    }
  },

  /**
   * Reemplaza una imagen existente: sube la nueva, luego elimina la anterior.
   * La secuencia garantiza que si el upload falla, el asset anterior se preserva.
   */
  async replace(
    newBuffer: Buffer,
    originalFilename: string,
    oldImageUrl: string | null,
    options?: Partial<UploadOptions>,
  ): Promise<UploadedImage> {
    // 1. Subir nueva imagen (usando this)
    const uploaded = await this.upload(newBuffer, originalFilename, options);

    // 2. Eliminar anterior solo si existe
    if (oldImageUrl) {
      // Importante: No bloqueamos el flujo principal si el borrado falla,
      // pero usamos 'this' para llamar al método delete
      void this.delete(oldImageUrl).then((result) => {
        if (!result.deleted) {
          console.warn(`⚠️ Could not delete old image: ${oldImageUrl}`);
        }
      });
    }

    return uploaded;
  },
} as const;
