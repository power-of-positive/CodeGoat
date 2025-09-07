/**
 * Test that all exports are available from the main index file
 */
import * as libIndex from './index';

describe('lib/index exports', () => {
  it('should export precommit functionality', () => {
    expect(libIndex.runPrecommitChecks).toBeDefined();
    expect(typeof libIndex.runPrecommitChecks).toBe('function');

    expect(libIndex.runAllChecks).toBeDefined();
    expect(typeof libIndex.runAllChecks).toBe('function');
  });

  it('should export formatting functions', () => {
    expect(libIndex.runTypeScriptCheck).toBeDefined();
    expect(typeof libIndex.runTypeScriptCheck).toBe('function');

    expect(libIndex.runPrettierFormat).toBeDefined();
    expect(typeof libIndex.runPrettierFormat).toBe('function');

    expect(libIndex.runEslintFix).toBeDefined();
    expect(typeof libIndex.runEslintFix).toBe('function');
  });

  it('should export file utilities', () => {
    expect(libIndex.getStagedFiles).toBeDefined();
    expect(typeof libIndex.getStagedFiles).toBe('function');
  });

  it('should export frontend check runners', () => {
    expect(libIndex.runFrontendLinting).toBeDefined();
    expect(typeof libIndex.runFrontendLinting).toBe('function');

    expect(libIndex.runFrontendTests).toBeDefined();
    expect(typeof libIndex.runFrontendTests).toBe('function');

    expect(libIndex.runPlaywrightTests).toBeDefined();
    expect(typeof libIndex.runPlaywrightTests).toBe('function');
  });

  it('should export backend check runners', () => {
    expect(libIndex.runRustFormatting).toBeDefined();
    expect(typeof libIndex.runRustFormatting).toBe('function');

    expect(libIndex.runRustLinting).toBeDefined();
    expect(typeof libIndex.runRustLinting).toBe('function');
  });

  it('should export security functions', () => {
    expect(libIndex.runSecurityChecks).toBeDefined();
    expect(typeof libIndex.runSecurityChecks).toBe('function');
  });

  it('should export utility functions', () => {
    expect(libIndex.findProjectRoot).toBeDefined();
    expect(typeof libIndex.findProjectRoot).toBe('function');

    expect(libIndex.createSuccessResult).toBeDefined();
    expect(typeof libIndex.createSuccessResult).toBe('function');

    expect(libIndex.createFailureResult).toBeDefined();
    expect(typeof libIndex.createFailureResult).toBe('function');

    expect(libIndex.validateInput).toBeDefined();
    expect(typeof libIndex.validateInput).toBe('function');

    expect(libIndex.validateDirectoryExists).toBeDefined();
    expect(typeof libIndex.validateDirectoryExists).toBe('function');
  });

  it('should export LLM functionality', () => {
    expect(libIndex.generateLlmReviewComments).toBeDefined();
    expect(typeof libIndex.generateLlmReviewComments).toBe('function');

    expect(libIndex.checkLlmReview).toBeDefined();
    expect(typeof libIndex.checkLlmReview).toBe('function');
  });

  it('should export analysis functions', () => {
    expect(libIndex.runCodeAnalysis).toBeDefined();
    expect(typeof libIndex.runCodeAnalysis).toBe('function');
  });

  it('should have all expected exports', () => {
    const expectedExports = [
      'runPrecommitChecks',
      'runAllChecks',
      'runTypeScriptCheck',
      'runPrettierFormat',
      'runEslintFix',
      'getStagedFiles',
      'runFrontendLinting',
      'runFrontendTests',
      'runPlaywrightTests',
      'runRustFormatting',
      'runRustLinting',
      'runSecurityChecks',
      'findProjectRoot',
      'createSuccessResult',
      'createFailureResult',
      'validateInput',
      'validateDirectoryExists',
      'generateLlmReviewComments',
      'checkLlmReview',
      'runCodeAnalysis',
    ];

    expectedExports.forEach(exportName => {
      expect(libIndex).toHaveProperty(exportName);
      expect(libIndex[exportName as keyof typeof libIndex]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.keys(libIndex).forEach(key => {
      expect(libIndex[key as keyof typeof libIndex]).not.toBeUndefined();
    });
  });

  it('should export functions or constructors', () => {
    const functionExports = [
      'runPrecommitChecks',
      'runAllChecks',
      'runTypeScriptCheck',
      'runPrettierFormat',
      'runEslintFix',
      'getStagedFiles',
      'runFrontendLinting',
      'runFrontendTests',
      'runPlaywrightTests',
      'runRustFormatting',
      'runRustLinting',
      'runSecurityChecks',
      'findProjectRoot',
      'createSuccessResult',
      'createFailureResult',
      'validateInput',
      'validateDirectoryExists',
      'generateLlmReviewComments',
      'checkLlmReview',
      'runCodeAnalysis',
    ];

    functionExports.forEach(exportName => {
      const exportValue = libIndex[exportName as keyof typeof libIndex];
      expect(typeof exportValue).toBe('function');
    });
  });
});
