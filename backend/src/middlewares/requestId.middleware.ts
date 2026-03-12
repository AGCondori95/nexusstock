import { v4 as uuidv4 } from 'uuid';
import type { NextFunction, Request, Response } from 'express';

/**
 * Asigna un UUID único a cada request entrante.
 * Lo expone en el header X-Request-ID para trazabilidad
 * en logs y debugging distribuido.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
