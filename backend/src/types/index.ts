import type { Document, Types } from 'mongoose';

// ─── HTTP & API Types ────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiStatus = 'success' | 'error' | 'fail';

/**
 * Envelope estándar para TODAS las respuestas de la API.
 * Patrón JSend (https://github.com/omniti-labs/jsend)
 */
export interface ApiResponse<T = unknown> {
  status: ApiStatus;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Environment Types ───────────────────────────────────────────────────────

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  apiPrefix: string;
  corsOrigins: string[];
}

// ─── Auth Types ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

// ─── Utility Types ───────────────────────────────────────────────────────────

/** Hace que todas las propiedades de T sean requeridas, recursivamente */
export type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K];
};

/** Extrae el tipo resuelto de una Promesa */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

// ─── Error Types ─────────────────────────────────────────────────────────────

export type HttpStatusCode = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

export interface AppErrorOptions {
  message: string;
  statusCode: HttpStatusCode;
  code: string;
  isOperational?: boolean;
  errors?: ValidationError[];
}

/**
 * Express Request extendido con campos de NexusStock.
 * Permite tipar req.user y req.requestId en todos los handlers.
 */
export interface NexusRequest {
  requestId: string;
  user?: JwtPayload;
}

// ─── User & Auth Document Types ──────────────────────────────────────────────

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): UserSafeDTO;
}

export type UserDocument = Document<Types.ObjectId> & IUser & IUserMethods;

/** DTO segure — nunca expone el campo password */
export interface UserSafeDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Auth Request/Response Types ─────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: UserSafeDTO;
  accessToken: string;
}
