/**
 * Database Configuration Utility
 *
 * Provides standardized database URL resolution with proper fallback logic.
 * Ensures consistent database configuration across all environments.
 */

/**
 * Get database URL with proper precedence and fallback logic
 *
 * Precedence order:
 * 1. DATABASE_URL (industry standard)
 * 2. KANBAN_DATABASE_URL (legacy support)
 * 3. Environment-specific defaults
 *
 * @returns Database URL string
 * @throws Error if URL format is invalid
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL || process.env.KANBAN_DATABASE_URL || getDefaultDatabaseUrl();

  // Validate URL format
  if (!url.startsWith('file:')) {
    throw new Error(`Invalid database URL format: "${url}". SQLite URLs must start with "file:"`);
  }

  return url;
}

/**
 * Get environment-specific default database URL
 *
 * @returns Default database URL for current environment
 */
export function getDefaultDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';

  switch (nodeEnv) {
    case 'test':
    case 'e2e-test':
      return 'file:./prisma/kanban-test.db';
    case 'production':
      return 'file:./prisma/kanban-prod.db';
    case 'development':
    default:
      return 'file:./prisma/kanban.db';
  }
}

/**
 * Get test database URL
 * Always returns test database regardless of environment
 *
 * @returns Test database URL
 */
export function getTestDatabaseUrl(): string {
  return 'file:./prisma/kanban-test.db';
}

/**
 * Ensure DATABASE_URL is set in environment
 * Synchronizes legacy KANBAN_DATABASE_URL if needed
 *
 * This function ensures backward compatibility by setting DATABASE_URL
 * from KANBAN_DATABASE_URL if only the legacy variable is set.
 */
export function ensureDatabaseUrl(): void {
  // If DATABASE_URL is not set but KANBAN_DATABASE_URL is, use legacy value
  if (!process.env.DATABASE_URL && process.env.KANBAN_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.KANBAN_DATABASE_URL;
  }

  // If DATABASE_URL is set but KANBAN_DATABASE_URL is not, sync for legacy code
  if (process.env.DATABASE_URL && !process.env.KANBAN_DATABASE_URL) {
    process.env.KANBAN_DATABASE_URL = process.env.DATABASE_URL;
  }
}

/**
 * Get database configuration for Prisma
 *
 * @returns Prisma datasource configuration
 */
export function getPrismaDatasourceConfig() {
  return {
    db: {
      url: getDatabaseUrl(),
    },
  };
}

/**
 * Validate database file exists (for SQLite)
 *
 * @param url Database URL
 * @returns true if database file exists, false otherwise
 */
export function validateDatabaseExists(url: string): boolean {
  if (!url.startsWith('file:')) {
    return false;
  }

  const filePath = url.replace('file:', '');
  try {
    const fs = require('fs');
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Get database environment info for debugging
 *
 * @returns Object with database environment information
 */
export function getDatabaseInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '(not set)',
    kanbanDatabaseUrl: process.env.KANBAN_DATABASE_URL || '(not set)',
    resolvedUrl: getDatabaseUrl(),
    defaultUrl: getDefaultDatabaseUrl(),
  };
}
