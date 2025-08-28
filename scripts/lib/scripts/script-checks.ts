/**
 * Script-specific check functions - modularized for maintainability
 *
 * This module serves as the main orchestration layer for script validation,
 * coordinating linting and coverage analysis through specialized modules.
 * It maintains clean separation of concerns while providing a unified interface.
 */
import { runScriptLinting } from './script-linting';
import { runScriptCoverage } from '../coverage-analysis';
import { execCommand } from '../utils/command-utils';

// Constants
const SCRIPT_UNIT_TEST_TIMEOUT_MS = 180000; // 3 minutes
const SCRIPT_COVERAGE_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Run script unit tests to catch real test failures
 */
function runScriptUnitTests(projectRoot: string): {
  failed: boolean;
  output: string;
} {
  try {
    console.error('🧪 Running scripts unit tests...');
    const result = execCommand('npm run test:scripts', projectRoot, SCRIPT_UNIT_TEST_TIMEOUT_MS);

    if (!result.success) {
      return {
        failed: true,
        output: `\nSCRIPT UNIT TEST FAILURES:\n${result.output}\n`,
      };
    }

    return { failed: false, output: '' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      failed: true,
      output: `\nSCRIPT UNIT TEST ERROR:\n${errorMsg}\n`,
    };
  }
}

/**
 * Run comprehensive script validation including linting, unit tests, and coverage
 *
 * Orchestrates ESLint validation, unit test execution, and coverage analysis for script files.
 * Validates input parameters, delegates to specialized modules, and aggregates results.
 * Unit tests are run before coverage to catch actual test failures early.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @param scriptFiles - Array of script file paths to validate
 * @returns Combined validation results with failure status and output
 */
export function runScriptChecks(
  projectRoot: string,
  scriptFiles: string[]
): { failed: boolean; output: string } {
  if (!scriptFiles?.length) {
    return { failed: false, output: '' };
  }
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new Error('Invalid projectRoot: must be a non-empty string');
  }

  const memoryLimit = process.env.NODE_MEMORY_LIMIT || '8192';
  if (!/^\d+$/.test(memoryLimit)) {
    throw new Error('Invalid NODE_MEMORY_LIMIT: must be numeric');
  }

  const lintResult = runScriptLinting(projectRoot, scriptFiles);

  // Run unit tests first to catch actual test failures
  const unitTestResult = runScriptUnitTests(projectRoot);

  // If unit tests fail, return immediately without running coverage
  if (unitTestResult.failed) {
    return {
      failed: true,
      output: lintResult.output + unitTestResult.output,
    };
  }

  // Run coverage with recursion protection and appropriate timeout
  // Only run tests for changed files to speed up precommit
  const coverageResult = runScriptCoverage({
    scriptsDir: projectRoot,
    timeout: SCRIPT_COVERAGE_TIMEOUT_MS,
    changedFiles: scriptFiles,
  });

  return {
    failed: lintResult.failed || coverageResult.failed,
    output: lintResult.output + unitTestResult.output + coverageResult.output,
  };
}
