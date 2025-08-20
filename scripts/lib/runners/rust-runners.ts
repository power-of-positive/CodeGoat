/**
 * Rust-specific check runners
 */

import * as path from 'path';
import { execCommand } from '../utils/command-utils';
import { validateDirectoryExists } from '../utils/validation-utils';
import { CheckResult } from '../utils/types';

/**
 * Run Rust code formatting checks
 */
export function runRustFormatting(projectRoot: string): CheckResult {
  console.log('🦀 Running Rust formatting...');
  const backendDir = path.join(projectRoot, 'backend');
  validateDirectoryExists(backendDir);
  return execCommand('cargo fmt --check --manifest-path backend/Cargo.toml', projectRoot);
}

/**
 * Run Rust linting checks (clippy)
 */
export function runRustLinting(projectRoot: string): CheckResult {
  console.log('🔍 Running Rust linting (clippy)...');
  const backendDir = path.join(projectRoot, 'backend');
  validateDirectoryExists(backendDir);
  return execCommand(
    'cargo clippy --manifest-path backend/Cargo.toml --all-targets -- -D warnings',
    projectRoot
  );
}
