/**
 * Tests for security-runners.ts
 */


import { execSync } from 'child_process';
import {
  runDuplicateCodeDetection,
  runDeadCodeDetection,
  runDependencyVulnerabilityCheck,
} from './security-runners';
import * as validationUtils from '../utils/validation-utils';

jest.mock('child_process');
jest.mock('../utils/validation-utils', () => ({
  validateCommand: jest.fn(),
  validateDirectoryExists: jest.fn(),
}));

describe('security-runners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock validation functions to prevent directory existence checks
    (validationUtils.validateDirectoryExists as jest.Mock).mockImplementation(() => {});
    (validationUtils.validateCommand as jest.Mock).mockImplementation(() => {});
  });

  describe('runDuplicateCodeDetection', () => {
    it('should return success when no duplicates found', () => {
      (execSync as jest.Mock).mockReturnValueOnce('No duplicates found');

      const result = runDuplicateCodeDetection('/test/project');

      expect(result.success).toBe(true);
      expect(result.output).toBe('🔍 Duplicate code check completed (informational only)');
    });

    it('should return success when duplicates detected (informational only)', () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Command failed') as Error & {
          stdout: string;
        };
        error.stdout = '5 duplicates detected';
        throw error;
      });

      const result = runDuplicateCodeDetection('/test/project');

      expect(result.success).toBe(true);
      expect(result.output).toBe(
        '🔍 Duplicate code check completed with issues (informational only)'
      );
    });

    it('should handle command not found errors', () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Command not found') as Error & {
          stdout: string;
        };
        error.stdout = '';
        throw error;
      });

      const result = runDuplicateCodeDetection('/test/project');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Duplicate code check');
    });
  });

  describe('runDeadCodeDetection', () => {
    it('should return success when no dead code found', () => {
      (execSync as jest.Mock).mockReturnValueOnce('');

      const result = runDeadCodeDetection('/test/project');

      expect(result.success).toBe(true);
      expect(result.output).toBe('✅ No dead code detected');
    });

    it('should return failure when dead code detected', () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Command failed') as Error & {
          stdout: string;
        };
        error.stdout = '5 unused exports found';
        throw error;
      });

      const result = runDeadCodeDetection('/test/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('DEAD CODE DETECTED');
    });

    it('should handle command not found errors', () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Command not found') as Error & {
          stdout: string;
        };
        error.stdout = '';
        throw error;
      });

      const result = runDeadCodeDetection('/test/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('DEAD CODE DETECTED');
    });
  });

  describe('runDependencyVulnerabilityCheck', () => {
    it('should return success when no vulnerabilities found', () => {
      (execSync as jest.Mock).mockReturnValueOnce('audit complete, found 0 vulnerabilities');

      const result = runDependencyVulnerabilityCheck('/test/project');

      expect(result.success).toBe(true);
      expect(result.output).toBe('✅ No dependency vulnerabilities found');
    });

    it('should return failure when vulnerabilities found', () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Command failed') as Error & {
          stdout: string;
        };
        error.stdout = 'found 5 vulnerabilities';
        throw error;
      });

      const result = runDependencyVulnerabilityCheck('/test/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('DEPENDENCY VULNERABILITIES');
    });
  });
});
