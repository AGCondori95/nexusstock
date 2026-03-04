/**
 * Interfaces de dominio para el módulo de inventario.
 *
 * Separamos los tipos de dominio de los tipos de Mongoose (IProductDocument)
 * para que la lógica de negocio no dependa del ODM.
 * Patrón: Anti-Corruption Layer — el dominio no conoce la infraestructura.
 */

export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type MovementType =
  | 'purchase' // Entrada por compra a proveedor
  | 'sale' // Salida por venta
  | 'adjustment' // Ajuste manual (inventario físico)
  | 'return' // Devolución de cliente
  | 'transfer'; // Transferencia entre almacenes

export interface StockAdjustment {
  readonly productId: string;
  readonly quantity: number; // Positivo = entrada, Negativo = salida
  readonly movementType: MovementType;
  readonly reason: string;
  readonly performedBy: string; // userId del operador
  readonly reference?: string; // Nro. de orden, factura, etc.
}

export interface PaginationCursor {
  readonly limit: number;
  readonly cursor?: string; // _id del último documento visto
  readonly direction: 'next' | 'prev';
}

export interface PaginatedResult<T> {
  readonly data: T[];
  readonly pagination: {
    readonly total: number;
    readonly limit: number;
    readonly hasNextPage: boolean;
    readonly nextCursor: string | null;
    readonly hasPrevPage: boolean;
    readonly prevCursor: string | null;
  };
}

export interface ProductFilters {
  readonly search?: string; // Búsqueda en nombre, SKU, descripción
  readonly category?: string;
  readonly status?: ProductStatus;
  readonly minStock?: number;
  readonly maxStock?: number;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly lowStockOnly?: boolean; // Stock <= reorderPoint
}
