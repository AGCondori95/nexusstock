import { User, type IUserDocument } from '@/models/User.model.js';

/**
 * Repository Pattern — aísla todas las queries de Mongoose.
 *
 * Reglas de este layer:
 * 1. Nunca lanza errores de negocio — devuelve null cuando no encuentra
 * 2. Nunca contiene lógica de negocio — solo operaciones CRUD
 * 3. Todos los métodos son async y tipados explícitamente
 */

export interface CreateUserDTO {
  email: string;
  password: string; // Ya hasheado antes de llegar aquí
  firstName: string;
  lastName: string;
  role?: 'admin' | 'manager' | 'viewer';
}

export interface AddRefreshTokenDTO {
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
}

export const userRepository = {
  /**
   * Busca por email SIN incluir password (uso general).
   */
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase() }).exec();
  },

  /**
   * Busca por email INCLUYENDO password (solo para login/verify).
   * El +password es necesario porque el campo tiene select: false.
   */
  async findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password').exec();
  },

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id).exec();
  },

  async create(dto: CreateUserDTO): Promise<IUserDocument> {
    const user = new User({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role ?? 'viewer',
    });
    return user.save();
  },

  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() }).exec();
  },

  /**
   * Agrega un refresh token al array del usuario.
   * Si ya tiene 5 tokens (max sessions), elimina el más antiguo (FIFO).
   */
  async addRefreshToken(dto: AddRefreshTokenDTO): Promise<void> {
    const user = await User.findById(dto.userId).exec();
    if (!user) return;

    // Eliminar tokens expirados antes de agregar el nuevo
    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > now);

    // Si sigue en el máximo, eliminar el más antiguo
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }

    user.refreshTokens.push({
      tokenHash: dto.tokenHash,
      family: dto.family,
      expiresAt: dto.expiresAt,
      createdAt: new Date(),
    });

    await user.save();
  },

  /**
   * Elimina UN token específico por hash (logout de una sesión).
   */
  async removeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: { tokenHash } } }).exec();
  },

  /**
   * Elimina TODOS los tokens de una familia (reuso detectado → revocar todo).
   */
  async removeRefreshTokenFamily(userId: string, family: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: { family } } }).exec();
  },

  /**
   * Elimina todos los refresh tokens (logout global / cambio de password).
   */
  async removeAllRefreshTokens(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokens: [] }).exec();
  },

  async existsByEmail(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase() }).exec();
    return count > 0;
  },
} as const;
