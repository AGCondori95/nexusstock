import { envConfig } from '@/config/env.config.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/errors/http.errors.js';
import { productRepository } from '@/repositories/product.repository.js';
import { cloudinaryService } from '@/services/cloudinary.service.js';
import { UpdateProductInput } from '@/validators/product.validators.js';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Media Controller — gestiona el ciclo de vida de imágenes de productos.
 *
 * Está separado de inventory.controller para respetar el Single Responsibility:
 * - inventory.controller: CRUD de datos de producto
 * - media.controller: gestión de assets binarios
 */

export const mediaController = {
  /**
   * Subir o reemplazar la imagen de un producto.
   * Si el producto ya tiene imagen, la reemplaza en Cloudinary + actualiza URL en DB.
   */
  async uploadProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const { id } = req.params as { id: string };

      // req.file garantizado por requireFile middleware (ya validado antes de llegar aquí)
      const file = req.file;
      if (!file) {
        throw new ValidationError('No image file provided');
      }

      // 1. Verificar que el producto existe
      const product = await productRepository.findById(id);
      if (!product) throw new NotFoundError(`Product with ID "${id}" not found`);

      // 2. Subir a Cloudinary (reemplaza la anterior si existe)
      const uploaded = await cloudinaryService.replace(
        file.buffer,
        file.originalname,
        product.imageUrl,
        {
          folder: envConfig.CLOUDINARY_UPLOAD_FOLDER,
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 'auto:good',
        },
      );

      // 3. Actualizar URL en MongoDB
      const updatedProduct = await productRepository.update(
        id,
        { imageUrl: uploaded.secureUrl } as UpdateProductInput,
        req.user.sub,
      );

      if (!updatedProduct) {
        // Situación excepcional: producto desapareció entre la verificación y el update
        // Intentar limpiar el asset recién subido (best-effort)
        void cloudinaryService.delete(uploaded.publicId);
        throw new NotFoundError(`Product "${id}" was not found during image update`);
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Product image uploaded successfully',
        data: {
          imageUrl: uploaded.secureUrl,
          image: {
            width: uploaded.width,
            height: uploaded.height,
            format: uploaded.format,
            sizeKb: Math.round(uploaded.bytes / 1024),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Eliminar la imagen de un producto.
   * Borra el asset en Cloudinary y pone imageUrl = null en MongoDB.
   */
  async deleteProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const { id } = req.params as { id: string };

      const product = await productRepository.findById(id);
      if (!product) throw new NotFoundError(`Product with ID "${id}" not found`);

      if (!product.imageUrl) {
        throw new ValidationError('This product does not have an image to delete');
      }

      // 1. Eliminar de Cloudinary (best-effort - no interrumpe si falla)
      await cloudinaryService.delete(product.imageUrl);

      // 2. Actualizar DB
      await productRepository.update(id, { imageUrl: null } as UpdateProductInput, req.user.sub);

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Product image deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
} as const;
