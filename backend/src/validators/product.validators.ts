import { z } from 'zod';

/**
 * Schemas Zod compuestos para el módulo de inventario.
 * Usamos z.object().partial() y z.object().pick() para derivar
 * schemas de update desde el schema de creación — DRY principle.
 */

const SkuSchema = z
  .string({ required_error: 'SKU is required' })
  .min(3, 'SKU must be at least 3 characters')
  .max(20, 'SKU cannot exceed 20 characters')
  .regex(/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens')
  .toUpperCase();

const PriceSchema = (fieldName: string): z.ZodNumber =>
  z
    .number({ required_error: `${fieldName} is required` })
    .min(0, `${fieldName} cannot be negative`)
    .multipleOf(0.01, `${fieldName} must have at most 2 decimal places`);

const BaseProductObject = z.object({
  sku: SkuSchema,
  name: z.string({ required_error: 'Name is required' }).min(2).max(200).trim(),
  description: z.string().max(2000).trim().default(''),
  category: z.string({ required_error: 'Category is required' }).min(1).max(100).trim(),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  costPrice: PriceSchema('Cost price'),
  sellingPrice: PriceSchema('Selling price'),
  currency: z.string().length(3).toUpperCase().default('USD'),
  stock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(10),
  maxStock: z.number({ required_error: 'Max stock is required' }).min(1),
  unit: z.string().max(20).default('units'),
  supplier: z.string().max(200).trim().nullable().default(null),
  location: z.string().max(100).trim().nullable().default(null),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export const CreateProductSchema = BaseProductObject.refine(
  (data): boolean => data.sellingPrice >= data.costPrice,
  {
    message: 'Selling price must be greater than or equal to cost price',
    path: ['sellingPrice'],
  },
).refine((data): boolean => data.maxStock >= data.stock, {
  message: 'Max stock must be greater than or equal to current stock',
  path: ['maxStock'],
});

// Update: todos los campos opcionales excepto las refinements siguen aplicando
export const UpdateProductSchema = BaseProductObject.omit({ sku: true })
  .partial()
  .refine(
    (data): boolean => {
      if (data.sellingPrice !== undefined && data.costPrice !== undefined) {
        return data.sellingPrice >= data.costPrice;
      }
      return true;
    },
    {
      message: 'Selling price must be greater than or equal to cost price',
      path: ['sellingPrice'],
    },
  );

export const StockAdjustmentSchema = z.object({
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity must be positive')
    .multipleOf(0.001, 'Quantity supports up to 3 decimal places'),
  movementType: z.enum(['purchase', 'sale', 'adjustment', 'return', 'transfer']),
  reason: z
    .string({ required_error: 'Reason is required' })
    .min(3, 'Reason must be at least 3 characters')
    .max(500)
    .trim(),
  reference: z.string().max(100).trim().nullable().optional(),
});

// Schema para query params de listado
export const ProductQuerySchema = z.object({
  search: z.string().max(100).trim().optional(),
  category: z.string().max(100).trim().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  minStock: z.coerce.number().min(0).optional(),
  maxStock: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  lowStockOnly: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortBy: z.enum(['name', 'sku', 'stock', 'sellingPrice', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
