/**
 * Shared constants for code quality checks
 */

/**
 * Maximum number of lines allowed in a single file
 */
export const MAX_FILE_LINES = process.env.MAX_FILE_LINES
  ? parseInt(process.env.MAX_FILE_LINES, 10)
  : 150;

/**
 * Maximum number of lines allowed in a single function
 */
export const MAX_FUNCTION_LINES = process.env.MAX_FUNCTION_LINES
  ? parseInt(process.env.MAX_FUNCTION_LINES, 10)
  : 33;

/**
 * Get the max lines configuration for ESLint
 */
export function getMaxLinesConfig() {
  return {
    maxFileLines: MAX_FILE_LINES,
    maxFunctionLines: MAX_FUNCTION_LINES,
  };
}
