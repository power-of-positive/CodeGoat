/**
 * Formatting and linting runners for staged files
 */

import * as fs from 'fs';
import * as path from 'path';
import { execCommand } from '../utils/command-utils';
import { validateDirectoryExists } from '../utils/validation-utils';
import { CheckResult } from '../utils/types';
import { createSuccessResult, createFailureResult } from '../utils/result-utils';
import { filterTsFiles, filterPrettierFiles } from './format-file-filters';
import { restageFiles } from './format-utils';

/**
 * Filter out files that don't exist on the filesystem
 */
function filterExistingFiles(projectRoot: string, files: string[]): string[] {
  return files.filter(file => {
    const fullPath = path.resolve(projectRoot, file);
    return fs.existsSync(fullPath);
  });
}

// Re-export TypeScript formatting from dedicated module
export { runTypeScriptCheck } from './format-typescript';

/**
 * Run prettier formatting on staged files
 */
export function runPrettierFormat(projectRoot: string, stagedFiles: string[]): CheckResult {
  console.log('💅 Running prettier formatting on staged files...');
  validateDirectoryExists(projectRoot);

  const prettierFiles = filterPrettierFiles(stagedFiles);
  const existingPrettierFiles = filterExistingFiles(projectRoot, prettierFiles);
  if (existingPrettierFiles.length === 0) {
    return createSuccessResult('No files to format with prettier');
  }

  const formatResult = execCommand(
    `npx prettier --write ${existingPrettierFiles.map(f => `"${f}"`).join(' ')}`,
    projectRoot
  );
  if (!formatResult.success) {
    return formatResult;
  }

  const restageResult = restageFiles(projectRoot, existingPrettierFiles);
  if (!restageResult.success) {
    return createFailureResult(
      `Prettier formatting succeeded but re-staging failed: ${restageResult.output}`
    );
  }

  return createSuccessResult(
    `Formatted ${existingPrettierFiles.length} files with prettier and re-staged them`
  );
}

/**
 * Run ESLint auto-fixing on staged files
 */
export function runEslintFix(projectRoot: string, stagedFiles: string[]): CheckResult {
  console.log('🔧 Running ESLint auto-fix on staged files...');
  validateDirectoryExists(projectRoot);

  const eslintFiles = filterTsFiles(stagedFiles);
  const existingEslintFiles = filterExistingFiles(projectRoot, eslintFiles);
  if (existingEslintFiles.length === 0) {
    return createSuccessResult('No TypeScript/JavaScript files to lint');
  }

  const fixResult = execCommand(
    `npx eslint --fix ${existingEslintFiles.map(f => `"${f}"`).join(' ')}`,
    projectRoot
  );
  if (!fixResult.success) {
    return fixResult;
  }

  const restageResult = restageFiles(projectRoot, existingEslintFiles);
  if (!restageResult.success) {
    return createFailureResult(
      `ESLint auto-fix succeeded but re-staging failed: ${restageResult.output}`
    );
  }

  return createSuccessResult(
    `Fixed ESLint issues in ${existingEslintFiles.length} files and re-staged them`
  );
}
