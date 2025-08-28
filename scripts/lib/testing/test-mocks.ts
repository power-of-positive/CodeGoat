/**
 * Common mock utilities and base mocks for test files
 */
import type { MockResult } from './test-types';

/**
 * Base mock result structure
 */
export const createMockResult = (overrides: Partial<MockResult> = {}): MockResult => ({
  failed: false,
  output: '',
  ...overrides,
});

/**
 * Common mock setup for file filtering
 */
export const createFileFilteringMock = () => ({
  filterValidFiles: jest.fn().mockReturnValue([]),
  filterCoverageFiles: jest.fn().mockReturnValue([]),
  filterTestFiles: jest.fn().mockReturnValue([]),
});

/**
 * Common mock setup for review utils
 */
export const createReviewUtilsMock = () => ({
  execCommand: jest.fn().mockReturnValue(''),
  runCommand: jest.fn().mockReturnValue(createMockResult()),
});

/**
 * Common mock setup for fs operations
 */
export const createFsMock = () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue(''),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
});

/**
 * Standard test setup helpers
 */
export const createTestSetup = () => {
  const fileFilteringMock = createFileFilteringMock();
  const reviewUtilsMock = createReviewUtilsMock();

  return {
    fileFiltering: fileFilteringMock,
    reviewUtils: reviewUtilsMock,
    cleanup: () => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    },
  };
};

/**
 * Extended mock setup with fs mocks
 */
export const createExtendedTestSetup = () => {
  const baseSetup = createTestSetup();
  const fsMock = createFsMock();

  return {
    ...baseSetup,
    fs: fsMock,
  };
};

/**
 * Common test scenarios for file operations
 */
export const createFileTestScenarios = () => [
  { files: [], desc: 'empty file array' },
  { files: ['test.ts'], desc: 'single TypeScript file' },
  { files: ['test.js'], desc: 'single JavaScript file' },
  { files: ['test.tsx'], desc: 'single React TypeScript file' },
  { files: ['test.test.ts'], desc: 'test file only' },
  { files: ['test.spec.ts'], desc: 'spec file only' },
  { files: ['utils.ts'], desc: 'regular source file' },
  { files: ['test.test.ts', 'utils.ts'], desc: 'mixed files' },
  { files: ['nonexistent.ts'], desc: 'non-existent file' },
];

/**
 * Common test scenarios for error handling
 */
export const createErrorTestScenarios = () => [
  { project: '/tmp', files: [] },
  { project: '/tmp', files: ['test.ts'] },
  { project: '/nonexistent', files: ['file.ts'] },
  { project: '/definitely-nonexistent-path-12345', files: ['test.ts'] },
  { project: '/tmp', files: ['multiple.ts', 'files.ts'] },
];

/**
 * Mock builders using spread syntax for extensibility
 */
interface ReviewOverrides {
  result?: Record<string, unknown>;
  file?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

const createMockReviewResult = (overrides?: Record<string, unknown>) => ({
  severity: 'low' as const,
  issues: [],
  suggestions: ['Minor style improvement'],
  summary: 'Clean code',
  hasBlockingIssues: false,
  confidence: 0.9,
  ...(overrides || {}),
});

const createMockSummary = (overrides?: Record<string, unknown>) => ({
  totalFiles: 1,
  highSeverity: 0,
  mediumSeverity: 0,
  totalIssues: 0,
  ...(overrides || {}),
});

export const createStructuredReviewMock = (overrides: ReviewOverrides = {}) => ({
  files: [
    {
      file: 'test.ts',
      result: createMockReviewResult(overrides.result),
      ...(overrides.file || {}),
    },
  ],
  summary: createMockSummary(overrides.summary),
  ...overrides,
});

export const createHighSeverityReviewMock = () =>
  createStructuredReviewMock({
    result: {
      severity: 'high' as const,
      issues: ['Critical security vulnerability'],
      hasBlockingIssues: true,
      confidence: 0.95,
    },
    summary: {
      highSeverity: 1,
      totalIssues: 1,
    },
  });
