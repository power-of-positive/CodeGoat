/**
 * Frontend-specific check runners
 */

import * as path from 'path';
import { execCommand } from '../utils/command-utils';
import { validateDirectoryExists } from '../utils/validation-utils';
import { CheckResult } from '../utils/types';
import { createSuccessResult } from '../utils/result-utils';

/**
 * Run frontend linting checks
 */
export function runFrontendLinting(projectRoot: string): CheckResult {
  console.error('🔍 Running frontend linting...');
  const frontendDir = path.join(projectRoot, 'frontend');
  validateDirectoryExists(frontendDir);

  const lintResult = execCommand('npm run lint', frontendDir);
  if (!lintResult.success) {
    return lintResult;
  }

  return execCommand('npm run format:check', frontendDir);
}

/**
 * Run frontend unit tests
 */
export function runFrontendTests(projectRoot: string): CheckResult {
  console.error('🧪 Running frontend unit tests...');
  const frontendDir = path.join(projectRoot, 'frontend');
  validateDirectoryExists(frontendDir);
  return execCommand('npm run test:run', frontendDir);
}

/**
 * Run Playwright E2E tests (skips in headless environments)
 */
export function runPlaywrightTests(projectRoot: string): CheckResult {
  validateDirectoryExists(projectRoot);

  const isHeadless = !process.env.DISPLAY && !process.env.CI && !process.env.GITHUB_ACTIONS;
  if (isHeadless) {
    console.error('🎭 Skipping Playwright E2E tests (headless environment detected)');
    return createSuccessResult('Skipped - headless environment');
  }

  console.error('🎭 Running Playwright E2E tests...');
  return execCommand('npm run test:playwright', projectRoot);
}
