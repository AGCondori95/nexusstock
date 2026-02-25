/**
 * Contratos de tipo para JWT.
 * Usamos interfaces explícitas en lugar de depender de los tipos genéricos
 * de jsonwebtoken para tener control total sobre el shape del payload.
 */

export interface AccessTokenPayload {
  readonly sub: string; // Subject: User._id como string
  readonly email: string;
  readonly role: UserRole;
  readonly type: 'access'; // Discriminator - previene usar refresh como antes
}

export interface RefreshTokenPayload {
  readonly sub: string;
  readonly tokenFamily: string; // UUID de la familia - para detección de reutilización
  readonly type: 'refresh';
}

export type UserRole = 'admin' | 'manager' | 'viewer';

// Union para el verify tipado
export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;
