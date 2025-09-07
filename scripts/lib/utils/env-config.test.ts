import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';
import { loadProjectEnv, loadProjectEnvSync, validateRequiredEnvVars } from './env-config';
import * as envConfigHelpers from './env-config-helpers';
import * as envConfigProcessor from './env-config-processor';

// Mock dependencies
jest.mock('dotenv');
jest.mock('fs');
jest.mock('./env-config-helpers');
jest.mock('./env-config-processor');

const mockConfig = config as jest.MockedFunction<typeof config>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockHandleLoadError = envConfigHelpers.handleLoadError as jest.MockedFunction<
  typeof envConfigHelpers.handleLoadError
>;
const mockLoadFromMultipleFiles = envConfigProcessor.loadFromMultipleFiles as jest.MockedFunction<
  typeof envConfigProcessor.loadFromMultipleFiles
>;

describe('env-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env
    delete process.env.TEST_VAR;
    delete process.env.REQUIRED_VAR;
    delete process.env.OPTIONAL_VAR;
    delete process.env.FORMAT_VAR;
  });

  describe('loadProjectEnv', () => {
    it('should successfully load environment variables from multiple files', async () => {
      const expectedResult = {
        success: true,
        envPath: '/project/.env',
        variablesLoaded: 3,
        filesLoaded: ['.env', '.env.local'],
      };

      mockLoadFromMultipleFiles.mockResolvedValue(expectedResult);

      const result = await loadProjectEnv(2);

      expect(result).toEqual(expectedResult);
      expect(mockLoadFromMultipleFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('.env'),
          expect.stringContaining('.env.local'),
          expect.stringContaining('.env.development'),
        ]),
        expect.any(String)
      );
    });

    it('should use custom scripts depth', async () => {
      const expectedResult = { success: true, envPath: '/project/.env', variablesLoaded: 1 };
      mockLoadFromMultipleFiles.mockResolvedValue(expectedResult);

      await loadProjectEnv(3);

      expect(mockLoadFromMultipleFiles).toHaveBeenCalledWith(expect.any(Array), expect.any(String));
    });

    it('should handle errors by calling handleLoadError', async () => {
      const error = new Error('File system error');
      const expectedResult = { success: false, error: 'File system error' };

      mockLoadFromMultipleFiles.mockRejectedValue(error);
      mockHandleLoadError.mockReturnValue(expectedResult);

      const result = await loadProjectEnv();

      expect(result).toEqual(expectedResult);
      expect(mockHandleLoadError).toHaveBeenCalledWith(error);
    });

    it('should use default scripts depth of 2', async () => {
      const expectedResult = { success: true, envPath: '/project/.env', variablesLoaded: 1 };
      mockLoadFromMultipleFiles.mockResolvedValue(expectedResult);

      await loadProjectEnv();

      // Verify that the path calculation uses depth of 2
      const expectedProjectRoot = path.resolve(__dirname, '../'.repeat(2));
      expect(mockLoadFromMultipleFiles).toHaveBeenCalledWith(
        expect.any(Array),
        expectedProjectRoot
      );
    });
  });

  describe('loadProjectEnvSync', () => {
    it('should successfully load environment variables when .env file exists', () => {
      const mockParsed = { TEST_VAR: 'test_value', ANOTHER_VAR: 'another_value' };

      mockExistsSync.mockReturnValue(true);
      mockConfig.mockReturnValue({ parsed: mockParsed });

      const result = loadProjectEnvSync();

      expect(result.success).toBe(true);
      expect(result.variablesLoaded).toBe(2);
      expect(result.envPath).toContain('.env');
    });

    it('should handle dotenv config errors', () => {
      const error = new Error('Parse error');

      mockExistsSync.mockReturnValue(true);
      mockConfig.mockReturnValue({ error });

      const result = loadProjectEnvSync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parse error');
    });

    it('should return error when .env file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadProjectEnvSync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No .env file found');
    });

    it('should handle cases where parsed is undefined', () => {
      mockExistsSync.mockReturnValue(true);
      mockConfig.mockReturnValue({ parsed: undefined });

      const result = loadProjectEnvSync();

      expect(result.success).toBe(true);
      expect(result.variablesLoaded).toBe(0);
    });

    it('should handle general errors', () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = loadProjectEnvSync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('File system error');
    });

    it('should handle non-Error exceptions', () => {
      mockExistsSync.mockImplementation(() => {
        throw 'String error';
      });

      const result = loadProjectEnvSync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('should use custom scripts depth', () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadProjectEnvSync(3);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No .env file found');
    });
  });

  describe('validateRequiredEnvVars', () => {
    it('should validate successfully when all required variables are present', () => {
      process.env.REQUIRED_VAR = 'value1';
      process.env.OPTIONAL_VAR = 'value2';

      const result = validateRequiredEnvVars(['REQUIRED_VAR', 'OPTIONAL_VAR']);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should identify missing variables', () => {
      process.env.REQUIRED_VAR = 'value1';
      // MISSING_VAR is not set

      const result = validateRequiredEnvVars(['REQUIRED_VAR', 'MISSING_VAR']);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('MISSING_VAR');
      expect(result.missing).not.toContain('REQUIRED_VAR');
    });

    it('should identify empty variables when allowEmpty is false', () => {
      process.env.EMPTY_VAR = '';
      process.env.WHITESPACE_VAR = '   ';

      const result = validateRequiredEnvVars(['EMPTY_VAR', 'WHITESPACE_VAR'], {
        allowEmpty: false,
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('EMPTY_VAR');
      expect(result.missing).toContain('WHITESPACE_VAR');
    });

    it('should allow empty variables when allowEmpty is true', () => {
      process.env.EMPTY_VAR = '';
      process.env.PRESENT_VAR = 'value';

      const result = validateRequiredEnvVars(['EMPTY_VAR', 'PRESENT_VAR'], { allowEmpty: true });

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should validate format using regular expressions', () => {
      process.env.EMAIL_VAR = 'invalid-email';
      process.env.URL_VAR = 'https://example.com';

      const validateFormat = {
        EMAIL_VAR: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        URL_VAR: /^https?:\/\/.+$/,
      };

      const result = validateRequiredEnvVars(['EMAIL_VAR', 'URL_VAR'], { validateFormat });

      expect(result.valid).toBe(false);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].name).toBe('EMAIL_VAR');
      expect(result.invalid[0].reason).toContain('Does not match required format');
    });

    it('should handle mixed validation scenarios', () => {
      process.env.VALID_VAR = 'test@example.com';
      process.env.INVALID_FORMAT = 'not-an-email';
      // MISSING_VAR is not set

      const validateFormat = {
        VALID_VAR: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        INVALID_FORMAT: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      };

      const result = validateRequiredEnvVars(['VALID_VAR', 'INVALID_FORMAT', 'MISSING_VAR'], {
        validateFormat,
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('MISSING_VAR');
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].name).toBe('INVALID_FORMAT');
    });

    it('should not validate format for empty variables that are allowed', () => {
      process.env.EMPTY_VAR = '';

      const validateFormat = {
        EMPTY_VAR: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      };

      const result = validateRequiredEnvVars(['EMPTY_VAR'], { allowEmpty: true, validateFormat });

      expect(result.valid).toBe(true);
      expect(result.invalid).toHaveLength(0);
    });

    it('should skip format validation when no format is specified for a variable', () => {
      process.env.NO_FORMAT_VAR = 'any-value';

      const result = validateRequiredEnvVars(['NO_FORMAT_VAR'], { validateFormat: {} });

      expect(result.valid).toBe(true);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle empty required vars array', () => {
      const result = validateRequiredEnvVars([]);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should use default options when none provided', () => {
      process.env.TEST_VAR = 'value';

      const result = validateRequiredEnvVars(['TEST_VAR']);

      expect(result.valid).toBe(true);
    });
  });
});
