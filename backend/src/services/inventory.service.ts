import { ConflictError, NotFoundError, ValidationError } from '@/errors/http.errors.js';
import type { SafeProduct } from '@/models/Product.model.js';
import { productRepository } from '@/repositories/product.repository.js';
import type { PaginatedResult, ProductFilters, StockAdjustment } from '@/types/inventory.types.js';
import type {
  CreateProductInput,
  ProductQueryInput,
  StockAdjustmentInput,
  UpdateProductInput,
} from '@/validators/product.validators.js';
import mongoose from 'mongoose';

/**
 * Inventory Service — orquesta operaciones de inventario con transacciones ACID.
 *
 * REGLA DE ORO de las transacciones aquí:
 * 1. startSession() → startTransaction()
 * 2. try { ... operaciones ... commitTransaction() }
 * 3. catch { abortTransaction() → rethrow }
 * 4. finally { endSession() } ← SIEMPRE, incluso si hay error
 */

const OUTBOUND_TYPES = new Set(['sale', 'transfer']);

export const inventoryService = {
  async createProduct(input: CreateProductInput, createdBy: string): Promise<SafeProduct> {
    // Verificar SKU único antes de abrir transacción (optimización)
    const exists = await productRepository.existsBySku(input.sku);
    if (exists) {
      throw new ConflictError(`A product with SKU "${input.sku}" already exists`);
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const product = await productRepository.create(input, createdBy, session);

      // Si el stock inicial > 0, registrar movimiento de entrada inicial
      if (input.stock > 0) {
        const adjustment: StockAdjustment = {
          productId: (product._id as { toString(): string }).toString(),
          quantity: input.stock,
          movementType: 'adjustment',
          reason: 'Initial stock on product creation',
          performedBy: createdBy,
        };
        await productRepository.createMovement(adjustment, 0, input.stock, session);
      }

      await session.commitTransaction();
      return product.toSafeObject();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  },

  async getProduct(productId: string): Promise<SafeProduct> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID "${productId}" not found`);
    }
    return product.toSafeObject();
  },

  async listProducts(query: ProductQueryInput): Promise<PaginatedResult<SafeProduct>> {
    const filters: ProductFilters = {
      ...(query.search && { search: query.search }),
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.minStock !== undefined && { minStock: query.minStock }),
      ...(query.maxStock !== undefined && { maxStock: query.maxStock }),
      ...(query.minPrice !== undefined && { minPrice: query.minPrice }),
      ...(query.maxPrice !== undefined && { maxPrice: query.maxPrice }),
      ...(query.lowStockOnly !== undefined && { lowStockOnly: query.lowStockOnly }),
    };

    return productRepository.findPaginated(
      filters,
      query.limit,
      query.sortBy,
      query.sortOrder,
      query.cursor,
    );
  },

  async updateProduct(
    productId: string,
    input: UpdateProductInput,
    updatedBy: string,
  ): Promise<SafeProduct> {
    const product = await productRepository.update(productId, input, updatedBy);
    if (!product) {
      throw new NotFoundError(`Product with ID "${productId}" not found`);
    }
    return product.toSafeObject();
  },

  async deleteProduct(productId: string, deletedBy: string): Promise<void> {
    const product = await productRepository.softDelete(productId, deletedBy);
    if (!product) {
      throw new NotFoundError(`Product with ID "${productId}"`);
    }
  },

  /**
   * Ajuste atómico de stock con transacción ACID.
   *
   * Este es el método más crítico del sistema.
   * Garantías:
   * - El stock nunca queda en estado inconsistente
   * - El movimiento de auditoría siempre se crea con el producto actualizado
   * - Si cualquier operación falla, ambas se revierten (atomicidad)
   * - El stock nunca cae por debajo de 0 (constraint en atomicStockUpdate)
   */
  async adjustStock(
    productId: string,
    input: StockAdjustmentInput,
    performedBy: string,
  ): Promise<{ product: SafeProduct; movement: StockAdjustmentResult }> {
    // 1. Verificar que el producto existe ANTES de abrir la transacción
    const existingProduct = await productRepository.findById(productId);
    if (!existingProduct) {
      throw new NotFoundError(`Product with ID "${productId}" not found`);
    }

    const stockBefore = existingProduct.stock;
    const isOutbound = OUTBOUND_TYPES.has(input.movementType);

    // 2. Para salidas: validar stock disponible (pre-check, no garantía)
    if (isOutbound && existingProduct.getAvailableStock() < input.quantity) {
      throw new ValidationError(
        `Insufficient stock. Available: ${String(existingProduct.getAvailableStock())}, ` +
          `Requested: ${String(input.quantity)}`,
        {
          avilableStock: existingProduct.getAvailableStock(),
          requestedQuantity: input.quantity,
          reservedStock: existingProduct.reservedStock,
        },
      );
    }

    // 3. Calcular delta (positivo = entrada, negativo = salida)
    const delta = isOutbound ? -input.quantity : input.quantity;

    // 4. Abrir sesión y transacción
    const session = await mongoose.startSession();

    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' }, // Consistencia de lectura
        writeConcern: { w: 'majority' }, // Confirmación de mayoría de réplicas
      });

      // 5. Actualización atómica - si el stock resultante sería < 0, devuelve null
      const updatedProduct = await productRepository.atomicStockUpdate(productId, delta, session);

      if (!updatedProduct) {
        throw new ValidationError(
          'Stock update failed: concurrent modification detected or insufficient stock',
          { requestedDelta: delta, stockBefore },
        );
      }

      const stockAfter = updatedProduct.stock;

      // 6. Crear registro de auditoría en la MISMA transacción
      const adjustment: StockAdjustment = {
        productId,
        quantity: input.quantity,
        movementType: input.movementType,
        reason: input.reason,
        performedBy,
        ...(input.reference && { reference: input.reference }),
      };

      await productRepository.createMovement(adjustment, stockBefore, stockAfter, session);

      // 7. Commit - ambas operaciones se confirman juntas o ninguna
      await session.commitTransaction();

      return {
        product: updatedProduct.toSafeObject(),
        movement: { stockBefore, stockAfter, delta, movementType: input.movementType },
      };
    } catch (error) {
      // 8. Rollback - si cualquier paso falla, ningún cambio persiste
      await session.abortTransaction();
      throw error;
    } finally {
      // 9. SIEMPRE liberar la sesión
      await session.endSession();
    }
  },

  async getStockHistory(
    productId: string,
    limit = 20,
    cursor?: string,
  ): Promise<ReturnType<typeof productRepository.findMovementsByProduct>> {
    // Verificar que el producto existe
    const exists = await productRepository.findById(productId);
    if (!exists) {
      throw new NotFoundError(`Product with ID "${productId}" not found`);
    }
    return productRepository.findMovementsByProduct(productId, limit, cursor);
  },
} as const;

// Tipo auxiliar para el resultado del ajuste
interface StockAdjustmentResult {
  stockBefore: number;
  stockAfter: number;
  delta: number;
  movementType: string;
}
