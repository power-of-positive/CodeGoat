#!/usr/bin/env ts-node

/* eslint-disable max-lines */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Types
interface ReviewItem {
  line: number | null;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'performance' | 'quality' | 'bug' | 'style' | 'best-practice' | 'system';
  message: string;
  suggestion?: string;
}

interface ReviewResult {
  reviews: ReviewItem[];
  summary: string;
}

interface FileReviewResult extends ReviewResult {
  file: string;
}

interface FormattedResults {
  summary: {
    totalFiles: number;
    totalIssues: number;
    bySeverity: Record<string, number>;
  };
  files: FileReviewResult[];
  allReviews: Array<ReviewItem & { file: string }>;
  blocked: boolean;
}

interface Config {
  openaiApiKey: string | undefined;
  apiEndpoint: string;
  model: string;
  maxSeverityToBlock: string;
  enabled: boolean;
  outputFile: string;
}

interface APIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// Configuration factory function for testability
export function getConfig(): Config {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
    apiEndpoint: process.env.AI_REVIEWER_ENDPOINT || 'https://openrouter.ai/api/v1',
    model: process.env.AI_REVIEWER_MODEL || 'openrouter/anthropic/claude-3.5-sonnet',
    maxSeverityToBlock: process.env.AI_REVIEWER_MAX_SEVERITY || 'high', // high, medium, low
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

/* eslint-disable max-lines-per-function */
export async function reviewCode(filePath: string, content: string): Promise<ReviewResult> {
  const config = getConfig();

  if (!config.openaiApiKey) {
    console.warn('No API key configured for AI code reviewer');
    return { reviews: [], summary: 'No API key configured' };
  }

  const prompt = `You are an expert code reviewer. Review this ${path.extname(filePath)} file and provide feedback in JSON format.

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

  try {
    const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
        'HTTP-Referer': 'https://github.com/codegoat',
        'X-Title': 'CodeGoat AI Code Reviewer',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as APIResponse;
    const reviewText = data.choices?.[0]?.message?.content;

    if (!reviewText) {
      throw new Error('No response from AI reviewer');
    }

    // Extract JSON from response (sometimes AI wraps it in markdown)
    const jsonMatch =
      reviewText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || reviewText.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : reviewText;

    const reviewData = JSON.parse(jsonStr) as ReviewResult;

    // Validate structure
    if (!reviewData.reviews || !Array.isArray(reviewData.reviews)) {
      throw new Error('Invalid review format: missing reviews array');
    }

    return reviewData;
  } catch (error) {
    console.warn(`AI review failed for ${filePath}:`, (error as Error).message);
    return {
      reviews: [
        {
          line: null,
          severity: 'info',
          category: 'system',
          message: `AI review failed: ${(error as Error).message}`,
        },
      ],
      summary: 'Review failed due to technical issue',
    };
  }
}

export function shouldBlockCommit(allReviews: ReviewItem[], maxSeverity?: string): boolean {
  const config = getConfig();
  const blockingSeverity = SEVERITY_LEVELS[maxSeverity || config.maxSeverityToBlock];

  return allReviews.some(review => SEVERITY_LEVELS[review.severity] >= blockingSeverity);
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

/* eslint-disable max-lines-per-function */
export function outputResults(results: FormattedResults): void {
  const config = getConfig();

  // Write detailed results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  // Console output
  console.log('\n🤖 AI Code Review Results');
  console.log('='.repeat(40));
  console.log(`Files reviewed: ${results.summary.totalFiles}`);
  console.log(`Total issues: ${results.summary.totalIssues}`);

  if (results.summary.totalIssues > 0) {
    console.log('\nIssues by severity:');
    Object.entries(results.summary.bySeverity).forEach(([severity, count]) => {
      const emojiMap: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
        info: '⚪',
      };
      const emoji = emojiMap[severity] || '⚪';
      console.log(`  ${emoji} ${severity}: ${count}`);
    });

    // Show high severity issues
    const highSeverityIssues = results.allReviews.filter(
      review => SEVERITY_LEVELS[review.severity] >= SEVERITY_LEVELS.medium
    );

    if (highSeverityIssues.length > 0) {
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
  }

  console.log(`\n📊 Detailed results saved to: ${config.outputFile}`);

  if (results.blocked) {
    console.log('\n❌ Commit blocked due to high severity issues!');
    console.log(`   Configure AI_REVIEWER_MAX_SEVERITY to change blocking threshold.`);
    console.log(`   Current threshold: ${config.maxSeverityToBlock}`);
  } else {
    console.log('\n✅ No blocking issues found. Commit can proceed.');
  }
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

// Only run main if this file is executed directly (not imported)
/* eslint-disable no-undef */
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => {
    console.error('AI code review failed:', error);
    process.exit(1);
  });
}
/* eslint-enable no-undef */
