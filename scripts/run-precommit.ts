#!/usr/bin/env npx tsx

/**
 * Claude Code Pre-commit Hook Script
 * This script runs the same checks as the git pre-commit hook
 */

import * as process from 'process';
import { runPrecommitChecks } from './lib';

async function main(): Promise<void> {
  try {
    // Set environment to prevent coverage recursion and enable E2E tests
    process.env.NODE_ENV = 'precommit';
    process.env.CI = 'true';

    const result = await runPrecommitChecks();

    if (result.decision === 'block') {
      console.error(JSON.stringify(result));
      process.exit(2);
    } else {
      console.log('✅ All pre-commit checks passed!');
      console.error(JSON.stringify(result));
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running precommit checks:', error);
    process.exit(1);
  }
}

// Run the checks
main().catch(error => {
  console.error('Error running precommit checks:', error);
  process.exit(1);
});
