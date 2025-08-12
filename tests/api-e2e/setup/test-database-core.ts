import { Database } from 'sqlite3';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { DatabaseMigrations } from './database-migrations';
import { DatabaseOperations } from './database-operations';
import { DatabaseSchema, DatabaseResult } from './database-types';

/**
 * Test database manager for isolated E2E testing
 * Creates temporary SQLite databases for each test run
 */
export class TestDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private migrations: DatabaseMigrations | null = null;
  private operations: DatabaseOperations | null = null;
  private static instanceCounter = 0;

  constructor(testName?: string) {
    const testId = `${Date.now()}_${++TestDatabase.instanceCounter}`;
    const safeName = testName?.replace(/[^a-zA-Z0-9]/g, '_') || 'test';
    this.dbPath = join(__dirname, '../../../test-databases', `${safeName}_${testId}.sqlite`);
    
    mkdirSync(dirname(this.dbPath), { recursive: true });
  }

  async setup(): Promise<void> {
    await this.createDatabase();
    if (!this.migrations) {
      throw new Error('Database migrations not initialized after createDatabase()');
    }
    if (!this.db) {
      throw new Error('Database connection not established after createDatabase()');
    }
    await this.migrations.runMigrations();
  }

  private async createDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let database: Database;
        database = new Database(this.dbPath, (err) => {
          if (err) {
            this.db = null;
            reject(new Error(`Failed to create test database: ${err.message}`));
            return;
          }
          
          try {
            this.db = database;
            this.migrations = new DatabaseMigrations(database);
            this.operations = new DatabaseOperations(database);
            resolve();
          } catch (initError) {
            this.db = null;
            reject(new Error(`Failed to initialize database utilities: ${initError}`));
          }
        });
      } catch (createError) {
        this.db = null;
        reject(new Error(`Failed to instantiate database: ${createError}`));
      }
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.query<T>(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<DatabaseResult> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.run(sql, params);
  }

  async beginTransaction(): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.beginTransaction();
  }

  async commit(): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.commit();
  }

  async rollback(): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.rollback();
  }

  async clearData(): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.clearData();
  }

  async getSchema(): Promise<DatabaseSchema> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.getSchema();
  }

  async teardown(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(new Error(`Failed to close database: ${err.message}`));
          } else {
            if (existsSync(this.dbPath)) {
              try {
                unlinkSync(this.dbPath);
              } catch (unlinkErr) {
                console.warn(`Failed to delete test database file: ${unlinkErr}`);
              }
            }
            resolve();
          }
        });
      });
    }
  }

  getPath(): string {
    return this.dbPath;
  }
}