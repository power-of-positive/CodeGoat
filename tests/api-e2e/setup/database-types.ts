/**
 * Database schema information interface
 */
export interface DatabaseSchema {
  tables: Array<{ name: string; schema: string }>;
  indexes: Array<{ name: string; schema: string }>;
}

/**
 * Database operation result interface
 */
export interface DatabaseResult {
  lastID: number;
  changes: number;
}