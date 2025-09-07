/**
 * Tests for precommit-handler.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runPrecommitChecks, PrecommitResult } from './precommit-handler';
import { findProjectRoot } from '../utils/review-utils';
import { runAllChecks } from './precommit-checks';
import { getStagedFiles } from '../files/staged-files';
import { runTypeScriptCheck } from '../formatting/format-runners';
import { runFormattingSteps } from './precommit-formatting';
import { runLlmReviewProcess } from './precommit-llm';

// Mock all dependencies
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/review-utils');
jest.mock('./precommit-checks');
jest.mock('../files/staged-files');
jest.mock('../formatting/format-runners');
jest.mock('./precommit-formatting');
jest.mock('./precommit-llm');

describe('precommit-handler', () => {
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    // Mock process.cwd and process.chdir
    jest.spyOn(process, 'cwd').mockReturnValue(mockProjectRoot);
    jest.spyOn(process, 'chdir').mockImplementation(() => {});
    jest.clearAllMocks();
    (findProjectRoot as jest.Mock).mockReturnValue(mockProjectRoot);
    (getStagedFiles as jest.Mock).mockReturnValue({
      frontendFiles: ['frontend/test.ts'],
      backendFiles: ['backend/test.rs'],
      scriptFiles: ['scripts/test.ts'],
      allFiles: ['frontend/test.ts', 'backend/test.rs', 'scripts/test.ts'],
    });
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.normalize as jest.Mock).mockImplementation(p => p);
    (path.resolve as jest.Mock).mockImplementation(p =>
      p.startsWith('/') ? p : `${mockProjectRoot}/${p}`
    );
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (runTypeScriptCheck as jest.Mock).mockReturnValue({
      success: true,
      output: 'TypeScript check passed',
    });
    (runFormattingSteps as jest.Mock).mockImplementation(() => {});
    (runLlmReviewProcess as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('PrecommitResult interface', () => {
    it('should have correct approve structure', () => {
      const approveResult: PrecommitResult = {
        decision: 'approve',
        feedback: 'All checks passed',
      };

      expect(approveResult.decision).toBe('approve');
      expect(approveResult).toHaveProperty('feedback');
    });

    it('should have correct block structure', () => {
      const blockResult: PrecommitResult = {
        decision: 'block',
        reason: 'Tests failed',
      };

      expect(blockResult.decision).toBe('block');
      expect(blockResult).toHaveProperty('reason');
    });
  });

  describe('runPrecommitChecks', () => {
    const mockAllChecks = (criticalFailure = false, blocked = false, output = '') => {
      (runAllChecks as jest.Mock).mockResolvedValue({
        criticalFailure,
        allOutput: output,
        analysisResult: { blocked, details: output },
      });
    };

    it('should approve when all checks pass', async () => {
      mockAllChecks(false, false, '');

      const result = await runPrecommitChecks();

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('All checks passed');
    });

    it('should block when TypeScript check fails', async () => {
      (runTypeScriptCheck as jest.Mock).mockReturnValue({
        success: false,
        output: 'TypeScript errors found',
      });

      const result = await runPrecommitChecks();

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TYPESCRIPT TYPE CHECK FAILURES');
      expect(result.reason).toContain('TypeScript errors found');
    });

    it('should block when critical failure occurs', async () => {
      mockAllChecks(true, false, 'Critical test failure');

      const result = await runPrecommitChecks();

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Pre-commit checks failed');
      expect(result.reason).toContain('Critical test failure');
    });

    it('should block when LLM review blocks', async () => {
      mockAllChecks(false, false, '');
      (runLlmReviewProcess as jest.Mock).mockResolvedValue({
        decision: 'block',
        reason: 'LLM REVIEW BLOCKING ISSUES: Critical issues found',
      });

      const result = await runPrecommitChecks();

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('LLM REVIEW BLOCKING ISSUES');
    });

    it('should handle execution errors gracefully', async () => {
      (runAllChecks as jest.Mock).mockRejectedValue(new Error('System error'));

      const result = await runPrecommitChecks();

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Precommit check execution failed');
      expect(result.reason).toContain('System error');
      expect(result.feedback).toContain('Fix the configuration or file system issues');
    });

    it('should handle directory restoration errors', async () => {
      mockAllChecks(false, false, '');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock process.chdir to fail only on second call (restoration)
      let chdirCallCount = 0;
      (process.chdir as jest.Mock).mockImplementation(() => {
        chdirCallCount++;
        if (chdirCallCount === 2) {
          // Second call is restoration
          throw new Error('chdir failed');
        }
      });

      const result = await runPrecommitChecks();

      expect(result.decision).toBe('approve');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restore working directory')
      );
    });
  });
});
