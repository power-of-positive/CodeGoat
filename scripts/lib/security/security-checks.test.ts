/**
 * Tests for security-checks.ts
 */

import { runSecurityChecks } from './security-checks';
import {
  runDuplicateCodeDetection,
  runDeadCodeDetection,
  runDependencyVulnerabilityCheck,
} from './security-runners';

// Mock the security runners
jest.mock('./security-runners', () => ({
  runDuplicateCodeDetection: jest.fn(),
  runDeadCodeDetection: jest.fn(),
  runDependencyVulnerabilityCheck: jest.fn(),
}));

const mockRunDuplicateCodeDetection = runDuplicateCodeDetection as jest.MockedFunction<
  typeof runDuplicateCodeDetection
>;
const mockRunDeadCodeDetection = runDeadCodeDetection as jest.MockedFunction<
  typeof runDeadCodeDetection
>;
const mockRunDependencyVulnerabilityCheck = runDependencyVulnerabilityCheck as jest.MockedFunction<
  typeof runDependencyVulnerabilityCheck
>;

describe('security-checks', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Reset all mocks
    mockRunDuplicateCodeDetection.mockReset();
    mockRunDeadCodeDetection.mockReset();
    mockRunDependencyVulnerabilityCheck.mockReset();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('runSecurityChecks', () => {
    const projectRoot = '/test/project';

    it('should pass all security checks when all succeed', () => {
      // Mock all checks to succeed
      mockRunDuplicateCodeDetection.mockReturnValue({
        success: true,
        output: 'No duplicate code found',
      });
      mockRunDeadCodeDetection.mockReturnValue({
        success: true,
        output: 'No dead code found',
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: true,
        output: 'No vulnerabilities found',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(false);
      expect(result.securityOutput).toContain('SECURITY CHECKS:');
      expect(result.securityOutput).toContain('Duplicate Code Detection: No duplicate code found');
      expect(result.securityOutput).toContain('Dead Code Detection: No dead code found');
      expect(result.securityOutput).toContain(
        'Dependency Vulnerabilities: No vulnerabilities found'
      );

      // Verify success messages were logged
      expect(consoleSpy).toHaveBeenCalledWith('✅ Duplicate Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dead Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dependency Vulnerabilities passed');
    });

    it('should report failure when duplicate code detection fails', () => {
      mockRunDuplicateCodeDetection.mockReturnValue({
        success: false,
        output: 'Duplicate code found in files X, Y',
      });
      mockRunDeadCodeDetection.mockReturnValue({
        success: true,
        output: 'No dead code found',
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: true,
        output: 'No vulnerabilities found',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(true);
      expect(result.securityOutput).toContain(
        'Duplicate Code Detection: Duplicate code found in files X, Y'
      );

      expect(consoleSpy).toHaveBeenCalledWith('❌ Duplicate Code Detection failed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dead Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dependency Vulnerabilities passed');
    });

    it('should report failure when dead code detection fails', () => {
      mockRunDuplicateCodeDetection.mockReturnValue({
        success: true,
        output: 'No duplicate code found',
      });
      mockRunDeadCodeDetection.mockReturnValue({
        success: false,
        output: 'Dead code found in unused.ts',
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: true,
        output: 'No vulnerabilities found',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(true);
      expect(result.securityOutput).toContain('Dead Code Detection: Dead code found in unused.ts');

      expect(consoleSpy).toHaveBeenCalledWith('✅ Duplicate Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Dead Code Detection failed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dependency Vulnerabilities passed');
    });

    it('should report failure when dependency vulnerability check fails', () => {
      mockRunDuplicateCodeDetection.mockReturnValue({
        success: true,
        output: 'No duplicate code found',
      });
      mockRunDeadCodeDetection.mockReturnValue({
        success: true,
        output: 'No dead code found',
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: false,
        output: '3 vulnerabilities found',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(true);
      expect(result.securityOutput).toContain(
        'Dependency Vulnerabilities: 3 vulnerabilities found'
      );

      expect(consoleSpy).toHaveBeenCalledWith('✅ Duplicate Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dead Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Dependency Vulnerabilities failed');
    });

    it('should report failure when multiple checks fail', () => {
      mockRunDuplicateCodeDetection.mockReturnValue({
        success: false,
        output: 'Duplicate code found',
      });
      mockRunDeadCodeDetection.mockReturnValue({
        success: false,
        output: 'Dead code found',
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: true,
        output: 'No vulnerabilities found',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(true);
      expect(result.securityOutput).toContain('Duplicate Code Detection: Duplicate code found');
      expect(result.securityOutput).toContain('Dead Code Detection: Dead code found');

      expect(consoleSpy).toHaveBeenCalledWith('❌ Duplicate Code Detection failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Dead Code Detection failed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dependency Vulnerabilities passed');
    });

    it('should handle Error exceptions gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      mockRunDuplicateCodeDetection.mockImplementation(() => {
        throw new Error('Network connection failed');
      });
      mockRunDeadCodeDetection.mockReturnValue({
        success: true,
        output: 'No dead code found',
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: true,
        output: 'No vulnerabilities found',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(false);
      expect(result.securityOutput).toContain(
        'Duplicate Code Detection: ⚠️ Failed to run - Network connection failed'
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Duplicate Code Detection check failed: Network connection failed'
      );
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dead Code Detection passed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dependency Vulnerabilities passed');
    });

    it('should handle non-Error exceptions gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      mockRunDuplicateCodeDetection.mockImplementation(() => {
        throw 'String error message';
      });
      mockRunDeadCodeDetection.mockImplementation(() => {
        throw { message: 'Object error' };
      });
      mockRunDependencyVulnerabilityCheck.mockImplementation(() => {
        throw null;
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(false);
      expect(result.securityOutput).toContain(
        'Duplicate Code Detection: ⚠️ Failed to run - String error message'
      );
      expect(result.securityOutput).toContain(
        'Dead Code Detection: ⚠️ Failed to run - [object Object]'
      );
      expect(result.securityOutput).toContain(
        'Dependency Vulnerabilities: ⚠️ Failed to run - null'
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Duplicate Code Detection check failed: String error message'
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Dead Code Detection check failed: [object Object]'
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Dependency Vulnerabilities check failed: null'
      );
    });

    it('should handle mixed success, failure, and error scenarios', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      mockRunDuplicateCodeDetection.mockReturnValue({
        success: false,
        output: 'Found duplicates',
      });
      mockRunDeadCodeDetection.mockImplementation(() => {
        throw new Error('Process crashed');
      });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({
        success: true,
        output: 'All dependencies secure',
      });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(true);
      expect(result.securityOutput).toContain('Duplicate Code Detection: Found duplicates');
      expect(result.securityOutput).toContain(
        'Dead Code Detection: ⚠️ Failed to run - Process crashed'
      );
      expect(result.securityOutput).toContain(
        'Dependency Vulnerabilities: All dependencies secure'
      );

      expect(consoleSpy).toHaveBeenCalledWith('❌ Duplicate Code Detection failed');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Dead Code Detection check failed: Process crashed'
      );
      expect(consoleSpy).toHaveBeenCalledWith('✅ Dependency Vulnerabilities passed');
    });

    it('should call all runner functions with correct project root', () => {
      const testProjectRoot = '/custom/project/path';

      mockRunDuplicateCodeDetection.mockReturnValue({ success: true, output: 'OK' });
      mockRunDeadCodeDetection.mockReturnValue({ success: true, output: 'OK' });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({ success: true, output: 'OK' });

      runSecurityChecks(testProjectRoot);

      expect(mockRunDuplicateCodeDetection).toHaveBeenCalledWith(testProjectRoot);
      expect(mockRunDeadCodeDetection).toHaveBeenCalledWith(testProjectRoot);
      expect(mockRunDependencyVulnerabilityCheck).toHaveBeenCalledWith(testProjectRoot);
    });

    it('should return empty security output when all checks are successful and have no output', () => {
      mockRunDuplicateCodeDetection.mockReturnValue({ success: true, output: '' });
      mockRunDeadCodeDetection.mockReturnValue({ success: true, output: '' });
      mockRunDependencyVulnerabilityCheck.mockReturnValue({ success: true, output: '' });

      const result = runSecurityChecks(projectRoot);

      expect(result.securityFailure).toBe(false);
      expect(result.securityOutput).toContain('SECURITY CHECKS:');
      expect(result.securityOutput).toContain('Duplicate Code Detection: ');
      expect(result.securityOutput).toContain('Dead Code Detection: ');
      expect(result.securityOutput).toContain('Dependency Vulnerabilities: ');
    });
  });
});
