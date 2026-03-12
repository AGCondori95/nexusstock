import type { ApiResponse } from '@/types';
import type { Request, Response } from 'express';

/**
 * Handler para rutas no encontradas (404).
 * Debe registrarse DESPUÉS de todas las rutas definidas.
 */
export const notFoundMiddleware = (req: Request, res: Response): void => {
  const response: ApiResponse<null> = {
    status: 'fail',
    message: `Route not found: [${req.method}] ${req.originalUrl}`,
  };

  res.status(404).json(response);
};
