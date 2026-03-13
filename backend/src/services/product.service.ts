import { Product } from '@models/product.model';
import { AppError } from '@middlewares/errorHandler.middleware';
import type { PaginatedProducts, ProductDTO, ProductQueryParams, StockAdjustment } from '@/types';
import type { CreateProductInput, UpdateProductInput } from '@/validations/product.validation';
import mongoose from 'mongoose';

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildFilterQuery = (filters: ProductQueryParams): Record<string, unknown> => {
  const query: Record<string, unknown> = { isActive: true };

  if (filters.category) query['category'] = filters.category;
  if (filters.inStock === true) query['stock'] = { $gt: 0 };
  if (filters.inStock === false) query['stock'] = 0;
  if (filters.search) {
    query['$text'] = { $search: filters.search };
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceFilter: Record<string, number> = {};
    if (filters.minPrice !== undefined) priceFilter['$gte'] = filters.minPrice;
    if (filters.maxPrice !== undefined) priceFilter['$lte'] = filters.maxPrice;
    query['price'] = priceFilter;
  }

  return query;
};

// ── Service Functions ─────────────────────────────────────────────────────────

export const getAllProducts = async (params: ProductQueryParams): Promise<PaginatedProducts> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
  const sortBy = params.sortBy ?? 'createdAt';

  const filterQuery = buildFilterQuery(params);

  const [products, totalItems] = await Promise.all([
    Product.find(filterQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: false }),
    Product.countDocuments(filterQuery),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  // Mapear manualmente ya que .lean() no incluye métodos de instancia
  const productDTOs: ProductDTO[] = products.map((p) => {
    const stock = p.stock;
    const minLevel = p.minStockLevel;
    const stockStatus = stock === 0 ? 'out_of_stock' : stock <= minLevel ? 'low_stock' : 'in_stock';

    return {
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      description: p.description,
      sku: p.sku,
      category: p.category,
      price: p.price,
      costPrice: p.costPrice,
      stock,
      minStockLevel: minLevel,
      stockStatus,
      images: p.images,
      isActive: p.isActive,
      createdBy: p.createdBy.toString(),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return {
    products: productDTOs,
    meta: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const getProductById = async (id: string): Promise<ProductDTO> => {
  const product = await Product.findById(id);
  if (!product) throw AppError.notFound('Product');
  return product.toDTO();
};

export const getProductBySlug = async (slug: string): Promise<ProductDTO> => {
  const product = await Product.findOne({ slug, isActive: true });
  if (!product) throw AppError.notFound('Product');
  return product.toDTO();
};

export const createProduct = async (
  input: CreateProductInput,
  userId: string,
): Promise<ProductDTO> => {
  const existing = await Product.findOne({ sku: input.sku.toUpperCase() });
  if (existing) throw AppError.conflict(`SKU "${input.sku}" already exists.`);

  const product = await Product.create({ ...input, createdBy: userId });
  return product.toDTO();
};

export const updateProduct = async (id: string, input: UpdateProductInput): Promise<ProductDTO> => {
  const product = await Product.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!product) throw AppError.notFound('Product');
  return product.toDTO();
};

export const deleteProduct = async (id: string): Promise<void> => {
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
  if (!product) throw AppError.notFound('Product');
};

/**
 * Ajuste atómico de stock con transacción Mongoose.
 * Garantiza consistencia ante operaciones concurrentes.
 */
export const adjustStock = async (adjustment: StockAdjustment): Promise<ProductDTO> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { productId, quantity, operation } = adjustment;

    let updateOp: Record<string, unknown>;

    if (operation === 'increment') {
      updateOp = { $inc: { stock: quantity } };
    } else if (operation === 'decrement') {
      // Verificar stock suficiente antes de decrementar
      const current = await Product.findById(productId).session(session);
      if (!current) throw AppError.notFound('Product');
      if (current.stock < quantity) {
        throw AppError.badRequest(
          `Insufficient stock. Available: ${current.stock}, Requested: ${quantity}`,
        );
      }
      updateOp = { $inc: { stock: -quantity } };
    } else {
      if (quantity < 0) throw AppError.badRequest('Stock value cannot be negative');
      updateOp = { $set: { stock: quantity } };
    }

    const product = await Product.findByIdAndUpdate(productId, updateOp, {
      new: true,
      runValidators: true,
      session,
    });

    if (!product) throw AppError.notFound('Product');

    await session.commitTransaction();
    return product.toDTO();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
