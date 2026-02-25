import { envConfig } from '@/config/env.config.js';
import mongoose from 'mongoose';

/**
 * Gestión del ciclo de vida de la conexión MongoDB.
 *
 * Patrón: Singleton Connection — Mongoose gestiona internamente
 * un pool de conexiones; solo llamamos connect() una vez en el bootstrap.
 *
 * Los eventos de conexión permiten observabilidad sin acoplamiento:
 * si la DB se desconecta en runtime, Mongoose reintentará automáticamente
 * gracias a serverSelectionTimeoutMS y la lógica de reconexión interna.
 */

export async function connectDatabase(): Promise<void> {
  // Register listeners de eventos ANTES de conectar
  mongoose.connection.on('connected', () => {
    console.log(`✅ MongoDB connection error: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (error: Error) => {
    console.error('❌ MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄️ MongoDB reconnected successfully.');
  });

  await mongoose.connect(envConfig.MONGODB_URI, {
    // Tiempo máximo para seleccionar un servidor del replica set
    serverSelectionTimeoutMS: 5_000,
    // Timeout para operaciones individuales de socket
    socketTimeoutMS: 45_000,
    // Tamaño del pool de conexiones (ajustar según carga esperada)
    maxPoolSize: 10,
    minPoolSize: 2,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed gracefully.');
}
