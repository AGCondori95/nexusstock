import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AccessTokenPayload, RefreshTokenPayload, UserRole } from '@/types/jwt.types.js';
import { envConfig } from '@/config/env.config.js';
import { ConflictError, UnauthorizedError } from '@/errors/http.errors.js';
import { SafeUser } from '@/models/User.model.js';
import { LoginInput, RegisterInput } from '@/validators/auth.validators.js';
import { userRepository } from '@/repositories/user.repository.js';

/**
 * AuthService — orquesta la lógica de autenticación.
 *
 * Responsabilidades:
 * - Hash y comparación de passwords con bcrypt
 * - Generación y verificación de JWT (access + refresh)
 * - Gestión del ciclo de vida de refresh tokens (rotation + revocation)
 *
 * NO interactúa con Express (req/res) — eso es responsabilidad del controller.
 */

const BCRYPT_ROUNDS = 12; // Costo computacional: ~250ms en hardware moderno

// ── Token Generation ─────────────────────────────────────────────────────────

function generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const fullPayload: AccessTokenPayload = { ...payload, type: 'access' };
  return jwt.sign(fullPayload, envConfig.JWT_ACCESS_SECRET, {
    expiresIn: envConfig.JWT_ACCESS_EXPIRES_IN,
    issuer: 'nexusstock-api',
    audience: 'nexusstock-client',
  });
}

function generateRefreshToken(
  sub: string,
  tokenFamily: string,
): { token: string; payload: RefreshTokenPayload } {
  const payload: RefreshTokenPayload = { sub, tokenFamily, type: 'refresh' };
  const token = jwt.sign(payload, envConfig.JWT_REFRESH_SECRET, {
    expiresIn: envConfig.JWT_REFRESH_EXPIRES_IN,
    issuer: 'nexusstock-api',
    audience: 'nexusstock-client',
  });
  return { token, payload };
}

function hashToken(token: string): string {
  // SHA-256 del token - almacenamos el hash, nunca el token en claro en DB
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshTokenExpiry(): Date {
  // Parsear "7d", "30d", etc. a una Date absoluta para guardar en DB
  const expiresIn = envConfig.JWT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN format: ${expiresIn}`);

  const amountStr = match[1];
  const unit = match[2];

  if (!amountStr || !unit) {
    throw new Error('Failed to parse JWT expiry components');
  }

  const multipliers: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

  const amount = parseInt(amountStr, 10);
  const multiplier = multipliers[unit] ?? 0;

  const ms = amount * multiplier;
  return new Date(Date.now() + ms);
}

// ── Token Verification ───────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, envConfig.JWT_ACCESS_SECRET, {
      issuer: 'nexusstock-api',
      audience: 'nexusstock-client',
    });

    const payload = decoded as Record<string, unknown>;

    if (payload['type'] !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload as unknown as AccessTokenPayload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, envConfig.JWT_REFRESH_SECRET, {
      issuer: 'nexusstock-api',
      audience: 'nexusstock-client',
    });

    const payload = decoded as Record<string, unknown>;

    if (payload['type'] !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload as unknown as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

// ── Auth Operations ──────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    // 1. Verificar que el email no esté en uso
    const exists = await userRepository.existsByEmail(input.email);
    if (exists) {
      throw new ConflictError('An account with this email already exists');
    }

    // 2. Hash del password con bcrypt (12 rounds ≈ 250ms - balance seguridad/UX)
    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // 3. Crear usuario en DB
    const user = await userRepository.create({
      email: input.email,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const userId = (user._id as { toString(): string }).toString();

    // 4. Generar token pair
    const tokens = await authService._generateAndStoreTokens(userId, user.email, user.role);

    return { user: user.toSafeObject(), tokens };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    // 1. Buscar usuario CON password (select: false requiere explícito)
    const user = await userRepository.findByEmailWithPassword(input.email);

    // Tiempo constante: siempre hacer la comparación aunque no exista el usuario
    // para prevenir timing attacks (user enumeration)
    const passwordToCompare = user?.password ?? '$2a$12$invalidhashfortimingreasons000';
    const isPasswordValid = await bcrypt.compare(input.password, passwordToCompare);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Contact support.');
    }

    const userId = (user._id as { toString(): string }).toString();

    // 2. Actualizar lastLoginAt en background (no awaitable - no bloquear respuesta)
    void userRepository.updateLastLogin(userId);

    // 3. Generar token pair
    const tokens = await authService._generateAndStoreTokens(userId, user.email, user.role);

    return { user: user.toSafeObject(), tokens };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // 1. Verificar JWT firmado
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    // 2. Buscar usuario y validar que el token esté en su lista
    const user = await userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedError('User not found');

    const storedToken = user.refreshTokens.find((t) => t.tokenHash === tokenHash);

    if (!storedToken) {
      /**
       * Token no encontrado en DB pero JWT es válido → REUSO DETECTADO.
       *
       * Refresh Token Rotation Security:
       * Si alguien está reutilizando un token antiguo (ya rotado), significa
       * que un atacante podría tener el token anterior. La acción segura es
       * revocar TODA la familia de tokens, forzando re-login completo.
       */
      await userRepository.removeRefreshTokenFamily(user.id as string, payload.tokenFamily);
      throw new UnauthorizedError(
        'Token reuse detected. All sessions have been revoked for security.',
      );
    }

    // 3. Verificar que no haya expirado en DB (doble check)
    if (storedToken.expiresAt < new Date()) {
      await userRepository.removeRefreshToken(user.id as string, tokenHash);
      throw new UnauthorizedError('Refresh token has expired. Please log in again.');
    }

    // 4. Revocar token usado (Rotation - cada refresh genera nuevos tokens)
    await userRepository.removeRefreshToken(user.id as string, tokenHash);

    // 5. Generar nuevo token pair con la MISMA familia
    return authService._generateAndStoreTokens(
      user.id as string,
      user.email,
      user.role,
      payload.tokenFamily, // Mantener familia para tracking
    );
  },

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await userRepository.removeRefreshToken(userId, tokenHash);
  },

  async logoutAll(userId: string): Promise<void> {
    await userRepository.removeAllRefreshTokens(userId);
  },

  /**
   * Método interno: genera tokens y los almacena en DB.
   * El prefijo _ es convención para "privado pero no enforceado por el lenguaje".
   */
  async _generateAndStoreTokens(
    userId: string,
    email: string,
    role: UserRole,
    existingFamily?: string,
  ): Promise<AuthTokens> {
    const family = existingFamily ?? crypto.randomUUID();

    const accessToken = generateAccessToken({ sub: userId, email, role });
    const { token: refreshToken } = generateRefreshToken(userId, family);

    await userRepository.addRefreshToken({
      userId,
      tokenHash: hashToken(refreshToken),
      family,
      expiresAt: getRefreshTokenExpiry(),
    });

    return { accessToken, refreshToken };
  },
} as const;
