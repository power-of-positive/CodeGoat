import { jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ClaudeCodeExecutor, ClaudeExecutorOptions, ClaudeExecutorResult } from '../claude-executor';
import { WinstonLogger } from '../../logger-winston';

// Mock child_process
jest.mock('child_process');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Create a mock ChildProcess that extends EventEmitter
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    write: jest.fn(),
    end: jest.fn(),
  };

  constructor() {
    super();
  }
}

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as WinstonLogger;

describe('ClaudeCodeExecutor', () => {
  let executor: ClaudeCodeExecutor;
  let mockChildProcess: MockChildProcess;
  const defaultOptions: ClaudeExecutorOptions = {
    worktreeDir: '/tmp/test-worktree',
    claudeCommand: 'npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockChildProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockChildProcess as unknown as ChildProcess);
    executor = new ClaudeCodeExecutor(defaultOptions, mockLogger);
  });

  describe('constructor', () => {
    it('should create executor with provided options', () => {
      expect(executor.getWorktreeDir()).toBe(defaultOptions.worktreeDir);
      expect(executor.getClaudeCommand()).toBe(defaultOptions.claudeCommand);
    });

    it('should work without logger', () => {
      const executorWithoutLogger = new ClaudeCodeExecutor(defaultOptions);
      expect(executorWithoutLogger.getWorktreeDir()).toBe(defaultOptions.worktreeDir);
    });
  });

  describe('parseShellCommand', () => {
    it('should parse simple command with arguments', async () => {
      const testPromise = executor.spawn('test');
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        ['-y', '@anthropic-ai/claude-code@latest', '-p', '--dangerously-skip-permissions'],
        {
          cwd: '/tmp/test-worktree',
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
        }
      );

      // Complete the mock process
      mockChildProcess.emit('close', 0, null);
      await testPromise;
    });

    it('should parse command with quoted arguments', async () => {
      const executorWithQuotes = new ClaudeCodeExecutor({
        worktreeDir: '/tmp/test',
        claudeCommand: 'node script.js --flag "value with spaces" --other \'single quotes\''
      });

      const testPromise = executorWithQuotes.spawn('test');

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['script.js', '--flag', 'value with spaces', '--other', 'single quotes'],
        expect.any(Object)
      );

      mockChildProcess.emit('close', 0, null);
      await testPromise;
    });

    it('should handle escaped characters', async () => {
      const executorWithEscapes = new ClaudeCodeExecutor({
        worktreeDir: '/tmp/test',
        claudeCommand: 'echo hello\\ world test\\nline'
      });

      const testPromise = executorWithEscapes.spawn('test');

      expect(mockSpawn).toHaveBeenCalledWith(
        'echo',
        ['hello world', 'testnline'],
        expect.any(Object)
      );

      mockChildProcess.emit('close', 0, null);
      await testPromise;
    });
  });

  describe('spawn', () => {
    it('should successfully execute Claude agent and return result', async () => {
      const prompt = 'Write a hello world program';
      const expectedStdout = 'Hello, World!\n';
      const expectedStderr = 'Debug info\n';

      const spawnPromise = executor.spawn(prompt);

      // Simulate process output
      mockChildProcess.stdout.emit('data', Buffer.from(expectedStdout));
      mockChildProcess.stderr.emit('data', Buffer.from(expectedStderr));
      mockChildProcess.emit('close', 0, null);

      const result: ClaudeExecutorResult = await spawnPromise;

      expect(result).toEqual({
        stdout: expectedStdout,
        stderr: expectedStderr,
        exitCode: 0,
      });

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(prompt);
      expect(mockChildProcess.stdin.end).toHaveBeenCalled();
    });

    it('should handle multiple data chunks', async () => {
      const spawnPromise = executor.spawn('test prompt');

      // Simulate multiple stdout chunks
      mockChildProcess.stdout.emit('data', Buffer.from('chunk1\n'));
      mockChildProcess.stdout.emit('data', Buffer.from('chunk2\n'));
      mockChildProcess.stdout.emit('data', Buffer.from('chunk3'));

      // Simulate multiple stderr chunks
      mockChildProcess.stderr.emit('data', Buffer.from('error1\n'));
      mockChildProcess.stderr.emit('data', Buffer.from('error2'));

      mockChildProcess.emit('close', 0, null);

      const result = await spawnPromise;

      expect(result.stdout).toBe('chunk1\nchunk2\nchunk3');
      expect(result.stderr).toBe('error1\nerror2');
      expect(result.exitCode).toBe(0);
    });

    it('should handle non-zero exit codes', async () => {
      const spawnPromise = executor.spawn('test prompt');

      mockChildProcess.stdout.emit('data', Buffer.from('output'));
      mockChildProcess.stderr.emit('data', Buffer.from('error occurred'));
      mockChildProcess.emit('close', 1, null);

      const result = await spawnPromise;

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('output');
      expect(result.stderr).toBe('error occurred');
    });

    it('should handle null exit code as -1', async () => {
      const spawnPromise = executor.spawn('test prompt');

      mockChildProcess.emit('close', null, 'SIGTERM');

      const result = await spawnPromise;

      expect(result.exitCode).toBe(-1);
    });

    it('should handle process spawn errors', async () => {
      const spawnPromise = executor.spawn('test prompt');

      const error = new Error('Command not found');
      mockChildProcess.emit('error', error);

      await expect(spawnPromise).rejects.toThrow('Failed to start Claude process: Command not found');
    });

    it('should handle missing stdin', async () => {
      // Create a child process without stdin
      const mockChildProcessNoStdin = new MockChildProcess();
      (mockChildProcessNoStdin as any).stdin = null;
      mockSpawn.mockReturnValue(mockChildProcessNoStdin as unknown as ChildProcess);

      const spawnPromise = executor.spawn('test prompt');

      await expect(spawnPromise).rejects.toThrow('Failed to access Claude process stdin');
    });

    it('should log execution details when logger is provided', async () => {
      const spawnPromise = executor.spawn('test prompt');

      mockChildProcess.stdout.emit('data', Buffer.from('output'));
      mockChildProcess.emit('close', 0, null);

      await spawnPromise;

      expect(mockLogger.info).toHaveBeenCalledWith('Starting Claude executor', {
        worktreeDir: '/tmp/test-worktree',
        command: 'npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions'
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Parsed command', {
        executable: 'npx',
        args: ['-y', '@anthropic-ai/claude-code@latest', '-p', '--dangerously-skip-permissions']
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Claude process completed', {
        exitCode: 0,
        signal: null,
        stdoutLength: 6,
        stderrLength: 0
      });
    });

    it('should log data chunks when debug logging is enabled', async () => {
      const spawnPromise = executor.spawn('test prompt');

      const stdoutChunk = 'stdout data';
      const stderrChunk = 'stderr data';

      mockChildProcess.stdout.emit('data', Buffer.from(stdoutChunk));
      mockChildProcess.stderr.emit('data', Buffer.from(stderrChunk));
      mockChildProcess.emit('close', 0, null);

      await spawnPromise;

      expect(mockLogger.debug).toHaveBeenCalledWith('Claude stdout chunk', { chunk: stdoutChunk });
      expect(mockLogger.debug).toHaveBeenCalledWith('Claude stderr chunk', { chunk: stderrChunk });
    });
  });

  describe('getters', () => {
    it('should return worktree directory', () => {
      expect(executor.getWorktreeDir()).toBe('/tmp/test-worktree');
    });

    it('should return Claude command', () => {
      expect(executor.getClaudeCommand()).toBe('npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions');
    });
  });

  describe('error handling', () => {
    it('should handle exceptions during spawn setup', async () => {
      // Mock spawn to throw an error
      mockSpawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      await expect(executor.spawn('test')).rejects.toThrow('Spawn failed');
    });

    it('should log errors when process fails', async () => {
      const spawnPromise = executor.spawn('test prompt');

      const error = new Error('Process error');
      mockChildProcess.emit('error', error);

      await expect(spawnPromise).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Claude process error', error);
    });
  });
});