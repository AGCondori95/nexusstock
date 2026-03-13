import { config } from '@/config/env';
import { AppError } from '@/middlewares/errorHandler.middleware';
import { User } from '@/models/user.model';
import type { AuthResponseData, JwtPayload, LoginInput, RegisterInput, UserSafeDTO } from '@/types';
import jwt from 'jsonwebtoken';

/**
 * Genera un JWT firmado con el payload del usuario.
 */
const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
};

/**
 * Registra un nuevo usuario en el sistema.
 * El password es hasheado automáticamente por el pre-save hook.
 */
export const registerUser = async (input: RegisterInput): Promise<AuthResponseData> => {
  const existingUser = await User.findOne({ email: input.email });

  if (existingUser) {
    throw AppError.conflict('An account with this email already exists.');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    role: 'operator',
  });

  const safeUser: UserSafeDTO = user.toSafeObject();

  const accessToken = signToken({
    userId: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
  });

  return { user: safeUser, accessToken };
};

/**
 * Autentica un usuario con email y password.
 */
export const loginUser = async (input: LoginInput): Promise<AuthResponseData> => {
  // Traer el password explícitamente (está excluido por defecto con select: false)
  const user = await User.findOne({ email: input.email }).select('+password');

  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid credentials.');
  }

  const isPasswordValid = await user.comparePassword(input.password);

  if (!isPasswordValid) {
    throw AppError.unauthorized('Invalid credentials.');
  }

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  const safeUser: UserSafeDTO = user.toSafeObject();

  const accessToken = signToken({
    userId: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
  });

  return { user: safeUser, accessToken };
};
