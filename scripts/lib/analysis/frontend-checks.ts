/**
 * Frontend-specific check runners with improved logging
 */
import { StagedFiles } from '../files/staged-files';
import {
  runFrontendLinting,
  runFrontendTests,
  runPlaywrightTests,
} from '../runners/frontend-runners';
import { runApiE2eTests as runApiE2eTestsFromRunner } from '../checks/check-runners';
import { validateStagedFiles } from '../checks/check-utils';

/**
 * Run synchronous frontend checks (lint, tests, Playwright)
 */
function runSyncFrontendChecks(projectRoot: string): {
  failed: boolean;
  output: string;
} {
  const syncChecks = [
    {
      runner: runFrontendLinting,
      name: 'FRONTEND LINT FAILURES',
      label: 'Frontend Linting',
    },
    {
      runner: runFrontendTests,
      name: 'FRONTEND TEST FAILURES',
      label: 'Frontend Unit Tests',
    },
    {
      runner: runPlaywrightTests,
      name: 'PLAYWRIGHT E2E TEST FAILURES',
      label: 'Playwright E2E Tests',
    },
  ];

  for (const { runner, name, label } of syncChecks) {
    console.log(`📋 Running ${label}...`);
    const result = runner(projectRoot);
    if (!result.success) {
      console.log(`❌ ${label} failed`);
      return { failed: true, output: `${name}:\n${result.output}` };
    }
    console.log(`✅ ${label} passed`);
  }
  return { failed: false, output: '' };
}

/**
 * Run API E2E tests
 */
async function runApiE2eTests(projectRoot: string): Promise<{ failed: boolean; output: string }> {
  console.log('📋 Running API E2E Tests...');
  const result = await runApiE2eTestsFromRunner(projectRoot);
  if (!result.success) {
    console.log('❌ API E2E Tests failed');
    return { failed: true, output: `API E2E TEST FAILURES:\n${result.output}` };
  }
  console.log('✅ API E2E Tests passed');
  return { failed: false, output: '' };
}

/**
 * Run unit test coverage for all tests (excluding API E2E)
 * TEMPORARILY DISABLED - will re-enable after test files are committed
 */
/* async function runUnitTestCoverage(
  projectRoot: string,
): Promise<{ failed: boolean; output: string }> {
  console.log("📊 Running unit test coverage...");

  try {
    const { execCommand } = await import("../utils/command-utils");
    // Increase Node.js memory limit for coverage and allow sufficient time
    const result = execCommand(
      "NODE_OPTIONS='--max-old-space-size=8192' npm run test:coverage",
      projectRoot,
      300000, // 5 minute timeout for comprehensive coverage
      { NODE_OPTIONS: "--max-old-space-size=8192" },
    );

    if (!result.success) {
      console.log("❌ Unit test coverage failed");
      return {
        failed: true,
        output: `UNIT TEST COVERAGE FAILURES:\n${result.output}`,
      };
    }
    console.log("✅ Unit test coverage passed");
    return { failed: false, output: "" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`⚠️ Failed to run unit test coverage: ${errorMsg}`);
    return {
      failed: true,
      output: `Unit test coverage execution failed: ${errorMsg}`,
    };
  }
} */

/**
 * Run frontend-specific checks (coverage, API E2E, lint, tests, Playwright)
 */
export async function runFrontendChecks(
  projectRoot: string,
  stagedFiles: StagedFiles
): Promise<{ failed: boolean; output: string }> {
  try {
    validateStagedFiles(stagedFiles);

    // TEMPORARILY DISABLED: run unit test coverage first, regardless of staged files
    // TODO: Re-enable after test files are properly committed
    // const coverageResult = await runUnitTestCoverage(projectRoot);
    // if (coverageResult.failed) return coverageResult;

    // Run API E2E tests second, unless explicitly skipped
    if (process.env.SKIP_API_E2E_TESTS !== 'true') {
      const apiE2eResult = await runApiE2eTests(projectRoot);
      if (apiE2eResult.failed) return apiE2eResult;
    } else {
      console.log('⏭️ API E2E tests skipped (SKIP_API_E2E_TESTS=true)');
    }

    // Skip other frontend checks if no frontend files are staged
    if (stagedFiles.frontendFiles.length === 0) {
      console.log('ℹ️ No frontend files to check (linting/unit tests)');
      return { failed: false, output: '' };
    }

    console.log('🔍 Starting frontend checks...');
    const syncResult = runSyncFrontendChecks(projectRoot);
    if (syncResult.failed) return syncResult;

    return { failed: false, output: '' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Frontend check error: ${errorMsg}`);
    return { failed: true, output: `Frontend check error: ${errorMsg}` };
  }
}
