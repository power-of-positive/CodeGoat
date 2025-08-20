import { execCommand } from '../utils/command-utils';
import { validateInput } from '../utils/validation-utils';
import { CheckResult } from '../utils/types';
import { findAvailablePort } from '../utils/port-utils';
import * as path from 'path';
export {
  runFrontendLinting,
  runFrontendTests,
  runPlaywrightTests,
} from '../runners/frontend-runners';
export { runRustFormatting, runRustLinting } from '../runners/rust-runners';
export { runTypeScriptCheck, runPrettierFormat, runEslintFix } from '../formatting/format-runners';

/**
 * Run API E2E tests with dynamic port
 */
export async function runApiE2eTests(projectRoot: string): Promise<CheckResult> {
  console.log('🧪 Running API E2E tests...');

  try {
    // Validate path format first (catches empty strings)
    if (!projectRoot || typeof projectRoot !== 'string') {
      throw new Error('Invalid path: must be non-empty string');
    }

    // Resolve to absolute path to avoid validation issues with ".."
    const absoluteProjectRoot = path.resolve(projectRoot);
    validateInput(absoluteProjectRoot, 'path');
    const availablePort = await findAvailablePort(3001);
    console.log(`📡 Using port ${availablePort} for API E2E tests`);

    const result = execCommand('npm run test:e2e:api', projectRoot, 180000, {
      BACKEND_PORT: availablePort.toString(),
    });

    console.log(result.success ? '✅ API E2E tests passed' : '❌ API E2E tests failed');
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`⚠️ Failed to run API E2E tests: ${errorMsg}`);
    return {
      success: false,
      output: `API E2E test execution failed: ${errorMsg}`,
    };
  }
}
