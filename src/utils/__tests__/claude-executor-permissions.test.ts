import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ClaudeCodeExecutor } from '../claude-executor';
import { 
  PermissionManager, 
  PermissionError, 
  DefaultPermissions,
  ActionType,
  PermissionScope 
} from '../permissions';

// Mock child_process to avoid actual process spawning
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stdin: {
      write: jest.fn(),
      end: jest.fn(),
    },
    stdout: {
      on: jest.fn(),
    },
    stderr: {
      on: jest.fn(),
    },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        // Simulate successful process completion
        setTimeout(() => (callback as (code: number, signal: string | null) => void)(0, null), 10);
      }
    }),
  })),
}));

describe('ClaudeCodeExecutor with Permissions', () => {
  let permissionManager: PermissionManager;
  let executor: ClaudeCodeExecutor;

  beforeEach(() => {
    // Create a restrictive permission manager for testing
    const config = DefaultPermissions.restrictive();
    permissionManager = new PermissionManager(config);

    executor = new ClaudeCodeExecutor({
      worktreeDir: '/test/workspace',
      claudeCommand: 'claude --test',
      permissionManager,
    });
  });

  describe('spawn method with permissions', () => {
    it('should allow execution when permissions permit', async () => {
      // The restrictive config allows Claude execution by default
      await expect(executor.spawn('test prompt')).resolves.toBeDefined();
    });

    it('should deny execution when permissions forbid it', async () => {
      // Add a rule that denies Claude execution
      permissionManager.addRule({
        id: 'deny-claude',
        action: ActionType.CLAUDE_EXECUTE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'Claude execution forbidden',
        priority: 300, // Higher than default rules
      });

      await expect(executor.spawn('test prompt')).rejects.toThrow(PermissionError);
    });

    it('should pass correct context to permission check', async () => {
      const checkPermissionSpy = jest.spyOn(permissionManager, 'checkPermission');

      await executor.spawn('test prompt');

      expect(checkPermissionSpy).toHaveBeenCalledWith({
        action: ActionType.CLAUDE_EXECUTE,
        worktreeDir: '/test/workspace',
        additionalData: { prompt: 'test prompt', command: 'claude --test' },
      });
    });

    it('should work without permission manager', async () => {
      const executorWithoutPermissions = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
      });

      // Should not throw any permission errors
      await expect(executorWithoutPermissions.spawn('test prompt')).resolves.toBeDefined();
    });
  });

  describe('permission checking methods', () => {
    it('should check permissions correctly', () => {
      const isAllowed = executor.checkPermission(ActionType.CLAUDE_EXECUTE, 'claude --test');
      expect(isAllowed).toBe(true);

      const isDenied = executor.checkPermission(ActionType.SYSTEM_COMMAND, 'rm -rf /');
      expect(isDenied).toBe(false);
    });

    it('should return true for all actions when no permission manager', () => {
      const executorWithoutPermissions = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
      });

      const isAllowed = executorWithoutPermissions.checkPermission(ActionType.SYSTEM_COMMAND, 'rm -rf /');
      expect(isAllowed).toBe(true);
    });

    it('should check execution permission correctly', () => {
      expect(executor.isExecutionPermitted()).toBe(true);

      // Add deny rule and check again
      permissionManager.addRule({
        id: 'deny-claude',
        action: ActionType.CLAUDE_EXECUTE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'Claude execution forbidden',
        priority: 300,
      });

      expect(executor.isExecutionPermitted()).toBe(false);
    });

    it('should return permission manager instance', () => {
      expect(executor.getPermissionManager()).toBe(permissionManager);

      const executorWithoutPermissions = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
      });

      expect(executorWithoutPermissions.getPermissionManager()).toBeUndefined();
    });
  });

  describe('different permission configurations', () => {
    it('should work with development configuration', () => {
      const devConfig = DefaultPermissions.development();
      const devPermissionManager = new PermissionManager(devConfig);
      
      const devExecutor = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
        permissionManager: devPermissionManager,
      });

      expect(devExecutor.isExecutionPermitted()).toBe(true);
      // In development config, file operations are allowed by default (defaultAllow: true)
      // but restricted outside worktree - however, without explicit context in checkPermission,
      // it uses the more general rules
      expect(devExecutor.checkPermission(ActionType.FILE_WRITE, '/test/workspace/file.txt')).toBe(true);
      // This should be denied by the "deny-outside-worktree" rule in development config
      expect(devExecutor.checkPermission(ActionType.FILE_WRITE, '/etc/passwd')).toBe(false);
    });

    it('should work with permissive configuration', () => {
      const permissiveConfig = DefaultPermissions.permissive();
      const permissivePermissionManager = new PermissionManager(permissiveConfig);
      
      const permissiveExecutor = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
        permissionManager: permissivePermissionManager,
      });

      expect(permissiveExecutor.isExecutionPermitted()).toBe(true);
      expect(permissiveExecutor.checkPermission(ActionType.NETWORK_REQUEST, 'http://example.com')).toBe(true);
      expect(permissiveExecutor.checkPermission(ActionType.FILE_DELETE, '/any/file')).toBe(false);
    });

    it('should respect worktree-specific permissions', () => {
      permissionManager.addRule({
        id: 'allow-worktree-write',
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.WORKTREE,
        allowed: true,
        reason: 'Writing allowed in worktree',
        priority: 100,
      });

      permissionManager.addRule({
        id: 'deny-outside-write',
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'Writing outside worktree denied',
        priority: 90,
      });

      // File write in worktree should be allowed
      expect(executor.checkPermission(ActionType.FILE_WRITE, '/test/workspace/file.txt')).toBe(true);
      
      // File write outside worktree should be denied (no worktreeDir context available in this check)
      expect(executor.checkPermission(ActionType.FILE_WRITE, '/etc/passwd')).toBe(false);
    });
  });

  describe('permission error handling', () => {
    it('should provide detailed error information', async () => {
      permissionManager.addRule({
        id: 'deny-claude-detailed',
        action: ActionType.CLAUDE_EXECUTE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'Claude execution forbidden for security reasons',
        priority: 300,
      });

      try {
        await executor.spawn('test prompt');
        fail('Expected PermissionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        const permError = error as PermissionError;
        
        expect(permError.message).toContain('Action claude_execute denied');
        expect(permError.context.action).toBe(ActionType.CLAUDE_EXECUTE);
        expect(permError.context.target).toBeUndefined();
        expect(permError.result.allowed).toBe(false);
        expect(permError.result.reason).toContain('security reasons');
      }
    });
  });

  describe('complex permission scenarios', () => {
    it('should handle pattern-based permissions correctly', () => {
      // Create a permissive executor for this test
      const permissiveConfig = DefaultPermissions.permissive();
      const permissiveManager = new PermissionManager(permissiveConfig);
      const permissiveExecutor = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
        permissionManager: permissiveManager,
      });

      permissiveManager.addRule({
        id: 'allow-safe-commands',
        action: ActionType.SYSTEM_COMMAND,
        scope: PermissionScope.PATTERN,
        target: 'git *',
        allowed: true,
        reason: 'Git commands are safe',
        priority: 100,
      });

      expect(permissiveExecutor.checkPermission(ActionType.SYSTEM_COMMAND, 'git status')).toBe(true);
      expect(permissiveExecutor.checkPermission(ActionType.SYSTEM_COMMAND, 'git push')).toBe(true);
      expect(permissiveExecutor.checkPermission(ActionType.SYSTEM_COMMAND, 'rm -rf /')).toBe(true); // Allowed by default in permissive mode
    });

    it('should handle priority-based rule resolution', () => {
      // Create a permissive executor for this test
      const permissiveConfig = DefaultPermissions.permissive();
      const permissiveManager = new PermissionManager(permissiveConfig);
      const permissiveExecutor = new ClaudeCodeExecutor({
        worktreeDir: '/test/workspace',
        claudeCommand: 'claude --test',
        permissionManager: permissiveManager,
      });

      // Add conflicting rules with different priorities
      permissiveManager.addRule({
        id: 'low-priority-allow',
        action: ActionType.NETWORK_REQUEST,
        scope: PermissionScope.GLOBAL,
        allowed: true,
        reason: 'Low priority allow',
        priority: 50,
      });

      permissiveManager.addRule({
        id: 'high-priority-deny',
        action: ActionType.NETWORK_REQUEST,
        scope: PermissionScope.PATTERN,
        target: 'http://*',
        allowed: false,
        reason: 'High priority deny for HTTP',
        priority: 150,
      });

      // HTTP request should be denied due to higher priority rule
      expect(permissiveExecutor.checkPermission(ActionType.NETWORK_REQUEST, 'http://example.com')).toBe(false);
      
      // HTTPS request should be allowed (only matches low priority rule)
      expect(permissiveExecutor.checkPermission(ActionType.NETWORK_REQUEST, 'https://example.com')).toBe(true);
    });

    it('should handle path-based permissions with subdirectories', () => {
      permissionManager.addRule({
        id: 'allow-tmp-write',
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.SPECIFIC_PATH,
        target: '/tmp',
        allowed: true,
        reason: 'Temporary directory write allowed',
        priority: 100,
      });

      expect(executor.checkPermission(ActionType.FILE_WRITE, '/tmp/test.txt')).toBe(true);
      expect(executor.checkPermission(ActionType.FILE_WRITE, '/tmp/subdir/test.txt')).toBe(true);
      expect(executor.checkPermission(ActionType.FILE_WRITE, '/var/log/test.txt')).toBe(false);
    });
  });
});