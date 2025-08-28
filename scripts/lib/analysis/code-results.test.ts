/**
 * Tests for code-results.ts
 */

import { collectCodeResults } from './code-results';
import { StagedFiles } from '../files/staged-files';
import * as frontendChecks from './frontend-checks';
import * as backendChecks from './backend-checks';
import * as scriptChecks from './script-checks';

jest.mock('./frontend-checks');
jest.mock('./backend-checks');
jest.mock('./script-checks');

describe('code-results', () => {
  const mockProjectRoot = '/test/project';
  const mockStagedFiles: StagedFiles = {
    frontendFiles: [],
    backendFiles: [],
    scriptFiles: [],
    allFiles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collectCodeResults', () => {
    it('should return success when no files to check', async () => {
      // Mock all check modules to return success
      (frontendChecks.runFrontendChecks as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });
      (backendChecks.runBackendChecks as jest.Mock).mockReturnValue({
        failed: false,
        output: '',
      });
      (scriptChecks.runScriptChecks as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });

      const result = await collectCodeResults(mockProjectRoot, mockStagedFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
    });

    it('should handle check failures properly', async () => {
      const mockStagedFilesWithFiles: StagedFiles = {
        frontendFiles: ['src/App.tsx'],
        backendFiles: [],
        scriptFiles: [],
        allFiles: ['src/App.tsx'],
      };

      // Mock frontend checks to fail
      (frontendChecks.runFrontendChecks as jest.Mock).mockResolvedValue({
        failed: true,
        output: 'Frontend linting failed',
      });
      (backendChecks.runBackendChecks as jest.Mock).mockReturnValue({
        failed: false,
        output: '',
      });
      (scriptChecks.runScriptChecks as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });

      const result = await collectCodeResults(mockProjectRoot, mockStagedFilesWithFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toContain('Frontend checks failed');
      expect(result.output).toContain('Frontend linting failed');
    });

    it('should handle exceptions in try-catch', async () => {
      const mockStagedFilesWithFiles: StagedFiles = {
        frontendFiles: ['src/App.tsx'],
        backendFiles: [],
        scriptFiles: [],
        allFiles: ['src/App.tsx'],
      };

      // Mock frontend checks to throw an error
      (frontendChecks.runFrontendChecks as jest.Mock).mockRejectedValue(new Error('Mock error'));
      (backendChecks.runBackendChecks as jest.Mock).mockReturnValue({
        failed: false,
        output: '',
      });
      (scriptChecks.runScriptChecks as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });

      const result = await collectCodeResults(mockProjectRoot, mockStagedFilesWithFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toContain('Code check collection error: Mock error');
    });

    it('should handle successful checks', async () => {
      const mockStagedFilesWithFiles: StagedFiles = {
        frontendFiles: ['src/App.tsx'],
        backendFiles: ['src/main.rs'],
        scriptFiles: ['build.ts'],
        allFiles: ['src/App.tsx', 'src/main.rs', 'build.ts'],
      };

      // Mock all check modules to succeed
      (frontendChecks.runFrontendChecks as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });
      (backendChecks.runBackendChecks as jest.Mock).mockReturnValue({
        failed: false,
        output: '',
      });
      (scriptChecks.runScriptChecks as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });

      const result = await collectCodeResults(mockProjectRoot, mockStagedFilesWithFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
    });
  });
});
