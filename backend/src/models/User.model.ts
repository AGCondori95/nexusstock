import type { UserRole } from '@/types/jwt.types.js';
import { model, type Model, Schema, type Document } from 'mongoose';

/**
 * Patrón: Interface Segregation en Mongoose
 *
 * IUserDocument — shape de un documento Mongo (lo que leemos de la DB)
 * IUserMethods  — métodos de instancia del documento
 * UserModel     — tipo del modelo con statics tipados
 *
 * Separamos la interfaz pública (IUser) del documento Mongoose
 * para no exponer campos internos (refreshTokens, __v) fuera del modelo.
 */

export interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  refreshTokens: RefreshTokenEntry[];
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshTokenEntry {
  tokenHash: string; // Guardamos el hash, nunca el token claro
  family: string; // UUID de la familia para refresh token rotation
  expiresAt: Date;
  createdAt: Date;
}

// Métodos de instancia disponibles en cada documento User
interface IUserMethods {
  getFullName(): string;
  toSafeObject(): SafeUser;
}

// Shape seguro para enviar al cliente (sin password ni refreshTokens)
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type IUserDocument = IUser & IUserMethods & Document;
type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

// ── Schema Definition ────────────────────────────────────────────────────────

const refreshTokenEntrySchema = new Schema<RefreshTokenEntry>(
  {
    tokenHash: { type: String, required: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }, // No necesitamos _id para subdocumentos
);

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      // Regex RFC 5322 simplificada - Zod valida en la capa de entrada
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minLength: [8, 'Password must be at least 8 characters'],
      // select: false — el password NUNCA se devuelve en queries a menos
      // que se pida explícitamente con .select('+password')
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characteres'],
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'viewer'] satisfies UserRole[],
      default: 'viewer',
    },
    isActive: { type: Boolean, default: true },
    refreshTokens: {
      type: [refreshTokenEntrySchema],
      default: [],
      // Limitar tokens almacenados por usuario (máx. 5 sesiones simultáneas)
      validate: {
        validator: (tokens: RefreshTokenEntry[]): boolean => tokens.length <= 5,
        message: 'Maximum concurrent sessions (5) reached',
      },
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    versionKey: false, // Deshabilita __v - innecesario para nuestro caso
  },
);

// ── Índices ──────────────────────────────────────────────────────────────────
// El índice de email ya se crea por unique: true
// Índice compuesto para búsqueda rápida de refresh tokens por familia
userSchema.index({ 'refreshTokens.family': 1 });

// ── Instance Methods ─────────────────────────────────────────────────────────
userSchema.method('getFullName', function (): string {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.method('toSafeObject', function (): SafeUser {
  return {
    id: (this._id as { toString(): string }).toString(),
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
});

export const User = model<IUser, UserModel>('User', userSchema);
