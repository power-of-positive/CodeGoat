/**
 * Test utilities and mock helpers
 */

import { StructuredReviewData, ReviewResult, ProjectMetrics } from '../utils/types';

/**
 * Creates a mock ReviewResult with default values
 */
export function createMockReviewResult(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    severity: 'low',
    issues: [],
    suggestions: [],
    summary: 'Mock review summary',
    hasBlockingIssues: false,
    confidence: 0.9,
    ...overrides,
  };
}

/**
 * Creates mock structured review data
 */
export function createMockStructuredReview(
  overrides: Partial<StructuredReviewData> = {}
): StructuredReviewData {
  return {
    files: [
      {
        file: 'test.ts',
        result: createMockReviewResult(),
      },
    ],
    summary: {
      totalFiles: 1,
      highSeverity: 0,
      mediumSeverity: 0,
      totalIssues: 0,
    },
    ...overrides,
  };
}

/**
 * Creates mock project metrics
 */
export function createMockProjectMetrics(overrides: Partial<ProjectMetrics> = {}): ProjectMetrics {
  return {
    linesOfCode: 1000,
    testFiles: 10,
    totalFiles: 50,
    ...overrides,
  };
}

/**
 * Mock LLM Reviewer class for tests
 */
export class MockLLMReviewer {
  reviewChangedFiles = jest.fn().mockResolvedValue({
    structuredData: createMockStructuredReview(),
    textReport: 'Mock text report',
  });
}

/**
 * Common mock setup for execCommand
 */
export function setupExecCommandMock(mockImplementation?: () => string) {
  return jest.fn().mockImplementation(mockImplementation || (() => ''));
}

/**
 * Common mock setup for file filtering
 */
export function setupFilterValidFilesMock(returnValue: string[] = []) {
  return jest.fn().mockReturnValue(returnValue);
}

/**
 * Setup common test mocks with cleanup
 */
export function setupTestMocks() {
  const mocks = {
    execCommand: setupExecCommandMock(),
    filterValidFiles: setupFilterValidFilesMock(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
  };

  const cleanup = () => {
    Object.values(mocks).forEach(mock => mock.mockReset());
  };

  return { mocks, cleanup };
}
