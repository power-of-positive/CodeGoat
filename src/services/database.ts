import { PrismaClient } from '@prisma/client';
import { WinstonLogger } from '../logger-winston';

let prisma: PrismaClient | null = null;

export function createDatabaseService(_logger: WinstonLogger) {
  if (!prisma) {
    // Configure Prisma with appropriate timeout for test environment
    const prismaOptions: any = {};
    
    if (process.env.NODE_ENV === 'test') {
      prismaOptions.datasources = {
        db: {
          url: process.env.KANBAN_DATABASE_URL || 'file:../kanban.db',
        },
      };
      // Set connection pool timeout for test environment
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
