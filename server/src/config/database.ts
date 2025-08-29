/**
 * Database Configuration
 * Prisma Client設定とDB接続管理
 */

import { PrismaClient } from '@prisma/client';

// Prisma Client singleton pattern
class DatabaseManager {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
        errorFormat: 'pretty',
      });
    }
    return DatabaseManager.instance;
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.$disconnect();
      DatabaseManager.instance = null;
    }
  }
}

export const prisma = DatabaseManager.getInstance();

// Database connection test
export const testConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server...');
  await DatabaseManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Server terminated');
  await DatabaseManager.disconnect();
  process.exit(0);
});

export const config = {
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
  }
};