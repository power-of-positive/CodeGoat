import { PrismaClient } from '@prisma/client';
import { ILogger } from '../logger-interface';

/**
 * Kanban Database Service
 * Manages database connections and provides database access for Kanban features
 */
export class KanbanDatabaseService {
  private prisma: PrismaClient;
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  /**
   * Get the Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Connect to the database
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.logger.info('Connected to Kanban SQLite database');
    } catch (error) {
      this.logger.error('Failed to connect to Kanban database', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.logger.info('Disconnected from Kanban SQLite database');
    } catch (error) {
      this.logger.error('Error disconnecting from Kanban database', error as Error);
    }
  }

  /**
   * Check database health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Kanban database health check failed', error as Error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    projects: number;
    tasks: number;
    taskAttempts: number;
    executionProcesses: number;
  }> {
    try {
      const [projects, tasks, taskAttempts, executionProcesses] = await Promise.all([
        this.prisma.project.count(),
        this.prisma.task.count(),
        this.prisma.taskAttempt.count(),
        this.prisma.executionProcess.count(),
      ]);

      return {
        projects,
        tasks,
        taskAttempts,
        executionProcesses,
      };
    } catch (error) {
      this.logger.error('Failed to get database statistics', error as Error);
      throw error;
    }
  }
}
