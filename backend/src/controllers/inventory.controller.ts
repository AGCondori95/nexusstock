import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '@/errors/http.errors.js';
import {
  CreateProductSchema,
  ProductQuerySchema,
  StockAdjustmentSchema,
  UpdateProductSchema,
} from '@/validators/product.validators.js';
import { inventoryService } from '@/services/inventory.service.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Controllers de inventario — delgados por diseño.
 * Responsabilidad única: parsear HTTP → llamar service → formatear respuesta.
 * Toda la lógica de negocio vive en inventoryService.
 */

function parseAndValidate<T>(
  schema: {
    safeParse: (
      data: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
  },
  data: unknown,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError('Validation failed', issues);
  }
  return result.data;
}

export const inventoryController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = parseAndValidate(CreateProductSchema, req.body);
      const product = await inventoryService.createProduct(input, req.user.sub);

      res
        .status(StatusCodes.CREATED)
        .json({ success: true, message: 'Product created successfully', data: { product } });
    } catch (error) {
      next(error);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const product = await inventoryService.getProduct(id);

      res.status(StatusCodes.OK).json({ success: true, data: { product } });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = parseAndValidate(ProductQuerySchema, req.query);
      const result = await inventoryService.listProducts(query);

      res
        .status(StatusCodes.OK)
        .json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params as { id: string };
      const input = parseAndValidate(UpdateProductSchema, req.body);
      const product = await inventoryService.updateProduct(id, input, req.user.sub);

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Product updated successfully', data: { product } });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params as { id: string };
      await inventoryService.deleteProduct(id, req.user.sub);

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Product discontinued successfully' });
    } catch (error) {
      next(error);
    }
  },

  async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params as { id: string };
      const input = parseAndValidate(StockAdjustmentSchema, req.body);
      const result = await inventoryService.adjustStock(id, input, req.user.sub);

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Stock adjusted successfully',
        data: { product: result.product, movement: result.movement },
      });
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const limit = Math.min(parseInt((req.query['limit'] as string | undefined) ?? '20', 10), 100);
      const cursor = req.query['corsor'] as string | undefined;
      const movements = await inventoryService.getStockHistory(id, limit, cursor);

      res.status(StatusCodes.OK).json({ success: true, data: { movements } });
    } catch (error) {
      next(error);
    }
  },
} as const;
