/**
 * Helper functions for WorktreeExecutionService
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Run git command and return output
 */
export async function runGitCommand(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const git = spawn('git', args, {
      cwd,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    git.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    git.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Git command failed: ${stderr}`));
      }
    });

    git.on('error', reject);
  });
}

/**
 * Check if directory is a git repository
 */
export async function isGitRepository(projectPath: string): Promise<boolean> {
  try {
    await runGitCommand(projectPath, ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up a specific worktree
 */
export async function cleanupWorktree(worktreePath: string): Promise<void> {
  try {
    // First try to remove the worktree using git
    const parentDir = path.dirname(worktreePath);
    await runGitCommand(parentDir, ['worktree', 'remove', worktreePath, '--force']);
    
  } catch {
    // If git worktree remove fails, try manual cleanup
    await fs.rm(worktreePath, { recursive: true, force: true });
  }
}

/**
 * Setup Claude Code process arguments
 */
export function buildClaudeArgs(config: {
  worktreePath: string;
  claudeProfile?: string;
  taskTitle: string;
  taskDescription?: string;
}): string[] {
  const claudeArgs = ['--directory', config.worktreePath];
  
  if (config.claudeProfile) {
    claudeArgs.push('--profile', config.claudeProfile);
  }

  const taskPrompt = `Task: ${config.taskTitle}${config.taskDescription ? `\n\nDescription: ${config.taskDescription}` : ''}`;
  claudeArgs.push('--prompt', taskPrompt);

  return claudeArgs;
}