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
  corsOrigin: string[];
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
