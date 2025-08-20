import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ClaudeCodeExecutor } from '../claude-executor';

describe('ClaudeCodeExecutor Integration Tests', () => {
  let tempDir: string;
  let executor: ClaudeCodeExecutor;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await mkdtemp(join(tmpdir(), 'claude-executor-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('with echo command (simple integration)', () => {
    it('should execute echo command and capture output', async () => {
      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: 'echo "Hello from Claude executor"',
      });

      const result = await executor.spawn('ignored-prompt');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello from Claude executor');
      expect(result.stderr).toBe('');
    });

    it('should pass stdin to the command', async () => {
      // Use cat command to echo stdin to stdout
      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: 'cat',
      });

      const testInput = 'This is test input from stdin';
      const result = await executor.spawn(testInput);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(testInput);
      expect(result.stderr).toBe('');
    });
  });

  describe('with node command', () => {
    it('should execute node script and capture output', async () => {
      // Create a simple Node.js script
      const scriptPath = join(tempDir, 'test-script.js');
      await writeFile(
        scriptPath,
        `
        // Read from stdin
        let input = '';
        process.stdin.on('data', (chunk) => {
          input += chunk;
        });
        
        process.stdin.on('end', () => {
          console.log('Received input:', input.trim());
          console.error('This is stderr output');
          process.exit(0);
        });
      `
      );

      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: `node ${scriptPath}`,
      });

      const testPrompt = 'Hello from test';
      const result = await executor.spawn(testPrompt);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Received input: Hello from test');
      expect(result.stderr).toContain('This is stderr output');
    });

    it('should handle non-zero exit codes', async () => {
      // Create a script that exits with error code
      const scriptPath = join(tempDir, 'error-script.js');
      await writeFile(
        scriptPath,
        `
        console.log('Starting script');
        console.error('Something went wrong');
        process.exit(1);
      `
      );

      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: `node ${scriptPath}`,
      });

      const result = await executor.spawn('test input');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('Starting script');
      expect(result.stderr).toContain('Something went wrong');
    });
  });

  describe('command parsing edge cases', () => {
    it('should handle commands with quoted paths', async () => {
      // Create a directory with spaces in the name
      const spacedDir = join(tempDir, 'dir with spaces');
      await mkdtemp(spacedDir);

      const scriptPath = join(spacedDir, 'script.js');
      await writeFile(scriptPath, 'console.log("Script in spaced directory");');

      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: `node "${scriptPath}"`,
      });

      const result = await executor.spawn('test');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Script in spaced directory');
    });

    it('should handle commands with multiple quoted arguments', async () => {
      const scriptPath = join(tempDir, 'args-script.js');
      await writeFile(
        scriptPath,
        `
        console.log('Args:', process.argv.slice(2).join(' | '));
      `
      );

      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: `node ${scriptPath} --flag "value with spaces" --other 'single quoted'`,
      });

      const result = await executor.spawn('test');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Args: --flag | value with spaces | --other | single quoted');
    });
  });

  describe('working directory isolation', () => {
    it('should execute command in specified working directory', async () => {
      // Create a test file in the temp directory
      const testFilePath = join(tempDir, 'test-file.txt');
      await writeFile(testFilePath, 'test content');

      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: 'ls -la',
      });

      const result = await executor.spawn('ignored');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test-file.txt');
    });

    it('should isolate execution to worktree directory', async () => {
      // Create two separate directories
      const dir1 = join(tempDir, 'dir1');
      const dir2 = join(tempDir, 'dir2');

      await mkdtemp(dir1);
      await mkdtemp(dir2);

      await writeFile(join(dir1, 'file1.txt'), 'content1');
      await writeFile(join(dir2, 'file2.txt'), 'content2');

      // Execute in dir1
      const executor1 = new ClaudeCodeExecutor({
        worktreeDir: dir1,
        claudeCommand: 'ls',
      });

      const result1 = await executor1.spawn('test');
      expect(result1.stdout).toContain('file1.txt');
      expect(result1.stdout).not.toContain('file2.txt');

      // Execute in dir2
      const executor2 = new ClaudeCodeExecutor({
        worktreeDir: dir2,
        claudeCommand: 'ls',
      });

      const result2 = await executor2.spawn('test');
      expect(result2.stdout).toContain('file2.txt');
      expect(result2.stdout).not.toContain('file1.txt');
    });
  });

  describe('error scenarios', () => {
    it('should handle command not found', async () => {
      executor = new ClaudeCodeExecutor({
        worktreeDir: tempDir,
        claudeCommand: 'nonexistent-command-12345',
      });

      await expect(executor.spawn('test')).rejects.toThrow(/Failed to start Claude process/);
    });

    it('should handle invalid working directory', async () => {
      executor = new ClaudeCodeExecutor({
        worktreeDir: '/nonexistent/directory/path',
        claudeCommand: 'echo test',
      });

      await expect(executor.spawn('test')).rejects.toThrow(/Failed to start Claude process/);
    });
  });
});
