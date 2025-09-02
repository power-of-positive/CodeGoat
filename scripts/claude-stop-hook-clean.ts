#!/usr/bin/env npx tsx

/**
 * Clean Claude Code Stop Hook - Runs validation and outputs clean JSON decision
 */

import { execSync } from 'child_process';

// Set working directory
const projectRoot = '/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat';
process.chdir(projectRoot);

// Simple validation - just check if there are uncommitted files
function hasUncommittedFiles(): boolean {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' }) || '';
    const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' }) || '';
    const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8' }) || '';
    
    return [staged, unstaged, untracked].filter(Boolean).join('\n').trim().length > 0;
  } catch {
    return false;
  }
}

try {
  // Check for uncommitted files
  if (hasUncommittedFiles()) {
    process.stdout.write('{"decision": "block", "reason": "Uncommitted files detected - please commit changes"}\n');
    process.exit(2);
  }

  // If we get here, allow completion
  process.stdout.write('{"decision": "approve"}\n');
  process.exit(0);
  
} catch {
  process.stdout.write('{"decision": "block", "reason": "Stop hook execution failed"}\n');
  process.exit(2);
}