import { logger } from '@/utils/logger';
import mongoose from 'mongoose';
import { config } from './env';

/**
 * Singleton de conexión a MongoDB.
 * Maneja reconexión automática y eventos del ciclo de vida.
 */
class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {
    this.registerEvents();
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private registerEvents(): void {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (err: Error) => {
      logger.error('MongoDB connection error', { message: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect...');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.debug('MongoDB already connected — reusing instance');
      return;
    }

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.connection.close();
    this.isConnected = false;
    logger.info('MongoDB connection closed');
  }

  get connectionState(): string {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnected',
    };
    return states[mongoose.connection.readyState] ?? 'unknown';
  }
}

export const database = Database.getInstance();
