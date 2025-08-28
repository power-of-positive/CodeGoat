/**
 * Simple tests for coverage-analysis.ts
 */
import { runScriptCoverage } from './coverage-analysis';

// Mock coverage-helpers
jest.mock('./coverage-helpers', () => ({
  buildCoverageCommand: jest.fn(() => ({
    command: 'npx vitest run --coverage',
    shouldSkip: false,
  })),
  executeCoverage: jest.fn(() => ({
    failed: false,
    output: '✅ Coverage analysis completed successfully',
  })),
}));

const mockExecuteCoverage = jest.requireMock('./coverage-helpers').executeCoverage;

describe('coverage-analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteCoverage.mockReturnValue({
      failed: false,
      output: '✅ Coverage analysis completed successfully',
    });
  });

  describe('runScriptCoverage', () => {
    it('should run coverage successfully', () => {
      const result = runScriptCoverage();

      expect(result.failed).toBe(false);
      expect(result.output).toBe('✅ Coverage analysis completed successfully');
    });

    it('should handle errors gracefully', () => {
      mockExecuteCoverage.mockReturnValue({
        failed: true,
        output: 'Coverage analysis failed: Test error',
      });

      const result = runScriptCoverage();

      expect(result.failed).toBe(true);
      expect(result.output).toContain('Coverage analysis failed');
    });
  });
});
