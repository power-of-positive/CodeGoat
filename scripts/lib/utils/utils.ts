/**
 * Utility functions for precommit validation
 */

import { existsSync } from 'fs';
import * as path from 'path';
import * as process from 'process';

export interface PrecommitResult {
  decision: 'block' | 'approve';
  reason?: string;
  feedback?: string;
}

/**
 * Find project root by looking for package.json
 */
export function findProjectRoot(): string {
  let currentDir = process.cwd();

  // Handle Windows root detection
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    try {
      if (existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
    } catch (error) {
      console.warn(`Error accessing directory ${currentDir}:`, error);
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  // Return null if package.json not found instead of process.cwd()
  throw new Error('Could not find project root with package.json');
}
