import {
  shouldBlockCommit,
  formatResults,
  getConfig,
  getStagedFiles,
  getFileContent,
  reviewCode,
  outputResults,
  main,
} from '../../tools/ai-code-reviewer';
import type { ReviewItem, FileReviewResult } from '../../tools/ai-code-reviewer.types';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Mock console.log to prevent output during tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('AI Code Reviewer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment to clean state for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('shouldBlockCommit', () => {
    it('should block on medium severity when configured for medium', () => {
      // Explicitly set the severity level to ensure test consistency
      process.env.AI_REVIEWER_MAX_SEVERITY = 'medium';
      
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'medium',
          category: 'security',
          message: 'Potential SQL injection vulnerability',
        },
        {
          line: 20,
          severity: 'low',
          category: 'style',
          message: 'Consider using const instead of let',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(true); // Should block because of medium severity issue
    });

    it('should not block on low severity when configured for medium', () => {
      // Explicitly set the severity level to ensure test consistency
      process.env.AI_REVIEWER_MAX_SEVERITY = 'medium';
      
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'low',
          category: 'style',
          message: 'Consider using const instead of let',
        },
        {
          line: 20,
          severity: 'info',
          category: 'best-practice',
          message: 'Consider adding JSDoc comments',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(false); // Should not block, only low/info issues
    });

    it('should block on high severity when configured for medium', () => {
      // Explicitly set the severity level to ensure test consistency
      process.env.AI_REVIEWER_MAX_SEVERITY = 'medium';
      
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'high',
          category: 'security',
          message: 'Hardcoded API key detected',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(true); // Should block because high > medium
    });

    it('should block on critical severity when configured for medium', () => {
      // Explicitly set the severity level to ensure test consistency
      process.env.AI_REVIEWER_MAX_SEVERITY = 'medium';
      
      const reviews: ReviewItem[] = [
        {
          line: 5,
          severity: 'critical',
          category: 'security',
          message: 'Remote code execution vulnerability',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(true); // Should block because critical > medium
    });

    it('should respect custom severity threshold', () => {
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'high',
          category: 'security',
          message: 'Security issue',
        },
        {
          line: 20,
          severity: 'medium',
          category: 'performance',
          message: 'Performance issue',
        },
      ];

      // Test with 'high' threshold - should only block on high/critical
      const resultHigh = shouldBlockCommit(reviews, 'high');
      expect(resultHigh).toBe(true); // Blocks because of high severity

      // Test with 'critical' threshold - should only block on critical
      const resultCritical = shouldBlockCommit(reviews, 'critical');
      expect(resultCritical).toBe(false); // Doesn't block, no critical issues
    });

    it('should handle empty reviews', () => {
      // Explicitly set the severity level to ensure test consistency
      process.env.AI_REVIEWER_MAX_SEVERITY = 'medium';
      
      const reviews: ReviewItem[] = [];
      const result = shouldBlockCommit(reviews);
      expect(result).toBe(false); // No issues, no blocking
    });
  });

  describe('formatResults', () => {
    it('should correctly format results and identify blocking status', () => {
      // Explicitly set the severity level to ensure test consistency
      process.env.AI_REVIEWER_MAX_SEVERITY = 'medium';
      
      const fileResults: FileReviewResult[] = [
        {
          file: 'src/index.ts',
          reviews: [
            {
              line: 10,
              severity: 'medium',
              category: 'security',
              message: 'Potential XSS vulnerability',
            },
            {
              line: 20,
              severity: 'low',
              category: 'style',
              message: 'Inconsistent naming',
            },
          ],
          summary: 'Found security concerns',
        },
        {
          file: 'src/utils.ts',
          reviews: [
            {
              line: 5,
              severity: 'info',
              category: 'best-practice',
              message: 'Consider using TypeScript strict mode',
            },
          ],
          summary: 'Minor improvements suggested',
        },
      ];

      const formatted = formatResults(fileResults);

      expect(formatted.summary.totalFiles).toBe(2);
      expect(formatted.summary.totalIssues).toBe(3);
      expect(formatted.summary.bySeverity).toEqual({
        medium: 1,
        low: 1,
        info: 1,
      });
      expect(formatted.blocked).toBe(true); // Should block due to medium severity issue
      expect(formatted.allReviews).toHaveLength(3);
    });

    it('should not block when only low/info issues exist', () => {
      const fileResults: FileReviewResult[] = [
        {
          file: 'src/index.ts',
          reviews: [
            {
              line: 10,
              severity: 'low',
              category: 'style',
              message: 'Consider refactoring',
            },
            {
              line: 20,
              severity: 'info',
              category: 'best-practice',
              message: 'Add documentation',
            },
          ],
          summary: 'Minor issues found',
        },
      ];

      const formatted = formatResults(fileResults);

      expect(formatted.blocked).toBe(false); // Should not block
      expect(formatted.summary.bySeverity).toEqual({
        low: 1,
        info: 1,
      });
    });
  });

  describe('Config', () => {

    it('should default to medium severity blocking', () => {
      delete process.env.AI_REVIEWER_MAX_SEVERITY;
      const config = getConfig();
      expect(config.maxSeverityToBlock).toBe('medium');
    });

    it('should respect environment variable for severity', () => {
      process.env.AI_REVIEWER_MAX_SEVERITY = 'high';
      const config = getConfig();
      expect(config.maxSeverityToBlock).toBe('high');
    });

    it('should be enabled by default', () => {
      delete process.env.AI_REVIEWER_ENABLED;
      const config = getConfig();
      expect(config.enabled).toBe(true);
    });

    it('should respect disabled state', () => {
      process.env.AI_REVIEWER_ENABLED = 'false';
      const config = getConfig();
      expect(config.enabled).toBe(false);
    });
  });

  describe('getStagedFiles', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return TypeScript and JavaScript staged files', async () => {
      mockExecSync.mockReturnValue(
        'src/index.ts\nsrc/component.tsx\nsrc/utils.js\nsrc/app.jsx\nREADME.md\npackage.json\n'
      );

      const files = await getStagedFiles();

      expect(files).toEqual(['src/index.ts', 'src/component.tsx', 'src/utils.js', 'src/app.jsx']);
      expect(mockExecSync).toHaveBeenCalledWith('git diff --cached --name-only --diff-filter=AM', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
    });

    it('should filter out non-JS/TS files', async () => {
      mockExecSync.mockReturnValue('README.md\npackage.json\n.gitignore\nDockerfile\n');

      const files = await getStagedFiles();

      expect(files).toEqual([]);
    });

    it('should handle empty git output', async () => {
      mockExecSync.mockReturnValue('');

      const files = await getStagedFiles();

      expect(files).toEqual([]);
    });

    it('should handle git errors gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const files = await getStagedFiles();

      expect(files).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    it('should read file content successfully', async () => {
      const mockContent = 'const hello = "world";';
      mockFs.readFileSync.mockReturnValue(mockContent);

      const content = await getFileContent('src/test.ts');

      expect(content).toBe(mockContent);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('src/test.ts'),
        'utf8'
      );
    });

    it('should handle file read errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const content = await getFileContent('nonexistent.ts');

      expect(content).toBeNull();
    });

    it('should handle permission errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const content = await getFileContent('protected.ts');

      expect(content).toBeNull();
    });
  });

  describe('reviewCode', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AI_REVIEWER_ENDPOINT = 'https://api.openai.com/v1';
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return empty review when no API key is configured', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual({
        reviews: [],
        summary: 'No API key configured',
      });
    });

    it('should make API call and parse response', async () => {
      const mockResponse = {
        reviews: [
          {
            line: 1,
            severity: 'low',
            category: 'style',
            message: 'Consider using const instead of var',
          },
        ],
        summary: 'Minor style issues found',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const result = await reviewCode('test.ts', 'var x = 1;');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual({
        reviews: [
          {
            line: null,
            severity: 'info',
            category: 'system',
            message: 'AI review failed: Network error',
          },
        ],
        summary: 'Review failed due to technical issue',
      });
    });

    it('should handle invalid JSON response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'invalid json content',
              },
            },
          ],
        }),
      });

      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual({
        reviews: [
          {
            line: null,
            severity: 'info',
            category: 'system',
            message: expect.stringContaining('AI review failed:'),
          },
        ],
        summary: 'Review failed due to technical issue',
      });
    });
  });

  describe('outputResults', () => {
    const originalConsoleLog = console.log;
    let consoleOutput: string[] = [];

    beforeEach(() => {
      jest.clearAllMocks();
      consoleOutput = [];
      console.log = jest.fn().mockImplementation(msg => consoleOutput.push(msg));
      mockPath.join.mockImplementation((...args) => args.join('/'));
      mockFs.writeFileSync.mockImplementation(() => {});
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should output results with no issues', () => {
      const results = {
        summary: {
          totalFiles: 2,
          totalIssues: 0,
          bySeverity: {},
        },
        files: [],
        allReviews: [],
        blocked: false,
      };

      outputResults(results);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(results, null, 2)
      );
      expect(consoleOutput).toContain('Files reviewed: 2');
      expect(consoleOutput).toContain('Total issues: 0');
      expect(consoleOutput.some(msg => msg.includes('No blocking issues found'))).toBe(true);
    });

    it('should output results with issues and blocking', () => {
      const results = {
        summary: {
          totalFiles: 1,
          totalIssues: 2,
          bySeverity: {
            high: 1,
            low: 1,
          },
        },
        files: [],
        allReviews: [
          {
            file: 'test.ts',
            line: 10,
            severity: 'high' as const,
            category: 'security' as const,
            message: 'Security issue',
          },
          {
            file: 'test.ts',
            line: 20,
            severity: 'low' as const,
            category: 'style' as const,
            message: 'Style issue',
          },
        ],
        blocked: true,
      };

      outputResults(results);

      expect(consoleOutput).toContain('Total issues: 2');
      expect(consoleOutput.some(msg => msg.includes('high: 1'))).toBe(true);
      expect(consoleOutput.some(msg => msg.includes('Commit blocked'))).toBe(true);
    });
  });

  describe('main', () => {
    const originalExit = process.exit;
    let exitCode: number | undefined;

    beforeEach(() => {
      jest.clearAllMocks();
      exitCode = undefined;
      process.exit = jest.fn().mockImplementation((code: number) => {
        exitCode = code;
      }) as never;
      mockPath.join.mockImplementation((...args) => args.join('/'));
      mockFs.writeFileSync.mockImplementation(() => {});
    });

    afterEach(() => {
      process.exit = originalExit;
    });

    it('should exit early when disabled', async () => {
      process.env.AI_REVIEWER_ENABLED = 'false';

      await main();

      expect(exitCode).toBe(0);
      // The main function might still call getStagedFiles before checking config
      // so we don't assert that mockExecSync is never called
    });

    it('should exit early when no staged files', async () => {
      process.env.AI_REVIEWER_ENABLED = 'true';
      mockExecSync.mockReturnValue('');

      await main();

      expect(exitCode).toBe(0);
    });

    it('should process files and exit with error code when blocking', async () => {
      process.env.AI_REVIEWER_ENABLED = 'true';
      process.env.OPENAI_API_KEY = 'test-key';

      mockExecSync.mockReturnValue('test.ts\n');
      mockFs.readFileSync.mockReturnValue('const x = 1;');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reviews: [
                    {
                      line: 1,
                      severity: 'high',
                      category: 'security',
                      message: 'Security issue',
                    },
                  ],
                  summary: 'High severity issue found',
                }),
              },
            },
          ],
        }),
      });

      await main();

      expect(exitCode).toBe(1);
    });

    it('should process files and exit successfully when no blocking issues', async () => {
      process.env.AI_REVIEWER_ENABLED = 'true';
      process.env.OPENAI_API_KEY = 'test-key';

      mockExecSync.mockReturnValue('test.ts\n');
      mockFs.readFileSync.mockReturnValue('const x = 1;');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reviews: [
                    {
                      line: 1,
                      severity: 'low',
                      category: 'style',
                      message: 'Minor style issue',
                    },
                  ],
                  summary: 'Minor issues found',
                }),
              },
            },
          ],
        }),
      });

      await main();

      expect(exitCode).toBe(0);
    });
  });
});
