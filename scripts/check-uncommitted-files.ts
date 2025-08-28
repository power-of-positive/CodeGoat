#!/usr/bin/env node
/**
 * Check for uncommitted files to encourage periodic progressive commits
 *
 * This script checks if there are uncommitted changes in the git repository.
 * It helps enforce good development practices by encouraging developers to
 * commit their work regularly rather than accumulating large changesets.
 *
 * The script allows a small number of uncommitted files to accommodate
 * ongoing work but warns when there are too many changes.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface UncommittedFilesConfig {
  // Maximum number of modified files allowed before warning
  maxModifiedFiles: number;
  // Maximum number of untracked files allowed before warning
  maxUntrackedFiles: number;
  // Files to ignore in the check (patterns)
  ignorePatterns: string[];
  // Whether to fail the check or just warn
  failOnExcess: boolean;
}

const DEFAULT_CONFIG: UncommittedFilesConfig = {
  maxModifiedFiles: 0,
  maxUntrackedFiles: 0,
  ignorePatterns: [
    'validation-metrics.json',
    'validation-sessions.json',
    '*.log',
    'logs/**',
    'node_modules/**',
    '.next/**',
    'dist/**',
    'build/**',
    '*.tmp',
    '*.temp',
  ],
  failOnExcess: true, // Fail validation if any uncommitted files exist
};

function loadConfig(): UncommittedFilesConfig {
  const configPath = path.join(process.cwd(), 'uncommitted-files-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...configData };
    } catch {
      console.warn('⚠️  Failed to load uncommitted files config, using defaults');
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

function shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => {
    // Simple glob pattern matching
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    } else if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

function isInPreCommitContext(): boolean {
  return Boolean(
    process.env.HUSKY_GIT_PARAMS ||
    process.env.GIT_PARAMS ||
    process.argv.includes('--pre-commit') ||
    process.env.HUSKY || // Husky sets this environment variable
    process.env.PRE_COMMIT || // Alternative detection
    process.env.npm_lifecycle_event === 'precommit'
  );
}

function getModifiedFiles(isPreCommit: boolean): string[] {
  if (isPreCommit) {
    // During pre-commit: only check unstaged changes (staged changes are expected)
    const unstagedOutput = execSync('git diff --name-only', { encoding: 'utf-8' }).trim();
    return unstagedOutput ? unstagedOutput.split('\n') : [];
  } else {
    // Normal mode: check all changes since last commit
    const modifiedOutput = execSync('git diff --name-only HEAD', { encoding: 'utf-8' }).trim();
    return modifiedOutput ? modifiedOutput.split('\n') : [];
  }
}

function getUntrackedFiles(): string[] {
  const untrackedOutput = execSync('git ls-files --others --exclude-standard', {
    encoding: 'utf-8',
  }).trim();
  return untrackedOutput ? untrackedOutput.split('\n') : [];
}

// Execute git status retrieval with error handling
function executeGitStatusRetrieval(): { modified: string[]; untracked: string[] } {
  const isPreCommit = isInPreCommitContext();
  const modified = getModifiedFiles(isPreCommit);
  const untracked = getUntrackedFiles();
  
  return { modified, untracked };
}

// Handle git status errors
function handleGitStatusError(error: unknown): never {
  console.error('❌ Failed to get git status:', error);
  process.exit(1);
}

function getGitStatus(): { modified: string[]; untracked: string[] } {
  try {
    return executeGitStatusRetrieval();
  } catch (error) {
    return handleGitStatusError(error);
  }
}

function formatFileList(files: string[], maxDisplay: number = 10): string {
  if (files.length === 0) {
    return 'none';
  }

  const displayFiles = files.slice(0, maxDisplay);
  const result = displayFiles.map(f => `  - ${f}`).join('\n');

  if (files.length > maxDisplay) {
    return result + `\n  ... and ${files.length - maxDisplay} more`;
  }

  return result;
}

function checkUncommittedFiles(): void {
  console.error('🔍 Checking for uncommitted files...');

  const config = loadConfig();
  const { modified, untracked } = getGitStatus();

  // Filter files based on ignore patterns
  const filteredModified = modified.filter(file => !shouldIgnoreFile(file, config.ignorePatterns));
  const filteredUntracked = untracked.filter(
    file => !shouldIgnoreFile(file, config.ignorePatterns)
  );

  const modifiedCount = filteredModified.length;
  const untrackedCount = filteredUntracked.length;
  const totalCount = modifiedCount + untrackedCount;

  console.error(`📊 Git status summary:`);
  console.error(`  Modified files: ${modifiedCount} (max: ${config.maxModifiedFiles})`);
  console.error(`  Untracked files: ${untrackedCount} (max: ${config.maxUntrackedFiles})`);
  console.error(`  Total uncommitted: ${totalCount}`);

  let hasWarnings = false;
  let shouldFail = false;

  // Check modified files
  if (modifiedCount > config.maxModifiedFiles) {
    console.error(
      `\n⚠️  Warning: Too many modified files (${modifiedCount} > ${config.maxModifiedFiles})`
    );
    console.error('Modified files:');
    console.error(formatFileList(filteredModified));
    hasWarnings = true;
    if (config.failOnExcess) {
      shouldFail = true;
    }
  }

  // Check untracked files
  if (untrackedCount > config.maxUntrackedFiles) {
    console.error(
      `\n⚠️  Warning: Too many untracked files (${untrackedCount} > ${config.maxUntrackedFiles})`
    );
    console.error('Untracked files:');
    console.error(formatFileList(filteredUntracked));
    hasWarnings = true;
    if (config.failOnExcess) {
      shouldFail = true;
    }
  }

  // Provide guidance
  if (hasWarnings) {
    console.error('\n💡 Consider committing your changes to maintain clean development workflow:');
    if (modifiedCount > 0) {
      console.error('   git add <files>');
      console.error('   git commit -m "your commit message"');
    }
    if (untrackedCount > 0) {
      console.error('   git add <new-files>  # for files you want to track');
      console.error('   # or add to .gitignore if they should not be tracked');
    }
    console.error('\n📈 Regular commits help with:');
    console.error('   • Better change tracking and rollback capabilities');
    console.error('   • Easier code review process');
    console.error('   • Reduced risk of losing work');
    console.error('   • Better collaboration with team members');
  }

  if (shouldFail) {
    console.error('\n❌ Uncommitted files check failed due to configuration settings');
    process.exit(1);
  } else if (hasWarnings) {
    console.error('\n✅ Uncommitted files check completed with warnings');
  } else {
    console.error('\n✅ Uncommitted files check passed - good job keeping things clean!');
  }
}

// Run the check
if (require.main === module) {
  checkUncommittedFiles();
}

export { checkUncommittedFiles, DEFAULT_CONFIG, loadConfig };
