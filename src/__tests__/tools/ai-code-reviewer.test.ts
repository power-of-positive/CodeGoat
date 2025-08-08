import fs from 'fs';
import { execSync } from 'child_process';
import {
  getStagedFiles,
  getFileContent,
  reviewCode,
  shouldBlockCommit,
  formatResults,
  outputResults,
} from '../../tools/ai-code-reviewer';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');

// Mock fetch globally
global.fetch = jest.fn();

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AI Code Reviewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('getStagedFiles', () => {
    it('should return TypeScript and JavaScript files from git diff', async () => {
      mockExecSync.mockReturnValue('src/index.ts\nsrc/utils.js\nREADME.md\nsrc/component.tsx\n');

      const files = await getStagedFiles();

      expect(mockExecSync).toHaveBeenCalledWith('git diff --cached --name-only --diff-filter=AM', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      expect(files).toEqual(['src/index.ts', 'src/utils.js', 'src/component.tsx']);
    });

    it('should return empty array when no files are staged', async () => {
      mockExecSync.mockReturnValue('');

      const files = await getStagedFiles();

      expect(files).toEqual([]);
    });

    it('should handle git errors gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const files = await getStagedFiles();

      expect(files).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'export const test = "hello";';
      mockFs.readFileSync.mockReturnValue(mockContent);

      const content = await getFileContent('src/test.ts');

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('src/test.ts'),
        'utf8'
      );
      expect(content).toBe(mockContent);
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const content = await getFileContent('nonexistent.ts');

      expect(content).toBeNull();
    });
  });

  describe('reviewCode', () => {
    it('should return empty review when no API key is configured', async () => {
      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual({
        reviews: [],
        summary: 'No API key configured',
      });
    });

    it('should make API call and parse response correctly', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      const mockResponse = {
        reviews: [
          {
            line: 1,
            severity: 'low',
            category: 'style',
            message: 'Consider using const instead of var',
            suggestion: 'Replace var with const',
          },
        ],
        summary: 'Code looks generally good',
      };

      mockFetch.mockResolvedValue({
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
      } as any);

      const result = await reviewCode('test.ts', 'var x = 1;');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle markdown-wrapped JSON responses', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      const mockResponse = {
        reviews: [],
        summary: 'Good code',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(mockResponse)}\n\`\`\``,
              },
            },
          ],
        }),
      } as any);

      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].severity).toBe('info');
      expect(result.reviews[0].category).toBe('system');
      expect(result.reviews[0].message).toContain('AI review failed');
    });

    it('should handle network errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await reviewCode('test.ts', 'const x = 1;');

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].message).toContain('Network error');
    });
  });

  describe('shouldBlockCommit', () => {
    it('should block commit for high severity issues when threshold is high', () => {
      const reviews = [
        { line: 1, severity: 'high', category: 'security', message: 'Security issue' },
        { line: 2, severity: 'low', category: 'style', message: 'Style issue' },
      ] as any;

      const shouldBlock = shouldBlockCommit(reviews, 'high');

      expect(shouldBlock).toBe(true);
    });

    it('should not block commit for low severity issues when threshold is high', () => {
      const reviews = [
        { line: 1, severity: 'low', category: 'style', message: 'Style issue' },
        { line: 2, severity: 'medium', category: 'quality', message: 'Quality issue' },
      ] as any;

      const shouldBlock = shouldBlockCommit(reviews, 'high');

      expect(shouldBlock).toBe(false);
    });

    it('should block commit for medium severity when threshold is medium', () => {
      const reviews = [
        { line: 1, severity: 'medium', category: 'performance', message: 'Performance issue' },
      ] as any;

      const shouldBlock = shouldBlockCommit(reviews, 'medium');

      expect(shouldBlock).toBe(true);
    });
  });

  describe('formatResults', () => {
    it('should format results correctly', () => {
      const fileResults = [
        {
          file: 'test1.ts',
          reviews: [
            { line: 1, severity: 'high', category: 'security', message: 'Issue 1' },
            { line: 2, severity: 'low', category: 'style', message: 'Issue 2' },
          ],
          summary: 'Test file 1',
        },
        {
          file: 'test2.ts',
          reviews: [{ line: 5, severity: 'medium', category: 'quality', message: 'Issue 3' }],
          summary: 'Test file 2',
        },
      ] as any;

      const formatted = formatResults(fileResults);

      expect(formatted.summary.totalFiles).toBe(2);
      expect(formatted.summary.totalIssues).toBe(3);
      expect(formatted.summary.bySeverity).toEqual({
        high: 1,
        low: 1,
        medium: 1,
      });
      expect(formatted.allReviews).toHaveLength(3);
      expect(formatted.allReviews[0]).toHaveProperty('file', 'test1.ts');
    });

    it('should calculate blocking correctly', () => {
      const fileResults = [
        {
          file: 'test.ts',
          reviews: [
            { line: 1, severity: 'critical', category: 'security', message: 'Critical issue' },
          ],
          summary: 'Test file',
        },
      ] as any;

      const formatted = formatResults(fileResults);

      expect(formatted.blocked).toBe(true);
    });
  });

  describe('outputResults', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockFs.writeFileSync.mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should output results to console and file', () => {
      const results = {
        summary: {
          totalFiles: 2,
          totalIssues: 3,
          bySeverity: { high: 1, medium: 1, low: 1 },
        },
        files: [],
        allReviews: [
          {
            file: 'test.ts',
            line: 1,
            severity: 'high',
            category: 'security',
            message: 'Security issue',
            suggestion: 'Fix the security issue',
          },
        ],
        blocked: false,
      } as any;

      outputResults(results);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('ai-review-results.json'),
        JSON.stringify(results, null, 2)
      );
      expect(consoleSpy).toHaveBeenCalledWith('\n🤖 AI Code Review Results');
      expect(consoleSpy).toHaveBeenCalledWith('Files reviewed: 2');
      expect(consoleSpy).toHaveBeenCalledWith('Total issues: 3');
    });

    it('should show blocking message when commit should be blocked', () => {
      const results = {
        summary: { totalFiles: 1, totalIssues: 1, bySeverity: { critical: 1 } },
        files: [],
        allReviews: [],
        blocked: true,
      } as any;

      outputResults(results);

      expect(consoleSpy).toHaveBeenCalledWith('\n❌ Commit blocked due to high severity issues!');
    });

    it('should show success message when commit can proceed', () => {
      const results = {
        summary: { totalFiles: 1, totalIssues: 0, bySeverity: {} },
        files: [],
        allReviews: [],
        blocked: false,
      } as any;

      outputResults(results);

      expect(consoleSpy).toHaveBeenCalledWith('\n✅ No blocking issues found. Commit can proceed.');
    });
  });
});
