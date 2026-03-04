import type { ProductStatus } from '@/types/inventory.types.js';
import { type Document, model, type Model, Schema, type Types } from 'mongoose';

export interface IProduct {
  sku: string;
  name: string;
  description: string;
  category: string;
  status: ProductStatus;
  // ── Pricing ──────────────────────────────────────────────────────────────
  costPrice: number; // Precio de costo (compra)
  sellingPrice: number; // Precio de venta
  currency: string; // ISO 4217: 'USD', 'EUR', etc.
  // ── Stock ─────────────────────────────────────────────────────────────────
  stock: number; // Unidades disponibles actuales
  reservedStock: number; // Unidades reservadas (órdenes pendientes)
  reorderPoint: number; // Umbral para alerta de reabastecimiento
  maxStock: number; // Capacidad máxima de almacenamiento
  unit: string; // 'units', 'kg', 'liters', etc.
  // ── Media ─────────────────────────────────────────────────────────────────
  imageUrl: string | null; // Cloudinary URL
  // ── Metadata ──────────────────────────────────────────────────────────────
  supplier: string | null;
  location: string | null; // Ubicación física en almacén (ej: "A-12-3")
  tags: string[];
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IProductMethods {
  isLowStock(): boolean;
  getAvailableStock(): number;
  toSafeObject(): SafeProduct;
}

export interface SafeProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  status: ProductStatus;
  costPrice: number;
  sellingPrice: number;
  currency: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  maxStock: number;
  unit: string;
  imageUrl: string | null;
  supplier: string | null;
  location: string | null;
  tags: string[];
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IProductDocument = IProduct & IProductMethods & Document;
type ProductModel = Model<IProduct, Record<string, never>, IProductMethods>;

// ── Schema ────────────────────────────────────────────────────────────────────

const productSchema = new Schema<IProduct, ProductModel, IProductMethods>(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{3,20}$/, 'SKU must be 3-20 alphanumeric characters or hyphens'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'] satisfies ProductStatus[],
      default: 'active',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code'],
    },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
    reservedStock: { type: Number, default: 0, min: [0, 'Reserved stock cannot be negative'] },
    reorderPoint: { type: Number, default: 10, min: [0, 'Reorder point cannot be negative'] },
    maxStock: {
      type: Number,
      required: [true, 'Max stock is required'],
      min: [1, 'Max stock must be at lest 1'],
    },
    unit: {
      type: String,
      default: 'units',
      trim: true,
      maxlength: [20, 'Unit cannot exceed 20 characters'],
    },
    imageUrl: { type: String, default: null },
    supplier: { type: String, default: null, trim: true },
    location: { type: String, default: null, trim: true },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]): boolean => tags.length <= 20,
        message: 'Cannot have more than 20 tags',
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    versionKey: '__v', // Habilitamos __v para Optimistics Locking
  },
);

// ── Índices ───────────────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', sku: 'text' }); // Full-text search
productSchema.index({ category: 1, status: 1 }); // Filtros comunes
productSchema.index({ stock: 1, reorderPoint: 1 }); // Alertas de stock
productSchema.index({ sellingPrice: 1 }); // Ordenamiento por precio
productSchema.index({ tags: 1 }); // Búsqueda por tags

// ── Instance Methods ──────────────────────────────────────────────────────────
productSchema.method('isLowStock', function (): boolean {
  return this.stock <= this.reorderPoint;
});

productSchema.method('getAvailableStock', function (): number {
  return Math.max(0, this.stock - this.reservedStock);
});

productSchema.method('toSafeObject', function (): SafeProduct {
  return {
    id: (this._id as { toString(): string }).toString(),
    sku: this.sku,
    name: this.name,
    description: this.description,
    category: this.category,
    status: this.status,
    costPrice: this.costPrice,
    sellingPrice: this.sellingPrice,
    currency: this.currency,
    stock: this.stock,
    reservedStock: this.reservedStock,
    availableStock: this.getAvailableStock(),
    reorderPoint: this.reorderPoint,
    maxStock: this.maxStock,
    unit: this.unit,
    imageUrl: this.imageUrl,
    supplier: this.supplier,
    location: this.location,
    tags: this.tags,
    isLowStock: this.isLowStock(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

export const Product = model<IProduct, ProductModel>('Product', productSchema);
