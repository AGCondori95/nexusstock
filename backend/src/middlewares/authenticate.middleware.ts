import { ForbiddenError, UnauthorizedError } from '@/errors/http.errors.js';
import { verifyAccessToken } from '@/services/auth.service.js';
import type { UserRole } from '@/types/jwt.types.js';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware de autenticación — Guard para rutas protegidas.
 *
 * Lee el accessToken desde la cookie httpOnly 'nexus_access'.
 * Si el token es válido, adjunta el payload a req.user y llama next().
 * Si no, lanza UnauthorizedError que captura el globalErrorHandler.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies['nexus_access'] as string | undefined;

  if (!token) {
    next(new UnauthorizedError('No authentication token provided'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware de autorización por rol — se usa DESPUÉS de authenticate.
 *
 * Uso: router.get('/admin', authenticate, authorize('admin'), handler)
 * Uso múltiple: authorize('admin', 'manager')
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Role "${req.user.role}" is not authorized. Required: ${allowedRoles.join(' or ')}`,
        ),
      );
      return;
    }

    next();
  };
}
