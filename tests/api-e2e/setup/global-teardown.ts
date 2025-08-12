/**
 * Global Teardown for API E2E Tests
 * 
 * Handles cleanup of backend server and test databases.
 * This runs after all tests are complete.
 */

import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = join(process.cwd());
const TEST_DB_DIR = join(PROJECT_ROOT, 'test-databases');

/**
 * Global teardown function called by Vitest
 */
export default async function globalTeardown() {
  console.log('🧹 Running global teardown...');
  
  try {
    // Clean up any remaining test databases
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
      console.log('🗄️ Test databases cleaned up');
    }
    
    // Kill any processes that might be using the test port
    const testPort = process.env.BACKEND_PORT || '3001';
    try {
      const { execSync } = await import('child_process');
      
      // Find and kill processes on the test port (macOS/Linux)
      try {
        const pids = execSync(`lsof -ti:${testPort}`, { encoding: 'utf8' }).trim();
        if (pids) {
          console.log(`🛑 Killing remaining processes on port ${testPort}`);
          execSync(`kill -9 ${pids}`);
        }
      } catch {
        // No processes found on port, which is fine
      }
    } catch (error) {
      // Non-critical error, continue with teardown
      console.warn('⚠️ Could not clean up port processes:', error);
    }
    
    console.log('✅ Global teardown complete');
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    // Don't throw - teardown errors shouldn't fail the test suite
  }
}