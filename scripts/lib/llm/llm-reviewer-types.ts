/**
 * Types for LLM code reviewer
 */

export interface ReviewResult {
  severity: 'low' | 'medium' | 'high';
  issues: string[];
  suggestions: string[];
  summary: string;
  hasBlockingIssues: boolean;
  confidence: number;
}

export interface ReviewedFile {
  file: string;
  result: ReviewResult;
}

export interface ReviewSummary {
  totalFiles: number;
  highSeverity: number;
  mediumSeverity: number;
  totalIssues: number;
}

export interface StructuredReviewData {
  files: ReviewedFile[];
  summary: ReviewSummary;
}

export interface LLMReviewOutput {
  structuredData: StructuredReviewData;
  textReport: string;
}
