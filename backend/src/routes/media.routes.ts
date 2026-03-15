import { Router } from 'express';
import * as mediaController from '@controllers/media.controller';
import { protect, restrictTo } from '@middlewares/auth.middleware';
import { uploadProductImages, uploadSingleImage } from '@middlewares/upload.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.use(asyncHandler(protect));

// Upload de imágenes a un producto específico
router.post(
  '/products/:productId/images',
  restrictTo('admin', 'manager'),
  uploadProductImages,
  asyncHandler(mediaController.uploadProductImages),
);

// Eliminar imagen de un producto
router.delete(
  '/products/:productId/images',
  restrictTo('admin', 'manager'),
  asyncHandler(mediaController.removeProductImage),
);

// Upload genérico (sin asociar a producto)
router.post(
  '/upload',
  restrictTo('admin', 'manager'),
  uploadSingleImage,
  asyncHandler(mediaController.uploadGenericImages),
);

export default router;
