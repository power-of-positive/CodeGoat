/**
 * Shared constants for code quality checks
 */

// Default configuration values
const DEFAULT_MAX_FILE_LINES = 150;
const DEFAULT_MAX_FUNCTION_LINES = 33;
const DECIMAL_BASE = 10;

/**
 * Maximum number of lines allowed in a single file
 */
export const MAX_FILE_LINES = process.env.MAX_FILE_LINES
  ? parseInt(process.env.MAX_FILE_LINES, DECIMAL_BASE)
  : DEFAULT_MAX_FILE_LINES;

/**
 * Maximum number of lines allowed in a single function
 */
export const MAX_FUNCTION_LINES = process.env.MAX_FUNCTION_LINES
  ? parseInt(process.env.MAX_FUNCTION_LINES, DECIMAL_BASE)
  : DEFAULT_MAX_FUNCTION_LINES;

/**
 * Get the max lines configuration for ESLint
 */
export function getMaxLinesConfig() {
  return {
    maxFileLines: MAX_FILE_LINES,
    maxFunctionLines: MAX_FUNCTION_LINES,
  };
}
