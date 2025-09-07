/**
 * Coverage analysis helper functions
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

type Logger = { log: (...args: unknown[]) => void; error: (...args: unknown[]) => void };

/**
 * Find test files for given changed files
 */
export function findTestFiles(changedFiles: string[], scriptsDir: string): string[] {
  return changedFiles
    .map(f => {
      const baseName = path.basename(f, '.ts');
      const testFile = path.join(path.dirname(f), `${baseName}.test.ts`);
      const specFile = path.join(path.dirname(f), `${baseName}.spec.ts`);
      if (fs.existsSync(testFile)) {
        return path.relative(scriptsDir, testFile);
      }
      if (fs.existsSync(specFile)) {
        return path.relative(scriptsDir, specFile);
      }
      return null;
    })
    .filter(Boolean) as string[];
}

/**
 * Build coverage command based on available test files
 */
export function buildCoverageCommand(
  command: string,
  changedFiles: string[],
  scriptsDir: string,
  logger: Logger
): { command: string; shouldSkip: boolean } {
  let coverageCommand = `NODE_OPTIONS='--max-old-space-size=4096' ${command} run --coverage`;

  if (changedFiles.length > 0) {
    const testFiles = findTestFiles(changedFiles, scriptsDir);

    if (testFiles.length > 0) {
      coverageCommand = `NODE_OPTIONS='--max-old-space-size=4096' ${command} run --coverage ${testFiles.join(' ')}`;
      logger.log(`🎯 Running coverage for ${testFiles.length} test file(s)`);
      return { command: coverageCommand, shouldSkip: false };
    } else {
      logger.log('⚡ No test files found for changed files, skipping coverage');
      return { command: '', shouldSkip: true };
    }
  }

  return { command: coverageCommand, shouldSkip: false };
}

/**
 * Execute coverage command with error handling
 */
export function executeCoverage(
  coverageCommand: string,
  scriptsDir: string,
  timeout: number,
  logger: Logger
): { failed: boolean; output: string; debug?: string } {
  try {
    const output = execSync(coverageCommand, {
      stdio: 'pipe',
      cwd: scriptsDir,
      env: { ...process.env, RUNNING_COVERAGE: 'true', NODE_ENV: 'test' },
      timeout,
      encoding: 'utf8',
    });

    // Ensure vitest processes are cleaned up
    cleanupVitestProcesses(logger);

    const successMessage = `✅ Coverage analysis completed successfully`;
    logger.log(successMessage);
    logger.log(output);
    return { failed: false, output: successMessage };
  } catch (execError: unknown) {
    // Cleanup processes even on error
    cleanupVitestProcesses(logger);
    return handleCoverageWithWarnings(execError, timeout, logger);
  }
}

/**
 * Check if output contains test failures
 */
function hasTestFailureMarkers(output: string): boolean {
  const failureMarkers = [
    'FAIL',
    'failed',
    '× ', // vitest failure marker
    '✗ ', // alternative failure marker
    'Test Files  0 passed',
    'Tests  0 passed',
    'exiting with code 1',
  ];
  return failureMarkers.some(marker => output.includes(marker));
}

/**
 * Check if output contains coverage success markers
 */
function hasCoverageSuccessMarkers(output: string): boolean {
  const successMarkers = ['Coverage report generated', '% Coverage report', 'All files'];
  return successMarkers.some(marker => output.includes(marker));
}

/**
 * Type guard for exec error with output
 */
function isExecErrorWithOutput(
  error: unknown
): error is { stdout: unknown; stderr?: unknown; status?: unknown; signal?: string } {
  return error !== null && typeof error === 'object' && 'stdout' in error;
}

/**
 * Handle coverage that may have warnings but completed successfully
 */
export function handleCoverageWithWarnings(
  execError: unknown,
  timeout: number,
  logger: Logger
): { failed: boolean; output: string; debug?: string } {
  if (!isExecErrorWithOutput(execError)) {
    // Handle non-exec errors gracefully
    const errorMessage = execError instanceof Error ? execError.message : String(execError);
    return {
      failed: true,
      output: `❌ Coverage execution failed: ${errorMessage}`,
      debug: undefined,
    };
  }

  const output = String(execError.stdout);
  const stderr = String(execError.stderr || '');
  const fullOutput = output + stderr;

  // Check for actual test failures first - these should always block
  if (hasTestFailureMarkers(fullOutput)) {
    const errorMessage = `❌ Coverage failed - tests are failing (timeout: ${timeout}ms)`;
    logger.error(errorMessage);
    logger.error(fullOutput);
    return {
      failed: true,
      output: `${errorMessage}\n${fullOutput}`,
      debug: output || undefined,
    };
  }

  // Handle timeout errors specifically
  if ('signal' in execError && execError.signal === 'SIGTERM') {
    return {
      failed: true,
      output: '❌ Coverage execution timed out',
      debug: output || undefined,
    };
  }

  // Only consider it successful if coverage report was generated AND no test failures
  if (hasCoverageSuccessMarkers(output)) {
    const successMessage = `✅ Coverage analysis completed successfully`;
    logger.log(successMessage);
    logger.log(output);
    return { failed: false, output: successMessage };
  }

  // Default failure case
  return {
    failed: true,
    output: `❌ Coverage failed\n${fullOutput}`,
    debug: output || undefined,
  };
}

/**
 * Clean up any lingering vitest processes
 */
function cleanupVitestProcesses(logger: Logger): void {
  try {
    // Kill any hanging vitest processes (only if they exist)
    execSync('pkill -f vitest || true', { stdio: 'pipe' });
    logger.log('🧹 Cleaned up vitest processes');
  } catch {
    // Ignore cleanup errors - they're not critical
    logger.log('ℹ️ No vitest processes to cleanup');
  }
}
