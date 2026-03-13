import { validateRequest } from '@/middlewares/validateRequest.middleware';
import { loginSchema, registerSchema } from '@/validations/auth.validation';
import { Router } from 'express';
import * as authController from '@controllers/auth.controller';
import { protect } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

router.post('/register', validateRequest(registerSchema), asyncHandler(authController.register));
router.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));
router.post('/logout', authController.logout);
router.get('/me', asyncHandler(protect), authController.getMe);

export default router;
