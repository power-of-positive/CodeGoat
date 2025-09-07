/**
 * Tests for failure-handler.ts
 */

import {
  createFailureHandler,
  handleStructuredFailure,
  type CheckFailure,
  type FailureReport,
} from './failure-handler';

describe('failure-handler', () => {
  describe('createFailureHandler', () => {
    it('should create a failure handler with empty failures initially', () => {
      const handler = createFailureHandler();

      expect(handler.hasFailures()).toBe(false);
      expect(handler.hasCriticalFailures()).toBe(false);
      expect(handler.getReport().failures).toEqual([]);
    });

    it('should add failures correctly', () => {
      const handler = createFailureHandler();
      const failure: CheckFailure = {
        category: 'test',
        message: 'Test failure message',
        critical: true,
      };

      handler.addFailure(failure);

      expect(handler.hasFailures()).toBe(true);
      expect(handler.hasCriticalFailures()).toBe(true);

      const report = handler.getReport();
      expect(report.failures).toHaveLength(1);
      expect(report.failures[0]).toEqual(failure);
    });

    it('should handle multiple failures', () => {
      const handler = createFailureHandler();

      const failure1: CheckFailure = {
        category: 'lint',
        message: 'Linting error',
        critical: false,
      };

      const failure2: CheckFailure = {
        category: 'security',
        message: 'Security issue',
        critical: true,
      };

      handler.addFailure(failure1);
      handler.addFailure(failure2);

      expect(handler.hasFailures()).toBe(true);
      expect(handler.hasCriticalFailures()).toBe(true);

      const report = handler.getReport();
      expect(report.failures).toHaveLength(2);
      expect(report.failures).toContain(failure1);
      expect(report.failures).toContain(failure2);
    });

    it('should detect critical failures when critical is undefined (defaults to true)', () => {
      const handler = createFailureHandler();
      const failure: CheckFailure = {
        category: 'other',
        message: 'Some failure',
        // critical is undefined, should default to true
      };

      handler.addFailure(failure);

      expect(handler.hasCriticalFailures()).toBe(true);
    });

    it('should not detect critical failures when explicitly set to false', () => {
      const handler = createFailureHandler();
      const failure: CheckFailure = {
        category: 'lint',
        message: 'Non-critical lint warning',
        critical: false,
      };

      handler.addFailure(failure);

      expect(handler.hasFailures()).toBe(true);
      expect(handler.hasCriticalFailures()).toBe(false);
    });

    it('should return independent copies of failures array', () => {
      const handler = createFailureHandler();
      const failure: CheckFailure = {
        category: 'test',
        message: 'Test failure',
      };

      handler.addFailure(failure);

      const report1 = handler.getReport();
      const report2 = handler.getReport();

      expect(report1.failures).not.toBe(report2.failures);
      expect(report1.failures).toEqual(report2.failures);
    });
  });

  describe('handleStructuredFailure', () => {
    it('should approve when no failures', () => {
      const report: FailureReport = { failures: [] };
      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('All checks passed!');
      expect(result.feedback).toContain('code-review-comments.tmp');
    });

    it('should approve when failures is undefined', () => {
      const report: FailureReport = { failures: undefined as any };
      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('All checks passed!');
    });

    it('should block when critical failures exist', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'api-e2e',
            message: 'API test failed',
            critical: true,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Pre-commit checks completed with issues');
      expect(result.reason).toContain('API E2E TEST FAILURES (CRITICAL)');
      expect(result.reason).toContain('API test failed');
      expect(result.reason).toContain('CRITICAL: API E2E tests must pass');
    });

    it('should approve non-critical failures', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'lint',
            message: 'Minor linting issue',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Pre-commit checks completed with issues');
      expect(result.feedback).toContain('LINT ISSUES');
      expect(result.feedback).toContain('Minor linting issue');
    });

    it('should format test failures correctly', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'test',
            message: 'Unit test failed',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.feedback).toContain('FAILING TESTS:');
      expect(result.feedback).toContain('Unit test failed');
    });

    it('should format playwright failures correctly', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'playwright',
            message: 'E2E test failed',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.feedback).toContain('PLAYWRIGHT E2E TEST FAILURES:');
      expect(result.feedback).toContain('E2E test failed');
    });

    it('should format security failures correctly', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'security',
            message: 'Vulnerability found',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.feedback).toContain('SECURITY ISSUES:');
      expect(result.feedback).toContain('Vulnerability found');
    });

    it('should format other failures correctly', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'other',
            message: 'Unknown issue',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.feedback).toContain('OTHER ISSUES:');
      expect(result.feedback).toContain('Unknown issue');
    });

    it('should group multiple failures by category', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'test',
            message: 'Test 1 failed',
            critical: false,
          },
          {
            category: 'test',
            message: 'Test 2 failed',
            critical: false,
          },
          {
            category: 'lint',
            message: 'Lint issue',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.feedback).toContain('FAILING TESTS:');
      expect(result.feedback).toContain('Test 1 failed');
      expect(result.feedback).toContain('Test 2 failed');
      expect(result.feedback).toContain('LINT ISSUES:');
      expect(result.feedback).toContain('Lint issue');
    });

    it('should include helpful command suggestions', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'test',
            message: 'Test failed',
            critical: false,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.feedback).toContain('./scripts/run-api-e2e-vitest.sh');
      expect(result.feedback).toContain('npm run frontend:test');
      expect(result.feedback).toContain('npm run frontend:lint');
      expect(result.feedback).toContain('npm run test:playwright');
    });

    it('should handle mixed critical and non-critical failures', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'lint',
            message: 'Non-critical lint issue',
            critical: false,
          },
          {
            category: 'api-e2e',
            message: 'Critical API test failure',
            critical: true,
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('LINT ISSUES:');
      expect(result.reason).toContain('Non-critical lint issue');
      expect(result.reason).toContain('API E2E TEST FAILURES (CRITICAL):');
      expect(result.reason).toContain('Critical API test failure');
    });

    it('should handle failures with undefined critical property (defaults to critical)', () => {
      const report: FailureReport = {
        failures: [
          {
            category: 'other',
            message: 'Unknown failure',
            // critical is undefined - should be treated as critical
          },
        ],
      };

      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('OTHER ISSUES:');
      expect(result.reason).toContain('Unknown failure');
    });

    it('should handle empty failure message arrays gracefully', () => {
      const report: FailureReport = {
        failures: [],
      };

      const result = handleStructuredFailure(report);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('All checks passed!');
    });
  });
});
