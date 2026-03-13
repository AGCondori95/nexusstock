import { z } from 'zod';

const productCategories = [
  'electronics',
  'clothing',
  'food',
  'furniture',
  'tools',
  'other',
] as const;

export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(120, 'Name cannot exceed 120 characters')
      .trim(),
    description: z
      .string({ required_error: 'Description is required' })
      .max(1000, 'Description cannot exceed 1000 characters'),
    sku: z
      .string({ required_error: 'SKU is required' })
      .min(2, 'SKU must be at least 2 characters')
      .max(50, 'SKU cannot exceed 50 characters')
      .toUpperCase(),
    category: z.enum(productCategories, { required_error: 'Category is required' }),
    price: z.number({ required_error: 'Price is required' }).min(0, 'Price cannot be negative'),
    costPrice: z
      .number({ required_error: 'Cost price is required' })
      .min(0, 'Cost price cannot be negative'),
    stock: z.number().min(0, 'Stock cannot be negative').default(0),
    minStockLevel: z.number().min(0).default(10),
    images: z.array(z.string().url('Invalid image URL')).default([]),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Product ID is required') }),
  body: z.object({
    name: z.string().min(2).max(120).trim().optional(),
    description: z.string().max(1000).optional(),
    category: z.enum(productCategories).optional(),
    price: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    minStockLevel: z.number().min(0).optional(),
    images: z.array(z.string().url()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const adjustStockSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Product ID is required') }),
  body: z.object({
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer'),
    operation: z.enum(['increment', 'decrement', 'set'], {
      required_error: 'Operation is required',
    }),
    reason: z
      .string({ required_error: 'Reason is required' })
      .min(3, 'Reason must be at least 3 characters'),
  }),
});

export const productQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.enum(productCategories).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: z.coerce.boolean().optional(),
    search: z.string().trim().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type AdjustStockInput = z.infer<typeof adjustStockSchema>['body'];
export type ProductQueryInput = z.infer<typeof productQuerySchema>['query'];
