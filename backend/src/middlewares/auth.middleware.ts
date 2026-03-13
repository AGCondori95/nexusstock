import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.middleware';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import type { JwtPayload, UserRole } from '@/types';
import { User } from '@/models/user.model';

// Tipo implícito para las cookies de NexusStock
interface NexusCookies {
  accessToken?: string;
}

/**
 * Verifica el JWT desde httpOnly cookie.
 * Adjunta el payload decodificado en req.user.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cookies = req.cookies as NexusCookies;
    const token = cookies.accessToken;

    if (!token) {
      return next(AppError.unauthorized('No token provided. Please log in.'));
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Verificar que el usuario aún existe y está activo
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(AppError.unauthorized('User no longer exists.'));
    }

    if (!user.isActive) {
      return next(AppError.forbidden('Your account has been deactivated.'));
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory de middleware RBAC.
 * Uso: restrictTo('admin', 'manager')
 */
export const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action.'));
    }

    next();
  };
};
