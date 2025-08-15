/**
 * Git utility functions for repository operations
 */

import { spawn } from 'child_process';
import { GitBranch } from '../types/kanban.types';

/**
 * Get current git branch for a repository
 * @param repoPath - Path to the git repository
 * @returns Current branch name or undefined if not found
 */
export async function getCurrentBranch(repoPath: string): Promise<string | undefined> {
  return new Promise(resolve => {
    const git = spawn('git', ['branch', '--show-current'], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';
    git.stdout.on('data', data => {
      output += data.toString();
    });

    git.on('close', code => {
      if (code === 0) {
        resolve(output.trim() || undefined);
      } else {
        resolve(undefined);
      }
    });

    git.on('error', () => {
      resolve(undefined);
    });
  });
}

/**
 * Get all git branches for a repository
 * @param repoPath - Path to the git repository
 * @returns Array of git branches with metadata
 */
export async function getGitBranches(repoPath: string): Promise<GitBranch[]> {
  return new Promise((resolve, reject) => {
    const git = spawn(
      'git',
      ['branch', '-a', '--format=%(refname:short),%(HEAD),%(upstream:short),%(committerdate)'],
      {
        cwd: repoPath,
        stdio: 'pipe',
      }
    );

    let output = '';
    let errorOutput = '';

    git.stdout.on('data', data => {
      output += data.toString();
    });

    git.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    git.on('close', code => {
      if (code === 0) {
        const branches = parseBranchOutput(output);
        const uniqueBranches = removeDuplicateBranches(branches);
        resolve(uniqueBranches);
      } else {
        reject(new Error(`Git command failed: ${errorOutput}`));
      }
    });

    git.on('error', error => {
      reject(error);
    });
  });
}

/**
 * Parse git branch command output into GitBranch objects
 * @param output - Raw output from git branch command
 * @returns Array of parsed git branches
 */
function parseBranchOutput(output: string): GitBranch[] {
  const branches: GitBranch[] = [];
  const lines = output
    .trim()
    .split('\n')
    .filter(line => line.trim());

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 4) {
      const name = parts[0].replace('origin/', '');
      const isCurrent = parts[1] === '*';
      const isRemote = parts[0].startsWith('origin/');
      const dateStr = parts[3];

      // Skip remote HEAD references and arrow references
      if (name === 'HEAD' || name.includes('->')) {
        continue;
      }

      branches.push({
        name,
        is_current: isCurrent,
        is_remote: isRemote,
        last_commit_date: new Date(dateStr || new Date()),
      });
    }
  }

  return branches;
}

/**
 * Remove duplicate branches (local and remote versions of same branch)
 * @param branches - Array of branches potentially containing duplicates
 * @returns Array with duplicates removed, preferring current branch info
 */
function removeDuplicateBranches(branches: GitBranch[]): GitBranch[] {
  return branches.reduce((acc: GitBranch[], branch) => {
    const existing = acc.find(b => b.name === branch.name);
    if (!existing) {
      acc.push(branch);
    } else if (branch.is_current) {
      // Prefer current branch info
      const index = acc.findIndex(b => b.name === branch.name);
      acc[index] = branch;
    }
    return acc;
  }, []);
}