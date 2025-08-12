/**
 * Common types used across test files
 */

export interface TestScenario<T = unknown> {
  files: string[];
  desc: string;
  input?: T;
  expected?: unknown;
}

export interface MockResult {
  failed: boolean;
  output: string;
}

export interface TestCase<TInput = unknown, TExpected = unknown> {
  description: string;
  input: TInput;
  expected: TExpected;
}

export interface ErrorTestCase<TInput = unknown> {
  scenario: string;
  input: TInput;
  expectedError?: string;
}
