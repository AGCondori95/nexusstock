import { config } from '@/config/env';
import type { NextFunction, Request, Response } from 'express';
import * as authService from '@services/auth.service';
import type { ApiResponse, AuthResponseData, UserSafeDTO } from '@/types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: config.jwtCookieExpiresIn * 24 * 60 * 60 * 1000,
} as const;

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.registerUser(
      req.body as {
        name: string;
        email: string;
        password: string;
      },
    );

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS);

    const response: ApiResponse<AuthResponseData> = {
      status: 'success',
      message: 'Account created successfully.',
      data: result,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.loginUser(
      req.body as {
        email: string;
        password: string;
      },
    );

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS);

    const response: ApiResponse<AuthResponseData> = {
      status: 'success',
      message: 'Logged in successfully.',
      data: result,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('accessToken', COOKIE_OPTIONS);

  const response: ApiResponse<null> = {
    status: 'success',
    message: 'Logged out successfully.',
  };

  res.status(200).json(response);
};

export const getMe = (req: Request, res: Response): void => {
  const response: ApiResponse<{ user: UserSafeDTO }> = {
    status: 'success',
    message: 'User profile retrieved.',
    data: { user: req.user as unknown as UserSafeDTO },
  };

  res.status(200).json(response);
};
