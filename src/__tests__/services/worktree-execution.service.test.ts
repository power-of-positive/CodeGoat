import { WorktreeExecutionService, WorktreeConfig, ExecutionOptions } from '../../services/worktree-execution.service';
import { KanbanDatabaseService } from '../../services/kanban-database.service';
import { AgentExecutorService } from '../../services/agent-executor.service';
import { ILogger } from '../../logger-interface';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('path');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFs = fs as jest.Mocked<typeof fs>;

const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  middleware: jest.fn().mockReturnValue(jest.fn()),
};

const mockPrisma = {
  taskAttempt: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockKanbanDb: KanbanDatabaseService = {
  getClient: jest.fn().mockReturnValue(mockPrisma),
} as any;

const mockAgentExecutor = {
  getProfile: jest.fn().mockReturnValue({
    type: 'claude',
    name: 'Claude Default',
    command: ['claude'],
    timeout: 30 * 60 * 1000
  }),
  executeAgent: jest.fn(),
  getAvailableProfiles: jest.fn(),
  addCustomProfile: jest.fn(),
  killExecution: jest.fn(),
  getActiveExecutions: jest.fn(),
  shutdown: jest.fn(),
} as any;

// Mock child process
const mockChildProcess = {
  stdout: {
    on: jest.fn(),
  },
  stderr: {
    on: jest.fn(),
  },
  on: jest.fn(),
  kill: jest.fn(),
};

describe('WorktreeExecutionService', () => {
  let service: WorktreeExecutionService;
  let mockConfig: WorktreeConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    service = new WorktreeExecutionService(mockLogger, mockKanbanDb, mockAgentExecutor, 1000); // 1 second for testing
    
    mockConfig = {
      projectPath: '/test/project',
      taskId: 'task-123',
      taskTitle: 'Test Task',
      taskDescription: 'Test description',
      branchName: 'task-branch-123',
      worktreePath: '/test/worktrees/task-branch-123',
      baseBranch: 'main',
      agentProfile: 'default',
    };

    // Setup default mock behavior
    mockSpawn.mockReturnValue(mockChildProcess as any);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockPrisma.taskAttempt.findFirst.mockResolvedValue({
      id: 'attempt-123',
      taskId: 'task-123',
      status: 'RUNNING',
    });
    mockPrisma.taskAttempt.update.mockResolvedValue({});
    
    // Reset agent executor mock to default successful behavior
    mockAgentExecutor.executeAgent.mockResolvedValue({
      success: true,
      exitCode: 0,
      stdout: 'Task completed successfully',
      stderr: '',
      duration: 5000,
      agentType: 'claude',
      profileName: 'claude-default'
    });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('executeInWorktree', () => {
    it('should successfully execute Claude Code in worktree', async () => {
      // Mock successful git commands
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Successful git command
          }
        }),
        stdout: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('abc123def456\n'); // Mock commit hash
            }
          })
        },
        stderr: { on: jest.fn() },
      };

      mockSpawn
        .mockReturnValue(mockGitProcess as any); // All git commands

      const result = await service.executeInWorktree(mockConfig);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Task completed successfully');
      
      // Verify agent executor was called with correct parameters
      expect(mockAgentExecutor.executeAgent).toHaveBeenCalledWith({
        profile: expect.objectContaining({
          type: 'claude',
          name: 'Claude Default'
        }),
        workingDirectory: mockConfig.worktreePath,
        prompt: `Task: ${mockConfig.taskTitle}\n\nDescription: ${mockConfig.taskDescription}\n\nPlease help me implement this task. Review the codebase, understand the requirements, and make the necessary changes.`,
        timeout: undefined
      });

      expect(mockPrisma.taskAttempt.update).toHaveBeenLastCalledWith({
        where: { id: 'attempt-123' },
        data: { status: 'COMPLETED', stdout: 'Task completed successfully', stderr: '', completedAt: expect.any(Date) },
      });
    });

    it('should handle worktree creation failure', async () => {
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Failed git command
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('fatal: not a git repository\n');
            }
          })
        },
      };

      mockSpawn.mockReturnValueOnce(mockGitProcess as any); // git rev-parse --git-dir fails

      const result = await service.executeInWorktree(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project path is not a valid git repository');
      
      expect(mockPrisma.taskAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          stdout: undefined,
          stderr: undefined,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should handle Claude Code execution failure', async () => {
      // Mock successful git commands for setup
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
      };

      // Mock failed agent execution
      mockAgentExecutor.executeAgent.mockResolvedValueOnce({
        success: false,
        exitCode: 1,
        stdout: 'Claude Code stdout',
        stderr: 'Claude Code error',
        duration: 5000,
        agentType: 'claude',
        profileName: 'claude-default',
        error: 'Execution failed'
      });

      mockSpawn.mockReturnValue(mockGitProcess as any);

      const result = await service.executeInWorktree(mockConfig);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('Claude Code stdout');
      expect(result.stderr).toBe('Claude Code error');

      expect(mockPrisma.taskAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          stdout: 'Claude Code stdout',
          stderr: 'Claude Code error',
        }),
      });
    });

    it('should handle execution timeout', async () => {
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
      };

      // Mock agent execution that times out
      mockAgentExecutor.executeAgent.mockResolvedValueOnce({
        success: false,
        exitCode: 143, // SIGTERM exit code
        stdout: '',
        stderr: 'Process timed out',
        duration: 100,
        agentType: 'claude',
        profileName: 'claude-default',
        error: 'Process timed out'
      });

      mockSpawn.mockReturnValue(mockGitProcess as any);

      const options: ExecutionOptions = { timeout: 100 }; // Very short timeout
      
      const result = await service.executeInWorktree(mockConfig, options);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(143); // SIGTERM exit code
      expect(mockAgentExecutor.executeAgent).toHaveBeenCalledWith(expect.objectContaining({
        timeout: 100
      }));
    }, 10000);

    it('should skip auto-commit when disabled', async () => {
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
      };

      const mockClaudeProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 50);
          }
        }),
        kill: jest.fn(),
      };

      mockSpawn
        .mockReturnValueOnce(mockGitProcess as any) // git rev-parse --git-dir
        .mockReturnValueOnce(mockGitProcess as any) // git worktree add
        .mockReturnValueOnce(mockClaudeProcess as any); // claude-code

      const options: ExecutionOptions = { autoCommit: false };
      const result = await service.executeInWorktree(mockConfig, options);

      expect(result.success).toBe(true);
      expect(result.commitHash).toBeUndefined();
      
      // Should not call git commit commands
      expect(mockSpawn).not.toHaveBeenCalledWith('git', 
        expect.arrayContaining(['commit']), 
        expect.any(Object)
      );
    });
  });

  describe('stopExecution', () => {
    it('should stop active execution', async () => {
      const mockClaudeProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      };

      // Simulate active execution
      service['activeExecutions'].set('task-123', mockClaudeProcess as any);

      await service.stopExecution('task-123');

      expect(mockClaudeProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockPrisma.taskAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-123' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should handle stopping non-existent execution', async () => {
      await service.stopExecution('non-existent-task');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No active execution found for task',
        { taskId: 'non-existent-task' }
      );
    });
  });

  describe('getActiveExecutions', () => {
    it('should return list of active execution task IDs', () => {
      const mockProcess = { kill: jest.fn() };
      service['activeExecutions'].set('task-1', mockProcess as any);
      service['activeExecutions'].set('task-2', mockProcess as any);

      const active = service.getActiveExecutions();
      
      expect(active).toContain('task-1');
      expect(active).toContain('task-2');
      expect(active.length).toBe(2);
    });

    it('should return empty array when no executions are active', () => {
      const active = service.getActiveExecutions();
      expect(active).toEqual([]);
    });
  });

  describe('cleanup and resource management', () => {
    it('should perform periodic cleanup', async () => {
      const cleanupService = new WorktreeExecutionService(mockLogger, mockKanbanDb, mockAgentExecutor, 100); // Shorter interval for testing
      
      // Schedule some worktrees for cleanup
      cleanupService['scheduleWorktreeCleanup']('/test/worktree1');
      cleanupService['scheduleWorktreeCleanup']('/test/worktree2');

      // Mock successful git worktree remove
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            process.nextTick(() => callback(0));
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
      };
      mockSpawn.mockReturnValue(mockGitProcess as any);

      // Manually trigger cleanup
      await cleanupService['performCleanup']();

      expect(mockSpawn).toHaveBeenCalledWith('git', 
        ['worktree', 'remove', '/test/worktree1', '--force'], 
        expect.any(Object)
      );
      expect(mockSpawn).toHaveBeenCalledWith('git',
        ['worktree', 'remove', '/test/worktree2', '--force'],
        expect.any(Object)
      );

      cleanupService.destroy();
    });

    it('should destroy service cleanly', () => {
      const mockProcess = {
        kill: jest.fn(),
      };
      
      service['activeExecutions'].set('task-1', mockProcess as any);
      
      service.destroy();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock successful execution first
      const mockGitProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            process.nextTick(() => callback(0));
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
      };

      const mockClaudeProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            process.nextTick(() => callback(0));
          }
        }),
        kill: jest.fn(),
      };

      mockSpawn
        .mockReturnValueOnce(mockGitProcess as any) // git rev-parse
        .mockReturnValueOnce(mockGitProcess as any) // git worktree add
        .mockReturnValueOnce(mockClaudeProcess as any); // claude-code

      // Make the findFirst call fail
      mockPrisma.taskAttempt.findFirst.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await service.executeInWorktree(mockConfig, { autoCommit: false });

      expect(result.success).toBe(true); // Should still succeed despite DB error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update task attempt status',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle file system errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await service.executeInWorktree(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });
});