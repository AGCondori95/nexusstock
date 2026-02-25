import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { envConfig } from '@/config/env.config.js';
import { LoginSchema, RegisterSchema } from '@/validators/auth.validators.js';
import { UnauthorizedError, ValidationError } from '@/errors/http.errors.js';
import { authService } from '@/services/auth.service.js';

/**
 * Configuración de cookies compartida.
 * httpOnly: el JS del cliente NUNCA puede leer el token (XSS protection)
 * secure: solo HTTPS en producción
 * sameSite: 'strict' previene CSRF attacks
 */
function getAccessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: envConfig.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutos en ms
    path: '/',
  };
}

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: envConfig.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
    path: '/api/v1/auth/refresh', // Scope mínimo - solo el endpoint de refresh
  };
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('nexus_access', { path: '/' });
  res.clearCookie('nexus_refresh', { path: '/api/v1/auth/refresh' });
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validación con Zod - si falla, lanza ZodError que convertimos a ValidationError
      const parseResult = RegisterSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Registration input is invalid', issues);
      }

      const { user, tokens } = await authService.register(parseResult.data);

      // Establecer cookies httpOnly
      res.cookie('nexus_access', tokens.accessToken, getAccessCookieOptions());
      res.cookie('nexus_refresh', tokens.refreshToken, getRefreshCookieOptions());

      res
        .status(StatusCodes.CREATED)
        .json({ success: true, message: 'Account created successfully', data: { user } });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = LoginSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Login input is invalid', issues);
      }

      const { user, tokens } = await authService.login(parseResult.data);

      res.cookie('nexus_access', tokens.accessToken, getAccessCookieOptions());
      res.cookie('nexus_refresh', tokens.refreshToken, getRefreshCookieOptions());

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Login successful', data: { user } });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies['nexus_refresh'] as string | undefined;
      if (!refreshToken) {
        throw new UnauthorizedError('No refresh token provided');
      }

      const tokens = await authService.refresh(refreshToken);

      res.cookie('nexus_access', tokens.accessToken, getAccessCookieOptions());
      res.cookie('nexus_refresh', tokens.refreshToken, getRefreshCookieOptions());

      res.status(StatusCodes.OK).json({ success: true, message: 'Tokens refreshed successfully' });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies['nexus_refresh'] as string | undefined;

      if (req.user && refreshToken) {
        await authService.logout(req.user.sub, refreshToken);
      }

      clearAuthCookies(res);

      res.status(StatusCodes.OK).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      await authService.logoutAll(req.user.sub);
      clearAuthCookies(res);

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: 'All sessions terminated successfully' });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const { userRepository } = await import('../repositories/user.repository.js');
      const user = await userRepository.findById(req.user.sub);

      if (!user) throw new UnauthorizedError('User account no longer exists');

      res.status(StatusCodes.OK).json({ success: true, data: { user: user.toSafeObject() } });
    } catch (error) {
      next(error);
    }
  },
} as const;
