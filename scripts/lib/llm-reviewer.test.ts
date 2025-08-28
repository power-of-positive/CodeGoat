/**
 * Test backward compatibility wrapper for LLM reviewer
 */
import LLMReviewerDefault, { LLMReviewer } from './llm-reviewer';

// Mock the main LLM module
jest.mock('./llm/llm-reviewer', () => {
  class MockLLMReviewer {
    constructor() {}
    
    async reviewCode(_filePath: string, _content: string) {
      return { success: true, comments: 'Mock review' };
    }
  }
  
  return {
    LLMReviewer: MockLLMReviewer
  };
});

describe('llm-reviewer compatibility wrapper', () => {
  describe('default export', () => {
    it('should export LLMReviewer as default', () => {
      expect(LLMReviewerDefault).toBeDefined();
      expect(typeof LLMReviewerDefault).toBe('function');
    });

    it('should be able to instantiate default export', () => {
      const reviewer = new LLMReviewerDefault();
      expect(reviewer).toBeDefined();
      expect(reviewer).toBeInstanceOf(LLMReviewerDefault);
    });

    it('should be able to call methods on default export instance', async () => {
      const reviewer = new LLMReviewerDefault();
      const result = await reviewer.reviewCode('test.ts', 'test content');
      expect(result).toEqual({ success: true, comments: 'Mock review' });
    });

    it('should be constructible without options', () => {
      const reviewer = new LLMReviewerDefault();
      expect(reviewer).toBeDefined();
      expect(reviewer).toBeInstanceOf(LLMReviewerDefault);
    });
  });

  describe('named export', () => {
    it('should export LLMReviewer as named export', () => {
      expect(LLMReviewer).toBeDefined();
      expect(typeof LLMReviewer).toBe('function');
    });

    it('should be able to instantiate named export', () => {
      const reviewer = new LLMReviewer();
      expect(reviewer).toBeDefined();
      expect(reviewer).toBeInstanceOf(LLMReviewer);
    });

    it('should be able to call methods on named export instance', async () => {
      const reviewer = new LLMReviewer();
      const result = await reviewer.reviewCode('test.ts', 'test content');
      expect(result).toEqual({ success: true, comments: 'Mock review' });
    });

    it('should be constructible without options', () => {
      const reviewer = new LLMReviewer();
      expect(reviewer).toBeDefined();
      expect(reviewer).toBeInstanceOf(LLMReviewer);
    });
  });

  describe('export equality', () => {
    it('should have default and named exports reference the same constructor', () => {
      expect(LLMReviewerDefault).toBe(LLMReviewer);
    });

    it('should create instances of the same type', () => {
      const defaultInstance = new LLMReviewerDefault();
      const namedInstance = new LLMReviewer();
      
      expect(defaultInstance.constructor).toBe(namedInstance.constructor);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain interface compatibility', async () => {
      const reviewer = new LLMReviewer();
      
      // Test that the basic interface is maintained
      expect(typeof reviewer.reviewCode).toBe('function');
      
      const result = await reviewer.reviewCode('test.ts', 'test content');
      expect(result).toBeDefined();
    });

    it('should work with different instantiation patterns', () => {
      // Test various ways the old code might have used the reviewer
      const reviewer1 = new LLMReviewer();
      const reviewer2 = new LLMReviewerDefault();
      const reviewer3 = new (require('./llm-reviewer').default)();
      const reviewer4 = new (require('./llm-reviewer').LLMReviewer)();
      
      expect(reviewer1).toBeInstanceOf(LLMReviewer);
      expect(reviewer2).toBeInstanceOf(LLMReviewer);
      expect(reviewer3).toBeInstanceOf(LLMReviewer);
      expect(reviewer4).toBeInstanceOf(LLMReviewer);
    });
  });
});