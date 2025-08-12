import { TestDatabase } from './test-database-core';

/**
 * Global test database setup and teardown utilities
 */
let globalTestDb: TestDatabase | null = null;

export async function setupTestDatabase(testName?: string): Promise<TestDatabase> {
  if (globalTestDb) {
    await globalTestDb.teardown();
  }
  
  globalTestDb = new TestDatabase(testName);
  await globalTestDb.setup();
  return globalTestDb;
}

export async function teardownTestDatabase(): Promise<void> {
  if (globalTestDb) {
    await globalTestDb.teardown();
    globalTestDb = null;
  }
}

export function getTestDatabase(): TestDatabase {
  if (!globalTestDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return globalTestDb;
}