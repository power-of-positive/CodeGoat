/**
 * Centralized result utility functions for creating consistent check results
 */

import { CheckResult } from './types';

/**
 * Create a successful check result
 */
export function createSuccessResult(message: string): CheckResult {
  return { success: true, output: message };
}

/**
 * Create a failed check result
 */
export function createFailureResult(message: string): CheckResult {
  return { success: false, output: message };
}
