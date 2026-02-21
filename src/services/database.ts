import { PrismaClient } from '@prisma/client';
import { WinstonLogger } from '../logger-winston';
import { getDatabaseUrl, ensureDatabaseUrl } from '../config/database';

let prisma: PrismaClient | null = null;

export function createDatabaseService(_logger: WinstonLogger) {
  if (!prisma) {
    // Ensure DATABASE_URL is properly set
    ensureDatabaseUrl();

    // Configure Prisma with appropriate settings
    const prismaOptions: any = {};

    if (process.env.NODE_ENV === 'test') {
      prismaOptions.datasources = {
        db: {
          url: getDatabaseUrl(),
        },
      };
      // Reduce logging in test environment
      prismaOptions.log = ['error', 'warn'];
    }

    prisma = new PrismaClient(prismaOptions);

    // Handle graceful shutdown
    process.on('beforeExit', () => {
      (async () => {
        if (prisma) {
          await prisma.$disconnect();
        }
      })().catch(error => {
        console.error('Error disconnecting Prisma:', error);
      });
    });
  }

  return prisma;
}

export function getDatabaseService(): PrismaClient {
  if (!prisma) {
    throw new Error('Database service not initialized. Call createDatabaseService first.');
  }
  return prisma;
}
