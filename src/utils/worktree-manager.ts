import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ILogger } from '../logger-interface';

export interface WorktreeConfig {
  taskId: string;
  workerId: string;
  basePath?: string;
}

export class WorktreeManager {
  private readonly logger?: ILogger;
  private readonly basePath: string;
  private readonly gitRoot: string;

  constructor(basePath?: string, logger?: ILogger, gitRoot?: string) {
    this.basePath = basePath ?? path.join(path.dirname(process.cwd()), 'claude-worktrees');
    this.gitRoot = gitRoot ?? process.cwd();
    this.logger = logger;
  }

  /**
   * Create a new Git worktree for the given task
   */
  async createWorktree(config: WorktreeConfig): Promise<string> {
    const { taskId, workerId } = config;
    const worktreeId = `${taskId}-${workerId.split('-').pop()}`;
    const worktreePath = path.join(this.basePath, `worktree-${worktreeId}`);

    this.logger?.info('Creating worktree', { taskId, workerId, worktreePath });

    try {
      // Ensure the base directory exists
      await fs.promises.mkdir(this.basePath, { recursive: true });

      // Check if this is a Git repository
      const isGitRepo = await this.isGitRepository();

      if (isGitRepo) {
        // Create Git worktree
        await this.executeGitCommand(['worktree', 'add', worktreePath, 'HEAD']);
        this.logger?.info('Created Git worktree', { worktreePath });
      } else {
        // Fallback: create regular directory and copy files
        await this.createFallbackWorktree(worktreePath);
        this.logger?.info('Created fallback worktree (not a Git repository)', { worktreePath });
      }

      return worktreePath;
    } catch (error) {
      this.logger?.error('Failed to create worktree', error as Error, {
        taskId,
        workerId,
        worktreePath,
      });
      throw error;
    }
  }

  /**
   * Remove a Git worktree
   */
  async removeWorktree(worktreePath: string): Promise<void> {
    this.logger?.info('Removing worktree', { worktreePath });

    try {
      const isGitRepo = await this.isGitRepository();

      if (isGitRepo && (await this.isGitWorktree(worktreePath))) {
        // Remove Git worktree
        await this.executeGitCommand(['worktree', 'remove', worktreePath, '--force']);
        this.logger?.info('Removed Git worktree', { worktreePath });
      } else {
        // Remove regular directory
        await fs.promises.rm(worktreePath, { recursive: true, force: true });
        this.logger?.info('Removed fallback worktree', { worktreePath });
      }
    } catch (error) {
      this.logger?.error('Failed to remove worktree', error as Error, { worktreePath });
      throw error;
    }
  }

  /**
   * List all worktrees
   */
  async listWorktrees(): Promise<string[]> {
    try {
      const isGitRepo = await this.isGitRepository();

      if (isGitRepo) {
        // List Git worktrees
        const output = await this.executeGitCommand(['worktree', 'list', '--porcelain']);
        return this.parseWorktreeList(output);
      } else {
        // List directories in base path
        const dirs = await fs.promises.readdir(this.basePath, { withFileTypes: true });
        return dirs
          .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('worktree-'))
          .map(dirent => path.join(this.basePath, dirent.name));
      }
    } catch (error) {
      this.logger?.error('Failed to list worktrees', error as Error);
      return [];
    }
  }

  /**
   * Clean up all worktrees
   */
  async cleanupWorktrees(): Promise<number> {
    let cleanedCount = 0;

    try {
      const worktrees = await this.listWorktrees();

      for (const worktreePath of worktrees) {
        try {
          // Skip the main worktree (current directory)
          if (path.resolve(worktreePath) === path.resolve(process.cwd())) {
            continue;
          }

          await this.removeWorktree(worktreePath);
          cleanedCount++;
        } catch (error) {
          this.logger?.warn?.('Failed to cleanup worktree', {
            worktreePath,
            error: (error as Error).message,
          });
        }
      }

      this.logger?.info('Worktree cleanup completed', { cleanedCount });
      return cleanedCount;
    } catch (error) {
      this.logger?.error('Failed to cleanup worktrees', error as Error);
      return cleanedCount;
    }
  }

  /**
   * Check if current directory is a Git repository
   */
  private async isGitRepository(): Promise<boolean> {
    try {
      await this.executeGitCommand(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a Git worktree
   */
  private async isGitWorktree(worktreePath: string): Promise<boolean> {
    try {
      const worktrees = await this.executeGitCommand(['worktree', 'list', '--porcelain']);
      return worktrees.includes(worktreePath);
    } catch {
      return false;
    }
  }

  /**
   * Create a fallback worktree by copying essential files
   */
  private async createFallbackWorktree(worktreePath: string): Promise<void> {
    // Create the directory
    await fs.promises.mkdir(worktreePath, { recursive: true });

    // Copy essential files
    const filesToCopy = ['package.json', 'tsconfig.json', '.gitignore', 'README.md'];

    for (const file of filesToCopy) {
      const srcPath = path.join(process.cwd(), file);
      const destPath = path.join(worktreePath, file);

      try {
        const stat = await fs.promises.stat(srcPath);
        if (stat.isFile()) {
          await fs.promises.copyFile(srcPath, destPath);
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    // Copy src directory with key files
    const srcDir = path.join(process.cwd(), 'src');
    const destSrcDir = path.join(worktreePath, 'src');

    try {
      const srcStat = await fs.promises.stat(srcDir);
      if (srcStat.isDirectory()) {
        await fs.promises.mkdir(destSrcDir, { recursive: true });

        // Copy only key files to avoid large directories
        const keyFiles = ['index.ts', 'server.ts', 'types.ts'];
        for (const file of keyFiles) {
          const srcFile = path.join(srcDir, file);
          const destFile = path.join(destSrcDir, file);

          try {
            await fs.promises.copyFile(srcFile, destFile);
          } catch {
            // File doesn't exist, skip
          }
        }
      }
    } catch {
      // src directory doesn't exist, skip
    }
  }

  /**
   * Execute a Git command
   */
  private async executeGitCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('git', args, {
        cwd: this.gitRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse Git worktree list output
   */
  private parseWorktreeList(output: string): string[] {
    const worktrees: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        const worktreePath = line.substring(9); // Remove 'worktree ' prefix
        worktrees.push(worktreePath);
      }
    }

    return worktrees;
  }

  /**
   * Get the base path for worktrees
   */
  getBasePath(): string {
    return this.basePath;
  }
}
