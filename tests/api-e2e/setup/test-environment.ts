/**
 * Test Environment Setup Utilities
 * 
 * Manages test database directories and environment variables.
 * Extracted from global-setup to follow SRP and maintain modularity.
 */

import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

export interface TestEnvironmentConfig {
  testDbDir: string;
  baseUrl: string;
  backendPort: string;
}

/**
 * Create test environment configuration
 */
export function createTestEnvironmentConfig(): TestEnvironmentConfig {
  const backendPort = process.env.BACKEND_PORT || '3001';
  const baseUrl = `http://localhost:${backendPort}`;
  const testDbDir = join(process.cwd(), 'test-databases');
  
  return {
    testDbDir,
    baseUrl,
    backendPort
  };
}

/**
 * Setup test database directory
 */
export function setupTestDatabases(testDbDir: string): void {
  cleanTestDatabases(testDbDir);
  
  mkdirSync(testDbDir, { recursive: true });
  console.log('🗄️ Test database directory prepared');
}

/**
 * Clean existing test databases
 */
export function cleanTestDatabases(testDbDir: string): void {
  if (existsSync(testDbDir)) {
    rmSync(testDbDir, { recursive: true, force: true });
  }
}

/**
 * Set environment variables for tests
 */
export function setTestEnvironmentVariables(config: TestEnvironmentConfig): void {
  process.env.BASE_URL = config.baseUrl;
  process.env.BACKEND_PORT = config.backendPort;
  process.env.TEST_DATABASE_DIR = config.testDbDir;
}

/**
 * Create cleanup function for test environment
 */
export function createCleanupFunction(testDbDir: string): () => void {
  return () => {
    console.log('🧹 Cleaning up test databases...');
    cleanTestDatabases(testDbDir);
    console.log('✅ Test environment cleanup complete');
  };
}