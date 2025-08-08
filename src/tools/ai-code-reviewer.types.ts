// Types for AI Code Reviewer

export interface ReviewItem {
  line: number | null;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'performance' | 'quality' | 'bug' | 'style' | 'best-practice' | 'system';
  message: string;
  suggestion?: string;
}

export interface ReviewResult {
  reviews: ReviewItem[];
  summary: string;
}

export interface FileReviewResult extends ReviewResult {
  file: string;
}

export interface FormattedResults {
  summary: {
    totalFiles: number;
    totalIssues: number;
    bySeverity: Record<string, number>;
  };
  files: FileReviewResult[];
  allReviews: Array<ReviewItem & { file: string }>;
  blocked: boolean;
}

export interface Config {
  openaiApiKey: string | undefined;
  apiEndpoint: string;
  model: string;
  maxSeverityToBlock: string;
  enabled: boolean;
  outputFile: string;
}

export interface APIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
