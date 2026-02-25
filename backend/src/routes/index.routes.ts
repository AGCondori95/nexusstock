import { type Request, type Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import authRouter from './auth.routes.js';

const router = Router();

/**
 * Health Check endpoint — requerido para orquestadores (Docker, K8s).
 * Responde con estado del servidor y metadata básica.
 * No requiere autenticación — es público intencionalmente.
 */
router.get('/health', (_req: Request, res: Response): void => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'nexusstock-backend',
      version: process.env['npm_package_version'] ?? '1.0.0',
      environment: process.env['NODE_ENV'],
      timestamp: new Date().toISOString(),
      uptime: `${String(Math.floor(process.uptime()))}s`,
    },
  });
});

/**
 * API info endpoint — documentación mínima embebida.
 */
router.get('/', (_req: Request, res: Response): void => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      name: 'NexusStock API',
      version: 'v1',
    },
  });
});

// Montar sub-routers
router.use('/auth', authRouter);

export default router;
