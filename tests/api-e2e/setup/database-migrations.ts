import { Database } from 'sqlite3';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

/**
 * Database migration utilities
 */
export class DatabaseMigrations {
  private db: Database;

  constructor(db: Database) {
    if (!db) {
      throw new Error('Database instance is required for DatabaseMigrations');
    }
    this.db = db;
  }

  /**
   * Run all database migrations to set up schema
   */
  async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection is null in runMigrations');
    }
    const run = promisify(this.db.run.bind(this.db));
    
    // Enable foreign keys
    await run('PRAGMA foreign_keys = ON');

    // Get all migration files in order
    const migrationsDir = join(__dirname, '../../../backend/migrations');
    const migrationFiles = glob.sync('*.sql', { cwd: migrationsDir }).sort();

    console.log(`Running ${migrationFiles.length} migrations...`);

    for (const file of migrationFiles) {
      await this.runMigrationFile(file, migrationsDir, run);
    }

    console.log('All migrations applied successfully');
  }

  private async runMigrationFile(
    file: string,
    migrationsDir: string,
    run: (sql: string) => Promise<any>
  ): Promise<void> {
    const migrationPath = join(migrationsDir, file);
    const migrationSql = readFileSync(migrationPath, 'utf8');
    
    console.log(`Applying migration: ${file}`);
    
    // Split by semicolons and run each statement
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await run(statement);
      } catch (error) {
        console.error(`Failed to run migration ${file}:`, error);
        console.error('Statement:', statement);
        throw error;
      }
    }
  }
}