import { Database } from 'sqlite3';
import { DatabaseResult, DatabaseSchema } from './database-types';

/**
 * Database operation utilities
 */
export class DatabaseOperations {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Execute a SQL query and return results
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Statement failed: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.run('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    await this.run('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    await this.run('ROLLBACK');
  }

  /**
   * Clear all data from tables (but keep schema)
   */
  async clearData(): Promise<void> {
    const tables = [
      'execution_processes',
      'task_attempts', 
      'tasks',
      'task_templates',
      'projects'
    ];

    await this.beginTransaction();
    try {
      // Disable foreign key checks temporarily
      await this.run('PRAGMA foreign_keys = OFF');
      
      for (const table of tables) {
        await this.run(`DELETE FROM ${table}`);
      }
      
      // Re-enable foreign key checks
      await this.run('PRAGMA foreign_keys = ON');
      await this.commit();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Get database schema information
   */
  async getSchema(): Promise<DatabaseSchema> {
    const tables = await this.query<{ name: string, sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    const indexes = await this.query<{ name: string, sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    return {
      tables: tables.map(t => ({ name: t.name, schema: t.sql })),
      indexes: indexes.map(i => ({ name: i.name, schema: i.sql }))
    };
  }
}