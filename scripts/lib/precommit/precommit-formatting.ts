/**
 * Formatting operations for precommit checks
 */

import { runPrettierFormat, runEslintFix } from '../formatting/format-runners';

/**
 * Run formatting and linting steps
 */
export function runFormattingSteps(projectRoot: string, stagedFiles: string[]): void {
  console.log('🎨 Auto-formatting staged files...');
  const prettierResult = runPrettierFormat(projectRoot, stagedFiles);
  if (!prettierResult.success) {
    console.warn(`Prettier formatting failed: ${prettierResult.output}`);
  }

  const eslintFixResult = runEslintFix(projectRoot, stagedFiles);
  if (!eslintFixResult.success) {
    console.warn(`ESLint auto-fix failed: ${eslintFixResult.output}`);
  }
}
