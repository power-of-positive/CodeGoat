/**
 * Global Setup for API E2E Tests
 * 
 * Orchestrates test environment setup with proper separation of concerns.
 * Uses extracted utilities to maintain clean code principles.
 */

import { createBackendConfig } from './backend-manager';
import { startBackendServer, stopBackendServer, BackendProcess } from './backend-server';
import { 
  createTestEnvironmentConfig,
  setupTestDatabases,
  setTestEnvironmentVariables,
  createCleanupFunction 
} from './test-environment';

let backendProcess: BackendProcess | null = null;

/**
 * Global setup function called by Vitest
 */
export default async function globalSetup() {
  console.log('🧪 Setting up API E2E test environment...');
  
  try {
    const backendConfig = createBackendConfig();
    const envConfig = createTestEnvironmentConfig();
    
    setupTestDatabases(envConfig.testDbDir);
    backendProcess = await startBackendServer(backendConfig);
    setTestEnvironmentVariables(envConfig);
    
    console.log('✅ API E2E test environment ready');
    
    return createGlobalCleanupFunction(envConfig.testDbDir);
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

/**
 * Create cleanup function for global teardown
 */
function createGlobalCleanupFunction(testDbDir: string) {
  const envCleanup = createCleanupFunction(testDbDir);
  
  return async () => {
    console.log('🧹 Cleaning up test environment...');
    
    if (backendProcess) {
      await stopBackendServer(backendProcess);
      backendProcess = null;
    }
    
    envCleanup();
    console.log('✅ Test environment cleanup complete');
  };
}