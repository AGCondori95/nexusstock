import type { MovementType } from '@/types/inventory.types.js';
import { type Document, model, Schema, type Types } from 'mongoose';

/**
 * Audit Log inmutable de movimientos de stock.
 *
 * Patrón: Append-Only Log — los movimientos NUNCA se editan ni eliminan.
 * Esto provee un trail de auditoría completo y permite reconstruir el
 * historial de stock en cualquier punto del tiempo.
 */

export interface IStockMovement {
  product: Types.ObjectId;
  movementType: MovementType;
  quantity: number; // Siempre positivo - la dirección la da movementType
  direction: 'in' | 'out'; // Calculado automáticamente
  stockBefore: number; // Snapshot del stock ANTES del movimiento
  stockAfter: number; // Snapshot del stock DESPUÉS del movimiento
  reason: string;
  reference: string | null; // Nro. orden, factura, PO, etc.
  performedBy: Types.ObjectId;
  createdAt: Date;
}

export type IStockMovementDocument = IStockMovement & Document;

const INBOUND_TYPES: MovementType[] = ['purchase', 'return', 'adjustment'];

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    movementType: {
      type: String,
      enum: ['purchase', 'sale', 'adjustment', 'return', 'transfer'] satisfies MovementType[],
      required: true,
    },
    quantity: { type: Number, required: true, min: [0.001, 'Quantity must be greater than 0'] },
    direction: { type: String, enum: ['in', 'out'], required: true },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    reason: {
      type: String,
      required: [true, 'Reason is required for stock movements'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    reference: { type: String, default: null, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Solo createdAt - inmutable
    versionKey: false,
  },
);

// Índices para consultas de historial y reportes
stockMovementSchema.index({ product: 1, createdAt: -1 }); // Historial por pproducto
stockMovementSchema.index({ performedBy: 1, createdAt: -1 }); // Auditoría por usuario
stockMovementSchema.index({ movementType: 1, createdAt: -1 }); // Reportes por tipo

// Pre-save hook: calcular direction automáticamente desde movementType
stockMovementSchema.pre('save', function (next): void {
  this.direction = INBOUND_TYPES.includes(this.movementType) ? 'in' : 'out';
  next();
});

export const StockMovement = model<IStockMovement>('StockMovement', stockMovementSchema);
