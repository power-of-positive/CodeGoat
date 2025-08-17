import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  PermissionManager, 
  PermissionError, 
  DefaultPermissions,
  ActionType, 
  PermissionScope,
  PermissionRule,
  PermissionConfig,
  PermissionContext 
} from '../permissions';

describe('PermissionManager', () => {
  let manager: PermissionManager;
  let basicConfig: PermissionConfig;

  beforeEach(() => {
    basicConfig = {
      defaultAllow: false,
      enableLogging: false,
      strictMode: true,
      rules: [
        {
          id: 'allow-file-read',
          action: ActionType.FILE_READ,
          scope: PermissionScope.WORKTREE,
          allowed: true,
          reason: 'File reading allowed in worktree',
          priority: 100,
        },
        {
          id: 'deny-file-delete',
          action: ActionType.FILE_DELETE,
          scope: PermissionScope.GLOBAL,
          allowed: false,
          reason: 'File deletion is forbidden',
          priority: 200,
        },
        {
          id: 'allow-specific-path',
          action: ActionType.FILE_WRITE,
          scope: PermissionScope.SPECIFIC_PATH,
          target: '/tmp/allowed',
          allowed: true,
          reason: 'Write allowed to specific path',
          priority: 150,
        },
      ],
    };

    manager = new PermissionManager(basicConfig);
  });

  describe('checkPermission', () => {
    it('should allow actions with matching allow rules', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_READ,
        worktreeDir: '/test/workspace',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(true);
      expect(result.matchingRule?.id).toBe('allow-file-read');
      expect(result.reason).toContain('File reading allowed in worktree');
    });

    it('should deny actions with matching deny rules', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_DELETE,
        target: '/any/file',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(false);
      expect(result.matchingRule?.id).toBe('deny-file-delete');
      expect(result.reason).toContain('File deletion is forbidden');
    });

    it('should use highest priority rule when multiple rules match', () => {
      // Add a lower priority rule that would allow file deletion
      manager.addRule({
        id: 'allow-file-delete-low-priority',
        action: ActionType.FILE_DELETE,
        scope: PermissionScope.GLOBAL,
        allowed: true,
        reason: 'Low priority allow rule',
        priority: 50,
      });

      const context: PermissionContext = {
        action: ActionType.FILE_DELETE,
        target: '/any/file',
      };

      const result = manager.checkPermission(context);

      // Should still be denied because higher priority rule denies it
      expect(result.allowed).toBe(false);
      expect(result.matchingRule?.id).toBe('deny-file-delete');
    });

    it('should match specific path rules correctly', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_WRITE,
        target: '/tmp/allowed/file.txt',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(true);
      expect(result.matchingRule?.id).toBe('allow-specific-path');
    });

    it('should not match unrelated paths for specific path rules', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_WRITE,
        target: '/tmp/forbidden/file.txt',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(false);
      expect(result.appliedDefault).toBe(true);
    });

    it('should use default behavior when no rules match', () => {
      const context: PermissionContext = {
        action: ActionType.NETWORK_REQUEST,
        target: 'http://example.com',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(false); // Default is false
      expect(result.appliedDefault).toBe(true);
      expect(result.reason).toContain('No matching rule found');
    });

    it('should handle pattern matching rules', () => {
      manager.addRule({
        id: 'allow-git-commands',
        action: ActionType.SYSTEM_COMMAND,
        scope: PermissionScope.PATTERN,
        target: 'git *',
        allowed: true,
        reason: 'Git commands are allowed',
        priority: 100,
      });

      const context: PermissionContext = {
        action: ActionType.SYSTEM_COMMAND,
        target: 'git status',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(true);
      expect(result.matchingRule?.id).toBe('allow-git-commands');
    });

    it('should not match incorrect patterns', () => {
      manager.addRule({
        id: 'allow-git-commands',
        action: ActionType.SYSTEM_COMMAND,
        scope: PermissionScope.PATTERN,
        target: 'git *',
        allowed: true,
        reason: 'Git commands are allowed',
        priority: 100,
      });

      const context: PermissionContext = {
        action: ActionType.SYSTEM_COMMAND,
        target: 'rm -rf /',
      };

      const result = manager.checkPermission(context);

      expect(result.allowed).toBe(false);
      expect(result.appliedDefault).toBe(true);
    });
  });

  describe('requirePermission', () => {
    it('should not throw for allowed actions', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_READ,
        worktreeDir: '/test/workspace',
      };

      expect(() => manager.requirePermission(context)).not.toThrow();
    });

    it('should throw PermissionError for denied actions', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_DELETE,
        target: '/any/file',
      };

      expect(() => manager.requirePermission(context)).toThrow(PermissionError);

      try {
        manager.requirePermission(context);
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        const permError = error as PermissionError;
        expect(permError.context).toEqual(context);
        expect(permError.result.allowed).toBe(false);
      }
    });
  });

  describe('rule management', () => {
    it('should add new rules correctly', () => {
      const newRule: PermissionRule = {
        id: 'new-rule',
        action: ActionType.NETWORK_REQUEST,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'Network requests denied',
        priority: 100,
      };

      manager.addRule(newRule);

      const context: PermissionContext = {
        action: ActionType.NETWORK_REQUEST,
        target: 'http://example.com',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(false);
      expect(result.matchingRule?.id).toBe('new-rule');
    });

    it('should remove rules correctly', () => {
      const ruleId = 'allow-file-read';
      const removed = manager.removeRule(ruleId);

      expect(removed).toBe(true);

      const context: PermissionContext = {
        action: ActionType.FILE_READ,
        worktreeDir: '/test/workspace',
      };

      const result = manager.checkPermission(context);
      expect(result.appliedDefault).toBe(true); // No matching rule anymore
    });

    it('should return false when removing non-existent rule', () => {
      const removed = manager.removeRule('non-existent-rule');
      expect(removed).toBe(false);
    });

    it('should sort rules by priority after adding', () => {
      manager.addRule({
        id: 'high-priority',
        action: ActionType.FILE_READ,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'High priority deny',
        priority: 300,
      });

      const context: PermissionContext = {
        action: ActionType.FILE_READ,
        worktreeDir: '/test/workspace',
      };

      const result = manager.checkPermission(context);
      // Should be denied by the higher priority rule
      expect(result.allowed).toBe(false);
      expect(result.matchingRule?.id).toBe('high-priority');
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      manager.updateConfig({ defaultAllow: true });

      const context: PermissionContext = {
        action: ActionType.NETWORK_REQUEST,
        target: 'http://example.com',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(true); // Default is now true
    });

    it('should return read-only config', () => {
      const config = manager.getConfig();
      expect(config.defaultAllow).toBe(false);

      // Should not be able to modify the returned config
      expect(() => {
        (config as any).defaultAllow = true;
      }).toThrow();
    });
  });

  describe('path matching', () => {
    it('should match exact paths', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_WRITE,
        target: '/tmp/allowed',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(true);
    });

    it('should match subdirectories', () => {
      const context: PermissionContext = {
        action: ActionType.FILE_WRITE,
        target: '/tmp/allowed/subdir/file.txt',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(true);
    });

    it('should normalize trailing slashes', () => {
      manager.addRule({
        id: 'test-trailing-slash',
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.SPECIFIC_PATH,
        target: '/tmp/test/',
        allowed: true,
        reason: 'Test path with trailing slash',
        priority: 100,
      });

      const context: PermissionContext = {
        action: ActionType.FILE_WRITE,
        target: '/tmp/test/file.txt',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(true);
    });
  });
});

describe('DefaultPermissions', () => {
  describe('restrictive configuration', () => {
    it('should create restrictive config with appropriate rules', () => {
      const config = DefaultPermissions.restrictive();

      expect(config.defaultAllow).toBe(false);
      expect(config.strictMode).toBe(true);
      expect(config.enableLogging).toBe(true);

      // Should have rules for Claude execution, file reading, and denials for system commands
      const ruleActions = config.rules.map(rule => rule.action);
      expect(ruleActions).toContain(ActionType.CLAUDE_EXECUTE);
      expect(ruleActions).toContain(ActionType.FILE_READ);
      expect(ruleActions).toContain(ActionType.SYSTEM_COMMAND);
    });

    it('should allow Claude execution in restrictive mode', () => {
      const config = DefaultPermissions.restrictive();
      const manager = new PermissionManager(config);

      const context: PermissionContext = {
        action: ActionType.CLAUDE_EXECUTE,
        worktreeDir: '/test/workspace',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(true);
    });

    it('should deny system commands in restrictive mode', () => {
      const config = DefaultPermissions.restrictive();
      const manager = new PermissionManager(config);

      const context: PermissionContext = {
        action: ActionType.SYSTEM_COMMAND,
        target: 'rm -rf /',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(false);
    });
  });

  describe('permissive configuration', () => {
    it('should create permissive config with minimal restrictions', () => {
      const config = DefaultPermissions.permissive();

      expect(config.defaultAllow).toBe(true);
      expect(config.strictMode).toBe(false);

      // Should have fewer restrictive rules
      const denyRules = config.rules.filter(rule => !rule.allowed);
      expect(denyRules.length).toBeGreaterThan(0);
      expect(denyRules.length).toBeLessThanOrEqual(config.rules.length);
    });

    it('should deny file deletion even in permissive mode', () => {
      const config = DefaultPermissions.permissive();
      const manager = new PermissionManager(config);

      const context: PermissionContext = {
        action: ActionType.FILE_DELETE,
        target: '/any/file',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(false);
    });
  });

  describe('development configuration', () => {
    it('should create balanced development config', () => {
      const config = DefaultPermissions.development();

      expect(config.defaultAllow).toBe(true);
      expect(config.strictMode).toBe(false);

      // Should allow worktree operations but restrict outside access
      const worktreeRules = config.rules.filter(rule => 
        rule.scope === PermissionScope.WORKTREE && rule.allowed
      );
      expect(worktreeRules.length).toBeGreaterThan(0);
    });

    it('should allow git commands in development mode', () => {
      const config = DefaultPermissions.development();
      const manager = new PermissionManager(config);

      const context: PermissionContext = {
        action: ActionType.SYSTEM_COMMAND,
        target: 'git status',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(true);
    });

    it('should deny file operations outside worktree in development mode', () => {
      const config = DefaultPermissions.development();
      const manager = new PermissionManager(config);

      const context: PermissionContext = {
        action: ActionType.FILE_WRITE,
        target: '/etc/passwd',
      };

      const result = manager.checkPermission(context);
      expect(result.allowed).toBe(false);
    });
  });
});

describe('PermissionError', () => {
  it('should contain context and result information', () => {
    const context: PermissionContext = {
      action: ActionType.FILE_DELETE,
      target: '/test/file',
    };

    const result = {
      allowed: false,
      reason: 'Test denial',
    };

    const error = new PermissionError('Test error', context, result);

    expect(error.name).toBe('PermissionError');
    expect(error.message).toBe('Test error');
    expect(error.context).toEqual(context);
    expect(error.result).toEqual(result);
  });
});