/**
 * Utility functions for LLM code reviewer
 */
import type { ReviewResult, ReviewedFile, StructuredReviewData } from './llm-reviewer-types';

/**
 * Generate formatted report from review results
 */
export function generateReport(reviews: Array<{ file: string; result: ReviewResult }>): string {
  if (reviews.length === 0) return 'No files could be reviewed';

  let report = `# LLM Code Review Results\n\n`;
  const highIssues = reviews.filter(r => r.result.severity === 'high');
  const mediumIssues = reviews.filter(r => r.result.severity === 'medium');

  const addSection = (title: string, issues: typeof highIssues, includeSum = false) => {
    if (issues.length === 0) return;
    report += `## ${title} (${issues.length})\n\n`;
    for (const { file, result } of issues) {
      report += `### ${file}\n**Issues:** ${result.issues.join(', ')}\n**Suggestions:** ${result.suggestions.join(', ')}\n`;
      if (includeSum) report += `**Summary:** ${result.summary}\n`;
      report += '\n';
    }
  };

  addSection('🚨 HIGH SEVERITY ISSUES', highIssues, true);
  addSection('⚠️ MEDIUM SEVERITY ISSUES', mediumIssues);

  const totalIssues = reviews.reduce((sum, r) => sum + r.result.issues.length, 0);
  report += `## Summary\n- Files reviewed: ${reviews.length}\n- High severity: ${highIssues.length}\n- Medium severity: ${mediumIssues.length}\n- Total issues: ${totalIssues}\n\n`;

  const rec =
    highIssues.length > 0
      ? 'Fix high severity issues before committing.'
      : mediumIssues.length > 0
        ? 'Consider addressing medium severity issues.'
        : 'Code quality looks good!';
  report += `**Recommendation:** ${rec}\n`;
  return report;
}

/**
 * Generate structured data from review results
 */
export function generateStructuredData(reviews: ReviewedFile[]): StructuredReviewData {
  const highSeverity = reviews.filter(r => r.result.severity === 'high').length;
  const mediumSeverity = reviews.filter(r => r.result.severity === 'medium').length;
  const totalIssues = reviews.reduce((sum, r) => sum + r.result.issues.length, 0);

  return {
    files: reviews,
    summary: {
      totalFiles: reviews.length,
      highSeverity,
      mediumSeverity,
      totalIssues,
    },
  };
}

/**
 * Determine if commit should be blocked based on review results
 */
export function shouldBlockCommit(reviews: ReviewedFile[]): boolean {
  return reviews.some(
    review =>
      review.result.hasBlockingIssues ||
      review.result.severity === 'high' ||
      review.result.severity === 'medium'
  );
}
