import { type ClientSession, type FilterQuery, type SortOrder } from 'mongoose';
import { type IProductDocument, Product, type SafeProduct } from '@/models/Product.model.js';
import { StockMovement } from '@/models/StockMovement.model.js';
import type { PaginatedResult, ProductFilters, StockAdjustment } from '@/types/inventory.types.js';
import type { CreateProductInput, UpdateProductInput } from '@/validators/product.validators.js';

/**
 * Product Repository — queries atómicas e inmutables.
 *
 * Regla crítica: los métodos que participan en transacciones
 * reciben `session` como parámetro opcional. Si se pasa, la operación
 * forma parte de la transacción del llamador. Si no, opera de forma
 * independiente (auto-commit).
 */

// ── Query Builder ─────────────────────────────────────────────────────────────

function buildFilterQuery(filters: ProductFilters): FilterQuery<IProductDocument> {
  const query: FilterQuery<IProductDocument> = {};

  if (filters.search) {
    // Usar índice de texto para búsqueda full-text
    query.$text = { $search: filters.search };
  }

  if (filters.category) {
    query.category = new RegExp(filters.category, 'i'); // Case-insensitive
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.minStock !== undefined || filters.maxStock !== undefined) {
    query.stock = {
      ...(filters.minStock !== undefined && { $gte: filters.minStock }),
      ...(filters.maxStock !== undefined && { $lte: filters.maxStock }),
    };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.sellingPrice = {
      ...(filters.minPrice !== undefined && { $gte: filters.minStock }),
      ...(filters.maxPrice !== undefined && { $lte: filters.maxStock }),
    };
  }

  // lowStockOnly: stock <= reorderPoint (comparación de dos campos del documento)
  if (filters.lowStockOnly === true) {
    query.$expr = { $lte: ['$stock', '$reorderPoint'] };
  }

  return query;
}

export const productRepository = {
  async findById(id: string, session?: ClientSession): Promise<IProductDocument | null> {
    return Product.findById(id)
      .session(session ?? null)
      .exec();
  },

  async findBySku(sku: string): Promise<IProductDocument | null> {
    return Product.findOne({ sku: sku.toUpperCase() }).exec();
  },

  async existsBySku(sku: string): Promise<boolean> {
    const count = await Product.countDocuments({ sku: sku.toUpperCase() }).exec();
    return count > 0;
  },

  async create(
    input: CreateProductInput,
    createdBy: string,
    session?: ClientSession,
  ): Promise<IProductDocument> {
    const [product] = await Product.create([{ ...input, createdBy, updatedBy: createdBy }], {
      session,
    });
    // create() con array devuelve array - el destructuring garantiza el tipo corrento
    if (!product) throw new Error('Failed to create product');
    return product;
  },

  async update(
    id: string,
    input: UpdateProductInput,
    updatedBy: string,
    session?: ClientSession,
  ): Promise<IProductDocument | null> {
    return Product.findByIdAndUpdate(
      id,
      { $set: { ...input, updatedBy } },
      {
        new: true, // Devolver document DESPUÉS del update
        runValidators: true, // Ejecutar validadores del schema en el update
        session: session ?? null,
      },
    ).exec();
  },

  async softDelete(id: string, updatedBy: string): Promise<IProductDocument | null> {
    // Soft delete: cambiar status a 'discontinued' en lugar de eliminar
    return Product.findByIdAndUpdate(
      id,
      { $set: { status: 'discontinued', updatedBy } },
      { new: true },
    ).exec();
  },

  /**
   * Operación atómica de ajuste de stock.
   *
   * Usa $inc para incrementar/decrementar de forma atómica.
   * La condición $gte: 0 previene stock negativo en una sola operación
   * sin necesidad de leer el documento primero (read-then-write race condition).
   *
   * @param delta - Positivo para entrada, negativo para salida
   * @returns El documento actualizado, o null si el stock resultante sería negativo
   */
  async atomicStockUpdate(
    productId: string,
    delta: number,
    session: ClientSession,
  ): Promise<IProductDocument | null> {
    const filter: FilterQuery<IProductDocument> = {
      _id: productId,
      // Guard: el resultado de stock + delta debe ser >= 0
      // Esta condición es evaluada ATÓMICAMENTE por MongoDB
      ...(delta < 0 && { stock: { $gte: Math.abs(delta) } }),
    };

    return Product.findOneAndUpdate(
      filter,
      {
        $inc: { stock: delta },
        $set: { updatedBy: productId }, // Se sobreescribirá con updatedBy real en el service
      },
      { new: true, runValidators: true, session },
    ).exec();
  },

  /**
   * Listado paginado con cursor-based pagination.
   * Más eficiente que skip/limit en colecciones grandes (O(1) vs O(n)).
   */
  async findPaginated(
    filters: ProductFilters,
    limit: number,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    cursor?: string,
  ): Promise<PaginatedResult<SafeProduct>> {
    const filterQuery = buildFilterQuery(filters);

    // Cursor pagination: buscar documentos DESPUÉS del cursor
    if (cursor) {
      const cursorOperator = sortOrder === 'asc' ? '$gt' : '$lt';
      filterQuery._id = { [cursorOperator]: cursor };
    }

    const sort: Record<string, SortOrder> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
      _id: sortOrder === 'asc' ? 1 : -1, // Secondary sort para estabilidad
    };

    // Fetching limit + 1 para saber si hay siguiente página
    const products = await Product.find(filterQuery)
      .sort(sort)
      .limit(limit + 1)
      .lean() // lean() devuelve POJOs en lugar de documentos Mongoose (más rápido)
      .exec();

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;

    // Total count en paralelo (sin bloquear la query principal)
    const total = await Product.countDocuments(buildFilterQuery(filters)).exec();

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasNextPage && lastItem ? (lastItem._id as { toString(): string }).toString() : null;

    // Para prevPage necesitamos el cursor del primer elemento
    const firstItem = items[0];
    const prevCursor =
      cursor && firstItem ? (firstItem._id as { toString(): string }).toString() : null;

    // Mapear documentos lean a SafeProduct manualmente (lean() pierde los métodos)
    const safeProducts: SafeProduct[] = items.map((p) => {
      const availableStock = Math.max(0, p.stock - p.reservedStock);
      return {
        id: (p._id as { toString(): string }).toString(),
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        status: p.status,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currency: p.currency,
        stock: p.stock,
        reservedStock: p.reservedStock,
        availableStock,
        reorderPoint: p.reorderPoint,
        maxStock: p.maxStock,
        unit: p.unit,
        imageUrl: p.imageUrl ?? null,
        supplier: p.supplier ?? null,
        location: p.location ?? null,
        tags: p.tags,
        isLowStock: p.stock <= p.reorderPoint,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      data: safeProducts,
      pagination: {
        total,
        limit,
        hasNextPage,
        nextCursor,
        hasPrevPage: cursor !== undefined,
        prevCursor,
      },
    };
  },

  async createMovement(
    adjustment: StockAdjustment,
    stockBefore: number,
    stockAfter: number,
    session: ClientSession,
  ): Promise<void> {
    const INBOUND: string[] = ['purchase', 'return', 'adjustment'];
    const isInbound = INBOUND.includes(adjustment.movementType);

    await StockMovement.create(
      [
        {
          product: adjustment.productId,
          movementType: adjustment.movementType,
          quantity: Math.abs(adjustment.quantity),
          direction: isInbound ? 'in' : 'out',
          stockBefore,
          stockAfter,
          reason: adjustment.reason,
          reference: adjustment.reference ?? null,
          performedBy: adjustment.performedBy,
        },
      ],
      { session },
    );
  },

  async findMovementsByProduct(
    productId: string,
    limit = 20,
    cursor?: string,
  ): Promise<IStockMovementDocument[]> {
    const query: FilterQuery<IStockMovementDocument> = { product: productId };
    if (cursor) {
      query._id = { $lt: cursor }; // Paginación inversa (más recientes primero)
    }

    return StockMovement.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'firstName lastName email')
      .exec() as Promise<IStockMovementDocument[]>;
  },
} as const;

// Importar tipo faltante para el return de findMovementsByProduct
import type { IStockMovementDocument } from '@/models/StockMovement.model.js';
