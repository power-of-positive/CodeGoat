/**
 * Staged file handling utilities
 */

import { execCommand } from '../utils/command-utils';

export interface StagedFiles {
  frontendFiles: string[];
  backendFiles: string[];
  scriptFiles: string[];
  allFiles: string[];
}

/**
 * Create empty staged files result
 */
function createEmptyStagedFiles(): StagedFiles {
  return {
    frontendFiles: [],
    backendFiles: [],
    scriptFiles: [],
    allFiles: [],
  };
}

/**
 * Categorize files by type
 */
function categorizeFiles(stagedFiles: string[]): StagedFiles {
  return {
    frontendFiles: stagedFiles.filter(
      file => file.startsWith('frontend/') && /\.(ts|tsx|js|jsx)$/.test(file)
    ),
    backendFiles: stagedFiles.filter(file => file.startsWith('backend/') && file.endsWith('.rs')),
    scriptFiles: stagedFiles.filter(file => file.startsWith('scripts/') && /\.(ts|js)$/.test(file)),
    allFiles: stagedFiles,
  };
}

/**
 * Get staged files categorized by type
 */
export function getStagedFiles(projectRoot: string): StagedFiles {
  const result = execCommand('git diff --cached --name-only', projectRoot);

  if (!result.success || !result.output) {
    return createEmptyStagedFiles();
  }

  const stagedFiles = result.output
    .trim()
    .split('\n')
    .filter(f => f && f.trim());

  try {
    return categorizeFiles(stagedFiles);
  } catch (error) {
    console.warn(`Failed to process staged files: ${error}`);
    return createEmptyStagedFiles();
  }
}
