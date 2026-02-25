import { authController } from '@/controllers/auth.controller.js';
import { authenticate } from '@/middlewares/authenticate.middleware.js';
import { NextFunction, Request, RequestHandler, Response, Router } from 'express';

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const h =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch((err: unknown) => {
      next(err);
    });
  };

// ── Public routes ─────────────────────────────────────────────────────────────
router.post('/register', h(authController.register.bind(authController)));
router.post('/login', h(authController.login.bind(authController)));
router.post('/refresh', h(authController.refresh.bind(authController)));

// ── Protected routes ──────────────────────────────────────────────────────────
router.post('/logout', authenticate, h(authController.logout.bind(authController)));
router.post('/logout-all', authenticate, h(authController.logoutAll.bind(authController)));
router.get('/me', authenticate, h(authController.me.bind(authController)));

export default router;
