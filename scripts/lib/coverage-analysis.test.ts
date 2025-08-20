/**
 * Simple tests for coverage-analysis.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runScriptCoverage } from './coverage-analysis';

// Mock coverage-helpers
const mockExecuteCoverage = vi.fn(() => ({
  failed: false,
  output: '✅ Coverage analysis completed successfully',
}));

vi.mock('./coverage-helpers', () => ({
  buildCoverageCommand: vi.fn(() => ({
    command: 'npx vitest run --coverage',
    shouldSkip: false,
  })),
  executeCoverage: mockExecuteCoverage,
}));

describe('coverage-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
