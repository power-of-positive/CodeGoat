import { PrismaClient } from '@prisma/client';
import { WinstonLogger } from '../logger-winston';

let prisma: PrismaClient | null = null;

export function createDatabaseService(_logger: WinstonLogger) {
  if (!prisma) {
    prisma = new PrismaClient();

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      if (prisma) {
        await prisma.$disconnect();
      }
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
