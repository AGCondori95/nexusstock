import streamifier from 'streamifier';
import { cloudinary } from '@config/cloudinary';
import { config } from '@config/env';
import { AppError } from '@middlewares/errorHandler.middleware';
import { Product } from '@models/product.model';
import type { CloudinaryUploadResult, ProductDTO } from '@/types';
import type { UploadApiResponse } from 'cloudinary';

// ── Tipos internos ────────────────────────────────────────────────────────────
interface DestroyApiResponse {
  result: string;
}

/**
 * Sube un buffer de imagen a Cloudinary usando streams.
 * Evita escribir archivos temporales al disco.
 */
const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
  filename: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(new AppError(error.message, 500, 'CLOUDINARY_ERROR'));
        if (!result) return reject(new AppError('Upload failed', 500, 'CLOUDINARY_ERROR'));
        resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const mapUploadResult = (result: UploadApiResponse): CloudinaryUploadResult => ({
  publicId: result.public_id,
  url: result.url,
  secureUrl: result.secure_url,
  width: result.width,
  height: result.height,
  format: result.format,
  bytes: result.bytes,
});

/**
 * Sube múltiples imágenes a Cloudinary en paralelo.
 */
export const uploadImages = async (
  files: Express.Multer.File[],
  subfolder?: string,
): Promise<CloudinaryUploadResult[]> => {
  if (files.length === 0) {
    throw AppError.badRequest('No files provided for upload.');
  }

  const folder = subfolder ? `${config.cloudinary.folder}/${subfolder}` : config.cloudinary.folder;

  const uploadPromises = files.map((file) => {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    return uploadBufferToCloudinary(file.buffer, folder, filename);
  });

  const results = await Promise.all(uploadPromises);
  return results.map(mapUploadResult);
};

/**
 * Elimina una imagen de Cloudinary por su public_id.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  const result = (await cloudinary.uploader.destroy(publicId)) as DestroyApiResponse;

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new AppError(`Failed to delete image: ${publicId}`, 500, 'CLOUDINARY_DELETE_ERROR');
  }
};

/**
 * Agrega imágenes a un producto existente.
 * Sube a Cloudinary y actualiza el array images en MongoDB.
 */
export const addProductImages = async (
  productId: string,
  files: Express.Multer.File[],
): Promise<ProductDTO> => {
  const product = await Product.findById(productId);
  if (!product) throw AppError.notFound('Product');

  const uploaded = await uploadImages(files, `products/${productId}`);
  const newUrls = uploaded.map((r) => r.secureUrl);

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $push: { images: { $each: newUrls } } },
    { new: true, runValidators: true },
  );

  if (!updated) throw AppError.notFound('Product');
  return updated.toDTO();
};

/**
 * Elimina una imagen específica de un producto.
 */
export const removeProductImage = async (
  productId: string,
  imageUrl: string,
): Promise<ProductDTO> => {
  const product = await Product.findById(productId);
  if (!product) throw AppError.notFound('Product');

  if (!product.images.includes(imageUrl)) {
    throw AppError.badRequest('Image URL not found in this product.');
  }

  // Extraer public_id de la URL de Cloudinary
  const publicId = imageUrl
    .split('/')
    .slice(-2)
    .join('/')
    .replace(/\.[^/.]+$/, '');

  await deleteImage(publicId);

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $pull: { images: imageUrl } },
    { new: true },
  );

  if (!updated) throw AppError.notFound('Product');
  return updated.toDTO();
};
