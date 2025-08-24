/**
 * Playwright test coverage validation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { execCommand } from './utils/review-utils';

export function checkPlaywrightCoverage(files: string): string {
  const fileList = files
    .trim()
    .split('\n')
    .filter(f => f.trim());
  let comments = '';

  for (const file of fileList) {
    if (!file) {
      continue;
    }

    // Check if it's a UI component file that needs Playwright tests
    if (isUiComponentFile(file) && fs.existsSync(file)) {
      if (!hasPlaywrightTestForUiChange(file)) {
        comments += `- ${file}: UI component changed - requires Playwright E2E test coverage\n`;
      }
    }
  }

  return comments;
}

export function isUiComponentFile(file: string): boolean {
  // Check if it's in frontend component directories
  if (
    file.startsWith('frontend/src/components/') ||
    file.startsWith('frontend/src/pages/') ||
    (file.endsWith('.tsx') && file.startsWith('frontend/'))
  ) {
    return true;
  }

  // Check if file contains JSX/TSX patterns indicating UI components
  if (fs.existsSync(file) && (file.endsWith('.tsx') || file.endsWith('.jsx'))) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/export.*function|export.*const.*=|React\.FC|JSX\.Element|return.*</.test(content)) {
        return true;
      }
    } catch {
      // If we can't read the file, assume it's not a UI component
    }
  }

  return false;
}

export function hasPlaywrightTestForUiChange(_file: string): boolean {
  // For now, check if there are any Playwright tests at all
  const testsDir = path.join(process.cwd(), 'tests');
  if (fs.existsSync(testsDir)) {
    try {
      const testFiles = execCommand('find tests \\( -name "*.spec.ts" -o -name "*.spec.js" \\)');
      return testFiles.trim().length > 0;
    } catch {
      return false;
    }
  }
  return false;
}
