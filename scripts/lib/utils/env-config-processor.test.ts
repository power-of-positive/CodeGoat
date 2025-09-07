/**
 * Tests for env-config-processor.ts
 */

import { processEnvFile, loadFromMultipleFiles } from './env-config-processor';
import { config } from 'dotenv';
import {
  fileExists,
  processVariables,
  applyVariablesToEnv,
  logSuccess,
  logNoFileFound,
} from './env-config-helpers';

// Mock dependencies
jest.mock('dotenv');
jest.mock('./env-config-helpers');

const mockConfig = config as jest.MockedFunction<typeof config>;
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockProcessVariables = processVariables as jest.MockedFunction<typeof processVariables>;
const mockApplyVariablesToEnv = applyVariablesToEnv as jest.MockedFunction<
  typeof applyVariablesToEnv
>;
const mockLogSuccess = logSuccess as jest.MockedFunction<typeof logSuccess>;
const mockLogNoFileFound = logNoFileFound as jest.MockedFunction<typeof logNoFileFound>;

describe('env-config-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processEnvFile', () => {
    const envPath = '/test/.env';
    const mergedVariables = {};

    it('should process env file successfully', async () => {
      const parsed = { VAR1: 'value1', VAR2: 'value2' };
      mockConfig.mockReturnValue({ parsed });
      mockProcessVariables.mockReturnValue(2);

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({
        success: true,
        variablesLoaded: 2,
      });
      expect(mockConfig).toHaveBeenCalledWith({ path: envPath, processEnv: {} });
      expect(mockProcessVariables).toHaveBeenCalledWith(parsed, mergedVariables, envPath);
    });

    it('should handle dotenv parsing errors', async () => {
      const error = new Error('Parse error');
      mockConfig.mockReturnValue({ error });

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({ success: false });
      expect(console.warn).toHaveBeenCalledWith(
        `Warning: Failed to parse .env file at ${envPath}:`,
        error.message
      );
    });

    it('should handle missing parsed data', async () => {
      mockConfig.mockReturnValue({});

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({ success: false });
    });

    it('should handle empty parsed object', async () => {
      mockConfig.mockReturnValue({ parsed: {} });
      mockProcessVariables.mockReturnValue(0);

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({ success: true, variablesLoaded: 0 });
    });

    it('should handle undefined parsed data', async () => {
      mockConfig.mockReturnValue({ parsed: undefined });

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({ success: false });
    });

    it('should handle exceptions during processing', async () => {
      mockConfig.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({ success: false });
      expect(console.warn).toHaveBeenCalledWith(
        `Warning: Error reading .env file at ${envPath}:`,
        'File system error'
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockConfig.mockImplementation(() => {
        throw 'String error';
      });

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({ success: false });
      expect(console.warn).toHaveBeenCalledWith(
        `Warning: Error reading .env file at ${envPath}:`,
        'String error'
      );
    });

    it('should handle empty parsed data', async () => {
      const parsed = {};
      mockConfig.mockReturnValue({ parsed });
      mockProcessVariables.mockReturnValue(0);

      const result = await processEnvFile(envPath, mergedVariables);

      expect(result).toEqual({
        success: true,
        variablesLoaded: 0,
      });
    });
  });

  describe('loadFromMultipleFiles', () => {
    const projectRoot = '/test/project';
    const envPaths = ['/test/.env', '/test/.env.local', '/test/.env.production'];

    beforeEach(() => {
      mockProcessVariables.mockReturnValue(0);
      mockApplyVariablesToEnv.mockImplementation();
      mockLogSuccess.mockImplementation();
      mockLogNoFileFound.mockImplementation();
    });

    it('should load from multiple existing env files', async () => {
      // Mock file existence
      mockFileExists.mockImplementation(async (path: string) => {
        return ['/test/.env', '/test/.env.local'].includes(path);
      });

      // Mock successful processing
      mockConfig
        .mockReturnValueOnce({ parsed: { VAR1: 'value1' } })
        .mockReturnValueOnce({ parsed: { VAR2: 'value2' } });

      mockProcessVariables.mockReturnValueOnce(1).mockReturnValueOnce(1);

      const result = await loadFromMultipleFiles(envPaths, projectRoot);

      expect(result).toEqual({
        success: true,
        envPath: '/test/.env',
        variablesLoaded: 2,
        mergedFrom: ['/test/.env', '/test/.env.local'],
      });
      expect(mockApplyVariablesToEnv).toHaveBeenCalled();
      expect(mockLogSuccess).toHaveBeenCalledWith(2);
    });

    it('should handle no existing env files', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await loadFromMultipleFiles(envPaths, projectRoot);

      expect(result).toEqual({
        success: false,
        error: 'No .env file found in expected locations',
      });
      expect(mockLogNoFileFound).toHaveBeenCalledWith(projectRoot, envPaths);
    });

    it('should handle some files existing but failing to process', async () => {
      mockFileExists.mockImplementation(async (path: string) => {
        return path === '/test/.env';
      });

      // Mock processing failure
      mockConfig.mockReturnValue({ error: new Error('Parse error') });

      const result = await loadFromMultipleFiles(envPaths, projectRoot);

      expect(result).toEqual({
        success: false,
        error: 'No .env file found in expected locations',
      });
      expect(mockLogNoFileFound).toHaveBeenCalledWith(projectRoot, envPaths);
    });

    it('should handle mixed success and failure processing', async () => {
      mockFileExists.mockImplementation(async (path: string) => {
        return ['/test/.env', '/test/.env.local'].includes(path);
      });

      // First file succeeds, second fails
      mockConfig
        .mockReturnValueOnce({ parsed: { VAR1: 'value1' } })
        .mockReturnValueOnce({ error: new Error('Parse error') });

      mockProcessVariables.mockReturnValueOnce(1);

      const result = await loadFromMultipleFiles(envPaths, projectRoot);

      expect(result).toEqual({
        success: true,
        envPath: '/test/.env',
        variablesLoaded: 1,
        mergedFrom: ['/test/.env'],
      });
      expect(mockLogSuccess).toHaveBeenCalledWith(1);
    });

    it('should handle zero variables loaded but successful processing', async () => {
      mockFileExists.mockResolvedValue(true);
      mockConfig.mockReturnValue({ parsed: {} });
      mockProcessVariables.mockReturnValue(0);

      const result = await loadFromMultipleFiles(['/test/.env'], projectRoot);

      expect(result).toEqual({
        success: true,
        envPath: '/test/.env',
        variablesLoaded: 0,
        mergedFrom: ['/test/.env'],
      });
      expect(mockLogSuccess).toHaveBeenCalledWith(0);
    });

    it('should accumulate variables from multiple files', async () => {
      mockFileExists.mockResolvedValue(true);
      mockConfig.mockReturnValue({ parsed: { VAR: 'value' } });
      mockProcessVariables.mockReturnValueOnce(3).mockReturnValueOnce(2).mockReturnValueOnce(1);

      const result = await loadFromMultipleFiles(envPaths, projectRoot);

      expect(result).toEqual({
        success: true,
        envPath: '/test/.env',
        variablesLoaded: 6,
        mergedFrom: envPaths,
      });
      expect(mockLogSuccess).toHaveBeenCalledWith(6);
    });

    it('should handle processEnvFile returning undefined variablesLoaded', async () => {
      mockFileExists.mockResolvedValue(true);
      mockConfig.mockReturnValue({ parsed: { VAR: 'value' } });
      mockProcessVariables.mockReturnValue(undefined as any);

      const result = await loadFromMultipleFiles(['/test/.env'], projectRoot);

      expect(result).toEqual({
        success: true,
        envPath: '/test/.env',
        variablesLoaded: 0,
        mergedFrom: ['/test/.env'],
      });
    });
  });
});
