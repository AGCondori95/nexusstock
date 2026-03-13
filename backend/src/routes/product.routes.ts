import { Router } from 'express';
import * as productController from '@controllers/product.controller';
import { protect, restrictTo } from '@middlewares/auth.middleware';
import { validateRequest } from '@middlewares/validateRequest.middleware';
import { asyncHandler } from '@utils/asyncHandler';
import {
  adjustStockSchema,
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from '@validations/product.validation';

const router = Router();

// Todas las las rutas de producto requieren autenticación
router.use(asyncHandler(protect));

router
  .route('/')
  .get(validateRequest(productQuerySchema), asyncHandler(productController.getAllProducts))
  .post(
    restrictTo('admin', 'manager'),
    validateRequest(createProductSchema),
    asyncHandler(productController.createProduct),
  );

router
  .route('/:id')
  .get(asyncHandler(productController.getProductById))
  .patch(
    restrictTo('admin', 'manager'),
    validateRequest(updateProductSchema),
    asyncHandler(productController.updateProduct),
  )
  .delete(restrictTo('admin'), asyncHandler(productController.deleteProduct));

router.patch(
  '/:id/stock',
  restrictTo('admin', 'manager', 'operator'),
  validateRequest(adjustStockSchema),
  asyncHandler(productController.adjustStock),
);

export default router;
