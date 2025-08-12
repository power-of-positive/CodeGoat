/**
 * Shared types and interfaces for script tooling
 */

/**
 * Result of code review analysis
 */
export interface ReviewResult {
  severity: "low" | "medium" | "high";
  issues: string[];
  suggestions: string[];
  summary: string;
  hasBlockingIssues: boolean;
  confidence: number;
}

/**
 * File with review results
 */
export interface ReviewedFile {
  file: string;
  result: ReviewResult;
}

/**
 * Summary of review statistics
 */
export interface ReviewSummary {
  totalFiles: number;
  highSeverity: number;
  mediumSeverity: number;
  totalIssues: number;
}

/**
 * Complete structured review data from LLM
 */
export interface StructuredReviewData {
  files: ReviewedFile[];
  summary: ReviewSummary;
}

/**
 * Error object with optional command output properties
 */
export interface CommandError {
  stdout?: string;
  stderr?: string;
  message?: string;
  code?: number;
}

/**
 * Result of running a command or check
 */
export interface CheckResult {
  success: boolean;
  output: string;
  failed?: boolean;
}

/**
 * Project metrics for analysis
 */
export interface ProjectMetrics {
  linesOfCode: number;
  testFiles: number;
  totalFiles: number;
}

/**
 * JSON-based review comments format - map from stage name to feedback
 */
export interface ReviewComments {
  [stageName: string]: string | StructuredReviewData;
}

/**
 * Typed review comments with known stages
 */
export interface TypedReviewComments {
  frontend_linting?: string;
  frontend_tests?: string;
  playwright_tests?: string;
  rust_formatting?: string;
  rust_linting?: string;
  api_e2e_tests?: string;
  security_checks?: string;
  code_analysis?: string;
  llm_review?: StructuredReviewData;
}
