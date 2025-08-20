import {
  ClaudeValidationWrapper,
  ValidationWrapperOptions,
} from '../../utils/claude-validation-wrapper';
import { ClaudeValidationFactory } from '../../utils/claude-validation-factory';
import { createMockLogger } from '../../test-helpers/logger.mock';
import { DefaultPermissions, ActionType } from '../../utils/permissions';
import * as path from 'path';

// Mock the ValidationRunner to avoid actually running validation in tests
jest.mock('../../../scripts/validate-task', () => ({
  ValidationRunner: jest.fn().mockImplementation(() => ({
    runValidation: jest.fn().mockResolvedValue(true),
    getResults: jest.fn().mockReturnValue({
      totalStages: 3,
      passed: 3,
      failed: 0,
      totalTime: 1500,
      success: true,
      stages: [
        { id: 'lint', name: 'Lint', success: true, duration: 500 },
        { id: 'test', name: 'Test', success: true, duration: 800 },
        { id: 'build', name: 'Build', success: true, duration: 200 },
      ],
    }),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the ClaudeCodeExecutor
const mockExecutor = {
  spawn: jest.fn(),
  getWorktreeDir: jest.fn().mockReturnValue('/test/worktree'),
  getClaudeCommand: jest.fn().mockReturnValue('claude-code'),
  checkPermission: jest.fn().mockReturnValue(true),
  getPermissionManager: jest.fn().mockReturnValue(undefined),
  isExecutionPermitted: jest.fn().mockReturnValue(true),
};

jest.mock('../../utils/claude-executor', () => ({
  ClaudeCodeExecutor: jest.fn().mockImplementation(() => mockExecutor),
}));

describe('ClaudeValidationWrapper', () => {
  let logger: ReturnType<typeof createMockLogger>;
  let defaultOptions: ValidationWrapperOptions;

  beforeEach(() => {
    logger = createMockLogger();
    defaultOptions = {
      worktreeDir: '/test/worktree',
      claudeCommand: 'claude-code',
      enableValidation: true,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const wrapper = new ClaudeValidationWrapper(defaultOptions, logger as any);

      expect(wrapper.isValidationEnabled()).toBe(true);
      expect(wrapper.getValidationConfig()).toEqual({
        enableValidation: true,
        validationSettings: undefined,
        skipValidationOnFailure: false,
        validationTimeout: 180000,
      });
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        ...defaultOptions,
        enableValidation: false,
        skipValidationOnFailure: true,
        validationTimeout: 60000,
        validationSettings: '/custom/settings.json',
      };

      const wrapper = new ClaudeValidationWrapper(customOptions, logger as any);

      expect(wrapper.isValidationEnabled()).toBe(false);
      expect(wrapper.getValidationConfig()).toEqual({
        enableValidation: false,
        validationSettings: '/custom/settings.json',
        skipValidationOnFailure: true,
        validationTimeout: 60000,
      });
    });
  });

  describe('execute', () => {
    it('should execute Claude and run validation successfully', async () => {
      const mockClaudeResult = {
        stdout: 'Claude output',
        stderr: '',
        exitCode: 0,
      };

      mockExecutor.spawn.mockResolvedValue(mockClaudeResult);

      const wrapper = new ClaudeValidationWrapper(defaultOptions, logger as any);
      const result = await wrapper.execute('test prompt');

      expect(mockExecutor.spawn).toHaveBeenCalledWith('test prompt');
      expect(result).toEqual({
        ...mockClaudeResult,
        validationSkipped: false,
        validationResults: {
          success: true,
          totalStages: 3,
          passed: 3,
          failed: 0,
          totalTime: 1500,
          stages: expect.any(Array),
        },
        validationError: undefined,
      });
    });

    it('should skip validation when disabled', async () => {
      const mockClaudeResult = {
        stdout: 'Claude output',
        stderr: '',
        exitCode: 0,
      };

      mockExecutor.spawn.mockResolvedValue(mockClaudeResult);

      const options = { ...defaultOptions, enableValidation: false };
      const wrapper = new ClaudeValidationWrapper(options, logger as any);
      const result = await wrapper.execute('test prompt');

      expect(result.validationSkipped).toBe(true);
      expect(result.validationResults).toBeUndefined();
    });

    it('should skip validation on Claude failure when configured', async () => {
      const mockClaudeResult = {
        stdout: '',
        stderr: 'Claude failed',
        exitCode: 1,
      };

      mockExecutor.spawn.mockResolvedValue(mockClaudeResult);

      const options = { ...defaultOptions, skipValidationOnFailure: true };
      const wrapper = new ClaudeValidationWrapper(options, logger as any);
      const result = await wrapper.execute('test prompt');

      expect(result.validationSkipped).toBe(true);
      expect(result.validationResults).toBeUndefined();
    });

    it('should run validation even when Claude fails if not configured to skip', async () => {
      const mockClaudeResult = {
        stdout: '',
        stderr: 'Claude failed',
        exitCode: 1,
      };

      mockExecutor.spawn.mockResolvedValue(mockClaudeResult);

      const wrapper = new ClaudeValidationWrapper(defaultOptions, logger as any);
      const result = await wrapper.execute('test prompt');

      expect(result.validationSkipped).toBe(false);
      expect(result.validationResults).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const mockClaudeResult = {
        stdout: 'Claude output',
        stderr: '',
        exitCode: 0,
      };

      mockExecutor.spawn.mockResolvedValue(mockClaudeResult);

      // Mock ValidationRunner to throw an error
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ValidationRunner } = require('../../../scripts/validate-task');
      const originalMock = ValidationRunner.getMockImplementation();

      ValidationRunner.mockImplementation(() => ({
        runValidation: jest.fn().mockRejectedValue(new Error('Validation failed')),
        cleanup: jest.fn().mockResolvedValue(undefined),
      }));

      const wrapper = new ClaudeValidationWrapper(defaultOptions, logger as any);
      const result = await wrapper.execute('test prompt');

      expect(result.validationError).toBe('Validation failed');
      expect(result.validationResults).toBeUndefined();

      // Restore the original mock
      ValidationRunner.mockImplementation(originalMock);
    });
  });

  describe('runValidationOnly', () => {
    it('should run validation without executing Claude', async () => {
      const wrapper = new ClaudeValidationWrapper(defaultOptions, logger as any);
      const result = await wrapper.runValidationOnly();

      expect(mockExecutor.spawn).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        totalStages: 3,
        passed: 3,
        failed: 0,
        totalTime: 1500,
        stages: expect.any(Array),
      });
    });

    it('should throw error when validation is disabled', async () => {
      const options = { ...defaultOptions, enableValidation: false };
      const wrapper = new ClaudeValidationWrapper(options, logger as any);

      await expect(wrapper.runValidationOnly()).rejects.toThrow('Validation is disabled');
    });
  });

  describe('delegation methods', () => {
    it('should delegate methods to underlying executor', () => {
      const wrapper = new ClaudeValidationWrapper(defaultOptions, logger as any);

      expect(wrapper.getWorktreeDir()).toBe('/test/worktree');
      expect(wrapper.getClaudeCommand()).toBe('claude-code');
      expect(wrapper.checkPermission(ActionType.FILE_READ, 'test.txt')).toBe(true);
      expect(wrapper.getPermissionManager()).toBeUndefined();
      expect(wrapper.isExecutionPermitted()).toBe(true);
    });
  });
});

describe('ClaudeValidationFactory', () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create wrapper with default configuration', () => {
      const wrapper = ClaudeValidationFactory.create({
        worktreeDir: '/test/worktree',
        logger: logger as any,
      });

      expect(wrapper.isValidationEnabled()).toBe(true);
      expect(wrapper.getWorktreeDir()).toBe('/test/worktree');
    });

    it('should create wrapper with custom configuration', () => {
      const wrapper = ClaudeValidationFactory.create({
        worktreeDir: '/test/worktree',
        enableValidation: false,
        permissionMode: 'restrictive',
        validationTimeout: 60000,
        logger: logger as any,
      });

      expect(wrapper.isValidationEnabled()).toBe(false);
      expect(wrapper.getValidationConfig().validationTimeout).toBe(60000);
    });
  });

  describe('preset factories', () => {
    it('should create development wrapper', () => {
      const wrapper = ClaudeValidationFactory.createForDevelopment('/test/worktree', logger as any);

      expect(wrapper.isValidationEnabled()).toBe(true);
      expect(wrapper.getValidationConfig().validationTimeout).toBe(300000); // 5 minutes
      expect(wrapper.getValidationConfig().skipValidationOnFailure).toBe(false);
    });

    it('should create production wrapper', () => {
      const wrapper = ClaudeValidationFactory.createForProduction('/test/worktree', logger as any);

      expect(wrapper.isValidationEnabled()).toBe(true);
      expect(wrapper.getValidationConfig().validationTimeout).toBe(180000); // 3 minutes
      expect(wrapper.getValidationConfig().skipValidationOnFailure).toBe(true);
    });

    it('should create wrapper without validation', () => {
      const wrapper = ClaudeValidationFactory.createWithoutValidation(
        '/test/worktree',
        logger as any
      );

      expect(wrapper.isValidationEnabled()).toBe(false);
    });
  });
});
