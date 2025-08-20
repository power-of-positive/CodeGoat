/**
 * File filtering utilities for script validation
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Sanitize file path to prevent security issues
 */
export function sanitizeFilePath(file: string, projectRoot: string): string {
  if (!file || typeof file !== 'string') {
    throw new Error('Invalid file path: must be non-empty string');
  }

  if (/[`$;|&<>\n\r]/.test(file)) {
    throw new Error(`Invalid file path: contains dangerous characters`);
  }

  const resolved = path.resolve(projectRoot, file);
  const normalized = path.normalize(resolved);
  const projectRootNormalized = path.normalize(path.resolve(projectRoot)) + path.sep;

  if (!normalized.startsWith(projectRootNormalized)) {
    throw new Error(`Invalid file path: ${file} is outside project root`);
  }

  return path.relative(projectRoot, normalized);
}

/**
 * Filter out invalid files from script files list
 */
export function filterValidFiles(projectRoot: string, scriptFiles: string[]): string[] {
  if (!Array.isArray(scriptFiles)) return [];
  const validFiles: string[] = [];
  for (const file of scriptFiles) {
    try {
      const sanitizedFile = sanitizeFilePath(file, projectRoot);
      if (fs.existsSync(path.join(projectRoot, sanitizedFile))) validFiles.push(sanitizedFile);
    } catch {
      console.warn(`Skipping invalid file: ${file}`);
    }
  }
  return validFiles;
}

/**
 * Filter files that should be included in coverage analysis
 */
export function filterCoverageFiles(projectRoot: string, scriptFiles: string[]): string[] {
  if (!Array.isArray(scriptFiles)) return [];
  const validFiles: string[] = [];

  for (const file of scriptFiles) {
    try {
      const sanitized = sanitizeFilePath(file, projectRoot);
      if (
        sanitized.endsWith('.ts') &&
        !sanitized.includes('.test.') &&
        !sanitized.includes('.spec.') &&
        !sanitized.includes('.d.ts')
      ) {
        validFiles.push(
          sanitized.startsWith('scripts/') ? sanitized.substring('scripts/'.length) : sanitized
        );
      }
    } catch {
      console.warn(`Skipping file for coverage: ${file}`);
    }
  }

  return validFiles;
}
