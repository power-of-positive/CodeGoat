#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Import types from separate file
import type {
  ReviewItem,
  ReviewResult,
  FileReviewResult,
  FormattedResults,
  Config,
  APIResponse,
} from './ai-code-reviewer.types';

// Configuration factory function for testability
export function getConfig(): Config {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
    apiEndpoint: process.env.AI_REVIEWER_ENDPOINT || 'https://openrouter.ai/api/v1',
    model: process.env.AI_REVIEWER_MODEL || 'openrouter/anthropic/claude-3.5-sonnet',
    maxSeverityToBlock: process.env.AI_REVIEWER_MAX_SEVERITY || 'medium', // Options: critical, high, medium, low, info
    enabled: process.env.AI_REVIEWER_ENABLED !== 'false',
    outputFile: path.join(process.cwd(), 'ai-review-results.json'),
  };
}

// Severity levels (higher number = more severe)
const SEVERITY_LEVELS: Record<string, number> = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

export async function getStagedFiles(): Promise<string[]> {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=AM', {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    return output
      .trim()
      .split('\n')
      .filter(
        file =>
          file.endsWith('.ts') ||
          file.endsWith('.tsx') ||
          file.endsWith('.js') ||
          file.endsWith('.jsx')
      );
  } catch (error) {
    console.log('No staged files or git error:', (error as Error).message);
    return [];
  }
}

export async function getFileContent(filePath: string): Promise<string | null> {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  } catch (error) {
    console.warn(`Could not read file ${filePath}:`, (error as Error).message);
    return null;
  }
}

function buildReviewPrompt(filePath: string, content: string): string {
  return `You are an expert code reviewer. Review this ${path.extname(filePath)} file and provide feedback in JSON format.

File: ${filePath}
Content:
\`\`\`
${content}
\`\`\`

Please analyze the code for:
1. Security vulnerabilities
2. Performance issues
3. Code quality and maintainability
4. Best practices
5. Potential bugs
6. TypeScript/JavaScript specific issues

Return a JSON object with this structure:
{
  "reviews": [
    {
      "line": number or null,
      "severity": "info|low|medium|high|critical",
      "category": "security|performance|quality|bug|style|best-practice",
      "message": "Description of the issue",
      "suggestion": "How to fix it (optional)"
    }
  ],
  "summary": "Overall assessment of the code"
}

Focus on actionable feedback. Only flag real issues, not nitpicks.`;
}

function buildAPIRequest(prompt: string, config: Config): object {
  return {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert code reviewer. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  };
}

function extractJSONFromResponse(reviewText: string): string {
  const jsonMatch =
    reviewText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || reviewText.match(/(\{[\s\S]*\})/);
  return jsonMatch ? jsonMatch[1] : reviewText;
}

function createFailureResponse(filePath: string, error: Error): ReviewResult {
  console.warn(`AI review failed for ${filePath}:`, error.message);
  return {
    reviews: [
      {
        line: null,
        severity: 'info',
        category: 'system',
        message: `AI review failed: ${error.message}`,
      },
    ],
    summary: 'Review failed due to technical issue',
  };
}

async function callReviewAPI(config: Config, prompt: string): Promise<string> {
  const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
      'HTTP-Referer': 'https://github.com/codegoat',
      'X-Title': 'CodeGoat AI Code Reviewer',
    },
    body: JSON.stringify(buildAPIRequest(prompt, config)),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as APIResponse;
  const reviewText = data.choices?.[0]?.message?.content;

  if (!reviewText) {
    throw new Error('No response from AI reviewer');
  }

  return reviewText;
}

export async function reviewCode(filePath: string, content: string): Promise<ReviewResult> {
  const config = getConfig();

  if (!config.openaiApiKey) {
    console.warn('No API key configured for AI code reviewer');
    return { reviews: [], summary: 'No API key configured' };
  }

  try {
    const prompt = buildReviewPrompt(filePath, content);
    const reviewText = await callReviewAPI(config, prompt);
    const jsonStr = extractJSONFromResponse(reviewText);
    const reviewData = JSON.parse(jsonStr) as ReviewResult;

    // Validate structure
    if (!reviewData.reviews || !Array.isArray(reviewData.reviews)) {
      throw new Error('Invalid review format: missing reviews array');
    }

    return reviewData;
  } catch (error) {
    return createFailureResponse(filePath, error as Error);
  }
}

export function shouldBlockCommit(allReviews: ReviewItem[], maxSeverity?: string): boolean {
  const config = getConfig();
  const blockingSeverity = SEVERITY_LEVELS[maxSeverity || config.maxSeverityToBlock];

  // Check if any review meets or exceeds the blocking threshold
  const blockingReviews = allReviews.filter(
    review => SEVERITY_LEVELS[review.severity] >= blockingSeverity
  );

  if (blockingReviews.length > 0) {
    console.log(
      `\n🚫 Found ${blockingReviews.length} blocking issue(s) at ${config.maxSeverityToBlock} severity or higher`
    );
  }

  return blockingReviews.length > 0;
}

export function formatResults(results: FileReviewResult[]): FormattedResults {
  const allReviews = results.flatMap(result =>
    result.reviews.map(review => ({
      ...review,
      file: result.file,
    }))
  );

  // Group by severity
  const groupedBySeverity = allReviews.reduce(
    (acc, review) => {
      if (!acc[review.severity]) acc[review.severity] = [];
      acc[review.severity].push(review);
      return acc;
    },
    {} as Record<string, Array<ReviewItem & { file: string }>>
  );

  return {
    summary: {
      totalFiles: results.length,
      totalIssues: allReviews.length,
      bySeverity: Object.keys(groupedBySeverity).reduce(
        (acc, severity) => {
          acc[severity] = groupedBySeverity[severity].length;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
    files: results,
    allReviews,
    blocked: shouldBlockCommit(allReviews),
  };
}

function getSeverityEmoji(severity: string): string {
  const emojiMap: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    info: '⚪',
  };
  return emojiMap[severity] || '⚪';
}

function outputBasicSummary(results: FormattedResults): void {
  console.log('\n🤖 AI Code Review Results');
  console.log('='.repeat(40));
  console.log(`Files reviewed: ${results.summary.totalFiles}`);
  console.log(`Total issues: ${results.summary.totalIssues}`);
}

function outputSeverityBreakdown(results: FormattedResults): void {
  if (results.summary.totalIssues === 0) return;

  console.log('\nIssues by severity:');
  Object.entries(results.summary.bySeverity).forEach(([severity, count]) => {
    const emoji = getSeverityEmoji(severity);
    console.log(`  ${emoji} ${severity}: ${count}`);
  });
}

function outputNotableIssues(results: FormattedResults): void {
  const highSeverityIssues = results.allReviews.filter(
    review => SEVERITY_LEVELS[review.severity] >= SEVERITY_LEVELS.medium
  );

  if (highSeverityIssues.length === 0) return;

  console.log('\n📋 Notable Issues:');
  highSeverityIssues.forEach(review => {
    const location = review.line ? `:${review.line}` : '';
    console.log(`\n  ${review.file}${location}`);
    console.log(`  ${review.severity.toUpperCase()}: ${review.message}`);
    if (review.suggestion) {
      console.log(`  💡 ${review.suggestion}`);
    }
  });
}

function outputBlockingIssues(results: FormattedResults, config: Config): void {
  if (!results.blocked) {
    console.log('\n✅ No blocking issues found. Commit can proceed.');
    console.log(`   Current blocking threshold: ${config.maxSeverityToBlock}`);
    return;
  }

  const blockingSeverity = SEVERITY_LEVELS[config.maxSeverityToBlock];
  const blockingIssues = results.allReviews.filter(
    review => SEVERITY_LEVELS[review.severity] >= blockingSeverity
  );

  console.log('\n❌ Commit blocked due to severity issues!');
  console.log(
    `   Found ${blockingIssues.length} issue(s) at ${config.maxSeverityToBlock} severity or higher`
  );
  console.log(
    `   Blocking threshold: ${config.maxSeverityToBlock} (configure with AI_REVIEWER_MAX_SEVERITY)`
  );

  const blockingBySeverity = blockingIssues.reduce(
    (acc, issue) => {
      if (!acc[issue.severity]) acc[issue.severity] = 0;
      acc[issue.severity]++;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('\n   Blocking issues by severity:');
  Object.entries(blockingBySeverity)
    .sort((a, b) => SEVERITY_LEVELS[b[0]] - SEVERITY_LEVELS[a[0]])
    .forEach(([severity, count]) => {
      console.log(`     ${getSeverityEmoji(severity)} ${severity}: ${count} issue(s)`);
    });
}

export function outputResults(results: FormattedResults): void {
  const config = getConfig();

  // Write detailed results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  outputBasicSummary(results);
  outputSeverityBreakdown(results);
  outputNotableIssues(results);
  
  console.log(`\n📊 Detailed results saved to: ${config.outputFile}`);
  
  outputBlockingIssues(results, config);
}

export async function main(): Promise<void> {
  const config = getConfig();

  if (!config.enabled) {
    console.log('AI code reviewer disabled (AI_REVIEWER_ENABLED=false)');
    process.exit(0);
  }

  console.log('🤖 Running AI code review...');

  const stagedFiles = await getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('No relevant files to review.');
    process.exit(0);
  }

  console.log(`Reviewing ${stagedFiles.length} files...`);

  const results: FileReviewResult[] = [];

  for (const filePath of stagedFiles) {
    const content = await getFileContent(filePath);
    if (content) {
      console.log(`  Reviewing ${filePath}...`);
      const review = await reviewCode(filePath, content);
      results.push({
        file: filePath,
        ...review,
      });
    }
  }

  const formattedResults = formatResults(results);
  outputResults(formattedResults);

  // Exit with error code if blocking issues found
  process.exit(formattedResults.blocked ? 1 : 0);
}

// Run main function when this file is executed directly (e.g., via ts-node)
// Check if we're running in a standalone context by examining the environment
if (process.argv.length > 1 && process.argv[1].includes('ai-code-reviewer')) {
  main().catch(error => {
    console.error('AI code review failed:', error);
    process.exit(1);
  });
}
