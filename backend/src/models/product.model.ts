import type { Model } from 'mongoose';
import { model, Schema } from 'mongoose';
import slugify from 'slugify';
import type { IProduct, IProductMethods, ProductDocument, ProductDTO, StockStatus } from '@/types';

type ProductModel = Model<IProduct, Record<string, never>, IProductMethods>;

const productSchema = new Schema<IProduct, ProductModel, IProductMethods>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    slug: { type: String, unique: true, lowercase: true },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['electronics', 'clothing', 'food', 'furniture', 'tools', 'other'] satisfies string[],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock level cannot be negative'],
    },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  { timestamps: true, versionKey: false },
);

// ── Índices ───────────────────────────────────────────────────────────────────
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });

// ── Pre-save Hook: Slug automático ────────────────────────────────────────────
productSchema.pre('save', function (next): void {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// ── Métodos de instancia ──────────────────────────────────────────────────────
productSchema.methods['getStockStatus'] = function (): StockStatus {
  const stock = this.stock;
  const minLevel = this.minStockLevel;
  if (stock === 0) return 'out_of_stock';
  if (stock <= minLevel) return 'low_stock';
  return 'in_stock';
};

productSchema.methods['toDTO'] = function (): ProductDTO {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    description: this.description,
    sku: this.sku,
    category: this.category,
    price: this.price,
    costPrice: this.costPrice,
    stock: this.stock,
    minStockLevel: this.minStockLevel,
    stockStatus: (this as unknown as ProductDocument).getStockStatus(),
    images: this.images,
    isActive: this.isActive,
    createdBy: this.createdBy.toString(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Product = model<IProduct, ProductModel>('Product', productSchema);
