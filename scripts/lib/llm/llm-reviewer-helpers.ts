/**
 * LLM reviewer helper utilities
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ReviewedFile, LLMReviewOutput } from './llm-reviewer-types';
import type { LLMReviewerCore } from './llm-reviewer-core';

// Constants
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const GIT_COMMAND_TIMEOUT_MS = 15000;
const MAX_BUFFER_SIZE_BYTES = BYTES_PER_KB * KB_PER_MB; // 1MB

/**
 * Validate project root path security
 */
export function validateProjectRoot(projectRoot: string): void {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new Error('Invalid projectRoot: must be non-empty string');
  }

  // Check dangerous patterns in the original input
  const patterns = [/\.\.[/\\]/, /[/\\]\.\.[/\\]/, /\0/, /%00/, /%2e%2e/i];

  if (patterns.some(pattern => pattern.test(projectRoot))) {
    throw new Error('Invalid projectRoot: dangerous patterns detected');
  }

  const resolvedPath = path.resolve(projectRoot);
  const normalizedPath = path.normalize(resolvedPath);

  // Also check the normalized path for safety
  if (patterns.some(pattern => pattern.test(normalizedPath))) {
    throw new Error('Invalid projectRoot: dangerous patterns detected');
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Invalid projectRoot: ${resolvedPath} not a directory`);
  }
}

/**
 * Get changed files from git
 */
export function getChangedFiles(projectRoot: string): string[] {
  validateProjectRoot(projectRoot);

  try {
    const resolvedPath = path.resolve(projectRoot);
    const output = execSync('git diff --cached --name-only', {
      cwd: resolvedPath,
      encoding: 'utf-8',
      timeout: GIT_COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER_SIZE_BYTES,
    });

    const files = output
      .trim()
      .split('\n')
      .map(f => f.trim()) // Trim whitespace from each line
      .filter(f => f && /\.(ts|js|tsx|jsx|mts|cts|mjs|cjs)$/i.test(f));
    if (files.length > 0) {
      console.error(`Found ${files.length} changed files for review`);
    }
    return files;
  } catch (error) {
    console.warn(
      'Failed to get changed files:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}

/**
 * Create empty result for no files
 */
export function createEmptyResult(): LLMReviewOutput {
  console.error('No changed files to review');
  return {
    structuredData: {
      files: [],
      summary: {
        totalFiles: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        totalIssues: 0,
      },
    },
    textReport: 'No files to review',
  };
}

/**
 * Create error result
 */
export function createErrorResult(error: unknown): LLMReviewOutput {
  console.error('LLM review failed:', error);
  return {
    structuredData: {
      files: [],
      summary: {
        totalFiles: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        totalIssues: 0,
      },
    },
    textReport: `Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  };
}

/**
 * Review a single file with security checks
 */
export async function reviewSingleFile(
  core: LLMReviewerCore,
  projectRoot: string,
  file: string
): Promise<ReviewedFile | null> {
  const filePath = path.resolve(projectRoot, file);

  if (!filePath.startsWith(path.resolve(projectRoot))) {
    console.warn(`Skipping file outside project root: ${file}`);
    return null;
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`File ${filePath} not found`);
    return null;
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const result = await core.reviewCode(file, content);
    return { file, result };
  } catch (coreError) {
    console.warn(
      `Review failed for ${file}:`,
      coreError instanceof Error ? coreError.message : coreError
    );
    return null;
  }
}
