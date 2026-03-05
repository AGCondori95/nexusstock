import { inventoryController } from '@/controllers/inventory.controller.js';
import { mediaController } from '@/controllers/media.controller.js';
import { authenticate, authorize } from '@/middlewares/authenticate.middleware.js';
import { requireFile, uploadImageMiddleware } from '@/middlewares/upload.middleware.js';
import { NextFunction, Request, RequestHandler, Response, Router } from 'express';

/**
 * Matriz de permisos por endpoint:
 *
 * GET    /products          → viewer, manager, admin  (consulta pública interna)
 * GET    /products/:id      → viewer, manager, admin
 * POST   /products          → manager, admin          (crear requiere permisos)
 * PATCH  /products/:id      → manager, admin
 * DELETE /products/:id      → admin                   (solo admins pueden discontinuar)
 * POST   /products/:id/stock→ manager, admin          (ajuste de stock)
 * GET    /products/:id/history → viewer, manager, admin
 */

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const h =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch((err: unknown) => {
      next(err);
    });
  };

// Todas las rutas de inventario requieren autenticación
router.use(authenticate);

// ── Listado y detalle ─────────────────────────────────────────────────────────
router.get('/', h(inventoryController.list.bind(inventoryController)));
router.get('/:id', h(inventoryController.getOne.bind(inventoryController)));
router.get('/:id/history', h(inventoryController.getHistory.bind(inventoryController)));

// ── Escritura (manager + admin) ───────────────────────────────────────────────
router.post(
  '/',
  authorize('manager', 'admin'),
  h(inventoryController.create.bind(inventoryController)),
);
router.patch(
  '/:id',
  authorize('manager', 'admin'),
  h(inventoryController.update.bind(inventoryController)),
);
router.post(
  '/:id/stock',
  authorize('manager', 'admin'),
  h(inventoryController.adjustStock.bind(inventoryController)),
);

// ── Media: imagen de producto ─────────────────────────────────────────────────
// Cadena de middlewares: autenticado → rol → parse multipart → validar file → handler
router.post(
  '/:id/image',
  authorize('manager', 'admin'),
  uploadImageMiddleware,
  requireFile,
  h(mediaController.uploadProductImage.bind(mediaController)),
);

router.delete(
  '/:id/image',
  authorize('manager', 'admin'),
  h(mediaController.deleteProductImage.bind(mediaController)),
);

// ── Operaciones destructivas (solo admin) ─────────────────────────────────────
router.delete('/:id', authorize('admin'), h(inventoryController.remove.bind(inventoryController)));

export default router;
