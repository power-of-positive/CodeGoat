/**
 * Main exports for backward compatibility after file reorganization
 */

// Precommit functionality
export { runPrecommitChecks } from './precommit/precommit-handler';
export type { PrecommitResult } from './precommit/precommit-handler';
export { runAllChecks } from './precommit/precommit-checks';

// Formatting
export { runTypeScriptCheck, runPrettierFormat, runEslintFix } from './formatting/format-runners';

// File utilities
export { getStagedFiles } from './files/staged-files';

// Check runners
export {
  runFrontendLinting,
  runFrontendTests,
  runPlaywrightTests,
} from './runners/frontend-runners';
export { runRustFormatting, runRustLinting } from './runners/rust-runners';

// Security
export { runSecurityChecks } from './security/security-checks';

// Utilities
export { findProjectRoot } from './utils/review-utils';
export { createSuccessResult, createFailureResult } from './utils/result-utils';
export { validateInput, validateDirectoryExists } from './utils/validation-utils';

// LLM functionality
export { generateLlmReviewComments } from './llm/llm-review-generator';
export { checkLlmReview } from './llm/llm-check';

// Analysis
export { runCodeAnalysis } from './analysis/code-analysis';

// Types
export type { CheckResult } from './utils/types';
export type { StagedFiles } from './files/staged-files';
