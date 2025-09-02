/**
 * Tests for llm-reviewer-core.ts
 */

import OpenAI from 'openai';
import { LLMReviewerCore } from './llm-reviewer-core';
import type { ReviewResult } from './llm-reviewer-types';

// Mock OpenAI
jest.mock('openai');

describe('LLMReviewerCore', () => {
  const originalEnv = process.env;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockCompletion: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env = { ...originalEnv };
    
    // Setup OpenAI mock
    mockCompletion = jest.fn();
    mockOpenAI = {
      chat: {
        completions: {
          create: mockCompletion,
        },
      },
    } as any;
    
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize successfully with valid API key', () => {
      process.env.OPENAI_API_KEY = 'test-api-key-123456789';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => new LLMReviewerCore()).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 LLMReviewerCore: Checking for OPENAI_API_KEY...');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 API Key found: Yes (length: 22)'); // Updated length
      expect(consoleSpy).toHaveBeenCalledWith('✅ LLMReviewerCore initialized with model: gpt-4o-mini');
      
      consoleSpy.mockRestore();
    });

    it('should use custom model from environment variable', () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.LLM_REVIEWER_MODEL = 'gpt-4';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      new LLMReviewerCore();
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ LLMReviewerCore initialized with model: gpt-4');
      
      consoleSpy.mockRestore();
    });

    it('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => new LLMReviewerCore()).toThrow('OPENAI_API_KEY environment variable is required');
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 LLMReviewerCore: Checking for OPENAI_API_KEY...');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 API Key found: No');
      expect(consoleSpy).toHaveBeenCalledWith('❌ OPENAI_API_KEY environment variable is not set!');
      
      consoleSpy.mockRestore();
    });

    it('should throw error when API key is empty string', () => {
      process.env.OPENAI_API_KEY = '';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => new LLMReviewerCore()).toThrow('OPENAI_API_KEY environment variable is required');
      
      consoleSpy.mockRestore();
    });

    it('should log available environment variables when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OTHER_API_KEY = 'test';
      process.env.OPENAI_ORG = 'test-org';
      process.env.REGULAR_VAR = 'test';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        new LLMReviewerCore();
      } catch (e) {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Available env vars:',
        expect.arrayContaining(['OTHER_API_KEY', 'OPENAI_ORG'])
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Available env vars:',
        expect.not.arrayContaining(['REGULAR_VAR'])
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('reviewCode', () => {
    let core: LLMReviewerCore;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      core = new LLMReviewerCore();
    });

    it('should successfully review code and return structured result', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'medium',
              issues: ['Potential null pointer exception'],
              suggestions: ['Add null checks'],
              summary: 'Code has some potential issues',
              hasBlockingIssues: false,
              confidence: 0.8
            })
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'const x = null; x.toString();');

      expect(result).toEqual({
        severity: 'medium',
        issues: ['Potential null pointer exception'],
        suggestions: ['Add null checks'],
        summary: 'Code has some potential issues',
        hasBlockingIssues: false,
        confidence: 0.8
      });

      expect(mockCompletion).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: expect.stringContaining('You are a senior code reviewer')
        }],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: {
          type: 'json_schema',
          json_schema: expect.any(Object)
        }
      });
    });

    it('should handle malformed JSON response gracefully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'invalid json {'
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual({
        severity: 'medium',
        issues: ['Review failed due to API error'],
        suggestions: ['Manual review recommended'],
        summary: 'Automated review could not be completed',
        hasBlockingIssues: false,
        confidence: 0.1
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Review failed for test.ts:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle OpenAI API errors', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockCompletion.mockRejectedValue(apiError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await core.reviewCode('test.js', 'console.log("test");');

      expect(result).toEqual({
        severity: 'medium',
        issues: ['Review failed due to API error'],
        suggestions: ['Manual review recommended'],
        summary: 'Automated review could not be completed',
        hasBlockingIssues: false,
        confidence: 0.1
      });

      expect(consoleSpy).toHaveBeenCalledWith('Review failed for test.js:', apiError);
      consoleSpy.mockRestore();
    });

    it('should handle null response content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.tsx', 'export default function Component() {}');

      expect(result).toEqual({
        severity: 'low',
        issues: [],
        suggestions: [],
        summary: 'No summary provided',
        hasBlockingIssues: false,
        confidence: 0.5
      });
    });

    it('should create proper review prompt with file extension', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{}' } }]
      };
      mockCompletion.mockResolvedValue(mockResponse);

      await core.reviewCode('components/Button.tsx', 'export const Button = () => <div>Click</div>;');

      expect(mockCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{
            role: 'user',
            content: expect.stringContaining('Review this tsx file for quality')
          }]
        })
      );

      const callArgs = mockCompletion.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;
      
      expect(prompt).toContain('File: components/Button.tsx');
      expect(prompt).toContain('```tsx');
      expect(prompt).toContain('export const Button = () => <div>Click</div>;');
      expect(prompt).toContain('Security vulnerabilities');
      expect(prompt).toContain('Critical bugs or logic errors');
      expect(prompt).toContain('Performance issues');
    });

    it('should use correct JSON schema for structured response', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{}' } }]
      };
      mockCompletion.mockResolvedValue(mockResponse);

      await core.reviewCode('test.py', 'print("hello")');

      const callArgs = mockCompletion.mock.calls[0][0];
      const schema = callArgs.response_format.json_schema;

      expect(schema).toEqual({
        name: 'review_result',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            issues: {
              type: 'array',
              items: { type: 'string' }
            },
            suggestions: {
              type: 'array',
              items: { type: 'string' }
            },
            summary: { type: 'string' },
            hasBlockingIssues: { type: 'boolean' },
            confidence: { type: 'number' }
          },
          required: [
            'severity',
            'issues',
            'suggestions',
            'summary',
            'hasBlockingIssues',
            'confidence'
          ],
          additionalProperties: false
        }
      });
    });
  });

  describe('validateAndNormalizeResult', () => {
    let core: LLMReviewerCore;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      core = new LLMReviewerCore();
    });

    it('should validate and normalize valid result', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'high',
              issues: ['Critical security flaw'],
              suggestions: ['Fix immediately'],
              summary: 'High severity issues found',
              hasBlockingIssues: true,
              confidence: 0.95
            })
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'eval(userInput);');

      expect(result.severity).toBe('high');
      expect(result.hasBlockingIssues).toBe(true);
      expect(result.confidence).toBe(0.95);
    });

    it('should normalize invalid severity to low', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'invalid-severity',
              issues: ['test'],
              suggestions: ['test'],
              summary: 'test',
              hasBlockingIssues: false,
              confidence: 0.5
            })
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      expect(result.severity).toBe('low');
    });

    it('should normalize non-array issues and suggestions to empty arrays', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'medium',
              issues: 'not an array',
              suggestions: null,
              summary: 'test',
              hasBlockingIssues: false,
              confidence: 0.5
            })
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      expect(result.issues).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should normalize invalid summary to default', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'low',
              issues: [],
              suggestions: [],
              summary: null,
              hasBlockingIssues: false,
              confidence: 0.5
            })
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      expect(result.summary).toBe('No summary provided');
    });

    it('should normalize boolean values correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'low',
              issues: [],
              suggestions: [],
              summary: 'test',
              hasBlockingIssues: 'true', // string instead of boolean
              confidence: 0.5
            })
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      expect(result.hasBlockingIssues).toBe(true);
    });

    it('should clamp confidence values to valid range', async () => {
      const testCases = [
        { input: -0.5, expected: 0 },
        { input: 1.5, expected: 1 },
        { input: 0.7, expected: 0.7 },
        { input: null, expected: 0.5 }, // default
        { input: 'invalid', expected: 0.5 }, // default
      ];

      for (const { input, expected } of testCases) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                severity: 'low',
                issues: [],
                suggestions: [],
                summary: 'test',
                hasBlockingIssues: false,
                confidence: input
              })
            }
          }]
        };

        mockCompletion.mockResolvedValue(mockResponse);

        const result = await core.reviewCode('test.ts', 'const x = 1;');

        expect(result.confidence).toBe(expected);
      }
    });

    it('should handle completely malformed response object', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify('just a string')
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      expect(result).toEqual({
        severity: 'low',
        issues: [],
        suggestions: [],
        summary: 'No summary provided',
        hasBlockingIssues: false,
        confidence: 0.5
      });
    });

    it('should handle null result object', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify(null)
          }
        }]
      };

      mockCompletion.mockResolvedValue(mockResponse);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await core.reviewCode('test.ts', 'const x = 1;');

      // When the result is null, it triggers the error path
      expect(result).toEqual({
        severity: 'medium',
        issues: ['Review failed due to API error'],
        suggestions: ['Manual review recommended'],
        summary: 'Automated review could not be completed',
        hasBlockingIssues: false,
        confidence: 0.1
      });

      consoleSpy.mockRestore();
    });
  });
});