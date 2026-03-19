import type { ApiError } from '../types/api.types';
import type { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(body);
}
