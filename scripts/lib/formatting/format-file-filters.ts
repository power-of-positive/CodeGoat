/**
 * File filtering utilities for formatting operations
 */

/**
 * Filter files for TypeScript/JavaScript extensions
 */
export function filterTsFiles(stagedFiles: string[]): string[] {
  return stagedFiles.filter(file => /\.(ts|tsx|js|jsx)$/.test(file));
}

/**
 * Filter files for prettier-compatible extensions
 */
export function filterPrettierFiles(stagedFiles: string[]): string[] {
  return stagedFiles.filter(file => /\.(ts|tsx|js|jsx|json|css|scss|md|html|yml|yaml)$/.test(file));
}
