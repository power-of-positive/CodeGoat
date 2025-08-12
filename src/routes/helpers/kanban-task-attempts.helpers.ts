import { Request, Response } from 'express';
import { 
  ApiResponse, 
  TaskAttempt, 
  BranchStatus,
  WorktreeDiff
} from '../../types/kanban.types';
import { ILogger } from '../../logger-interface';
import { KanbanDatabaseService } from '../../services/kanban-database.service';
import { mapPrismaTaskAttemptToApi } from '../../utils/kanban-mappers';
import { z } from 'zod';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Validation schemas
export const CreateTaskAttemptSchema = z.object({
  executor: z.string().min(1, 'Executor is required'),
  base_branch: z.string().default('main').optional(),
});

export const CreateFollowUpAttemptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

// Helper functions
export function createErrorResponse<T>(message: string): ApiResponse<T> {
  return {
    success: false,
    data: null,
    error_data: null,
    message,
  };
}

export function createSuccessResponse<T>(data: T, message: string | null = null): ApiResponse<T> {
  return {
    success: true,
    data,
    error_data: null,
    message,
  };
}

export function validateUUIDs(project_id: string, task_id: string): { valid: boolean; response?: ApiResponse<any> } {
  const projectIdValidation = z.string().uuid().safeParse(project_id);
  const taskIdValidation = z.string().uuid().safeParse(task_id);
  
  if (!projectIdValidation.success || !taskIdValidation.success) {
    return {
      valid: false,
      response: createErrorResponse('Invalid project or task ID format')
    };
  }
  
  return { valid: true };
}

/**
 * Create git worktree for isolated development
 */
export async function createWorktree(
  repoPath: string,
  branchName: string,
  worktreePath: string,
  baseBranch: string = 'main'
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure worktrees directory exists
    const worktreesDir = path.dirname(worktreePath);
    if (!fs.existsSync(worktreesDir)) {
      fs.mkdirSync(worktreesDir, { recursive: true });
    }

    // Create worktree with new branch
    const git = spawn('git', [
      'worktree', 'add', '-b', branchName, worktreePath, baseBranch
    ], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let errorOutput = '';

    git.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Git worktree creation failed: ${errorOutput}`));
      }
    });

    git.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get git branch status compared to base branch
 */
export async function getBranchStatus(
  repoPath: string,
  branchName: string,
  baseBranch: string
): Promise<BranchStatus> {
  return new Promise((resolve, reject) => {
    // Get commits ahead/behind info
    const git = spawn('git', [
      'rev-list', '--left-right', '--count', `${baseBranch}...${branchName}`
    ], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        const [behind, ahead] = output.trim().split('\t').map(Number);
        
        const status: BranchStatus = {
          is_behind: behind > 0,
          commits_behind: behind || 0,
          commits_ahead: ahead || 0,
          up_to_date: behind === 0 && ahead === 0,
          merged: ahead === 0, // Branch is merged if no commits ahead
          has_uncommitted_changes: false, // Basic implementation - could be enhanced
          base_branch_name: baseBranch,
        };

        resolve(status);
      } else {
        reject(new Error(`Git status command failed: ${errorOutput}`));
      }
    });

    git.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get diff changes for worktree
 */
export async function getWorktreeDiff(repoPath: string, branchName: string): Promise<WorktreeDiff> {
  return new Promise((resolve, _reject) => {
    const git = spawn('git', ['diff', '--name-only', `origin/main...${branchName}`], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';

    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.stderr.on('data', (_data) => {
      // Error handling could be implemented here
    });

    git.on('close', (code) => {
      if (code === 0) {
        const changedFiles = output.trim().split('\n').filter(line => line.trim());
        
        // For now, return simplified diff structure
        // In a full implementation, would get actual diff content
        const files = changedFiles.map(filePath => ({
          path: filePath,
          chunks: [{
            chunk_type: 'Insert' as const,
            content: `Modified: ${filePath}`,
          }],
        }));

        resolve({ files });
      } else {
        // Return empty diff on error rather than rejecting
        resolve({ files: [] });
      }
    });

    git.on('error', () => {
      resolve({ files: [] });
    });
  });
}