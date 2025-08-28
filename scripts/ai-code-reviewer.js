#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
  apiEndpoint: process.env.AI_REVIEWER_ENDPOINT || 'https://openrouter.ai/api/v1',
  model: process.env.AI_REVIEWER_MODEL || 'openrouter/anthropic/claude-3.5-sonnet',
  maxSeverityToBlock: process.env.AI_REVIEWER_MAX_SEVERITY || 'high', // high, medium, low
  enabled: process.env.AI_REVIEWER_ENABLED !== 'false',
  outputFile: path.join(process.cwd(), 'ai-review-results.json')
};

// Severity levels (higher number = more severe)
const SEVERITY_LEVELS = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5
};

async function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=AM', { 
      encoding: 'utf8', 
      cwd: process.cwd() 
    });
    return output.trim().split('\n').filter(file => 
      file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')
    );
  } catch (error) {
    console.error('No staged files or git error:', error.message);
    return [];
  }
}

async function getFileContent(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  } catch (error) {
    console.warn(`Could not read file ${filePath}:`, error.message);
    return null;
  }
}

function createReviewPrompt(filePath, content) {
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

async function callAIReviewAPI(prompt) {
  const response = await fetch(`${CONFIG.apiEndpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.openaiApiKey}`,
      'HTTP-Referer': 'https://github.com/codegoat',
      'X-Title': 'CodeGoat AI Code Reviewer'
    },
    body: JSON.stringify({
      model: CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parseReviewResponse(reviewText) {
  if (!reviewText) {
    throw new Error('No response from AI reviewer');
  }

  const jsonMatch = reviewText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || reviewText.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : reviewText;
  
  const reviewData = JSON.parse(jsonStr);
  
  if (!reviewData.reviews || !Array.isArray(reviewData.reviews)) {
    throw new Error('Invalid review format: missing reviews array');
  }

  return reviewData;
}

function createErrorReview(filePath, error) {
  return { 
    reviews: [{
      line: null,
      severity: 'info',
      category: 'system',
      message: `AI review failed: ${error.message}`
    }],
    summary: 'Review failed due to technical issue'
  };
}

async function reviewCode(filePath, content) {
  if (!CONFIG.openaiApiKey) {
    console.warn('No API key configured for AI code reviewer');
    return { reviews: [], blocked: false };
  }

  try {
    const prompt = createReviewPrompt(filePath, content);
    const data = await callAIReviewAPI(prompt);
    const reviewText = data.choices?.[0]?.message?.content;
    return parseReviewResponse(reviewText);
  } catch (error) {
    console.warn(`AI review failed for ${filePath}:`, error.message);
    return createErrorReview(filePath, error);
  }
}

function shouldBlockCommit(allReviews) {
  const blockingSeverity = SEVERITY_LEVELS[CONFIG.maxSeverityToBlock];
  
  return allReviews.some(review => 
    SEVERITY_LEVELS[review.severity] >= blockingSeverity
  );
}

function formatResults(results) {
  const allReviews = results.flatMap(result => 
    result.reviews.map(review => ({
      ...review,
      file: result.file
    }))
  );

  // Group by severity
  const groupedBySeverity = allReviews.reduce((acc, review) => {
    if (!acc[review.severity]) acc[review.severity] = [];
    acc[review.severity].push(review);
    return acc;
  }, {});

  return {
    summary: {
      totalFiles: results.length,
      totalIssues: allReviews.length,
      bySeverity: Object.keys(groupedBySeverity).reduce((acc, severity) => {
        acc[severity] = groupedBySeverity[severity].length;
        return acc;
      }, {})
    },
    files: results,
    allReviews,
    blocked: shouldBlockCommit(allReviews)
  };
}

function outputResults(results) {
  // Write detailed results to file
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
  
  // Console output
  console.error('\n🤖 AI Code Review Results');
  console.error('=' .repeat(40));
  console.error(`Files reviewed: ${results.summary.totalFiles}`);
  console.error(`Total issues: ${results.summary.totalIssues}`);
  
  if (results.summary.totalIssues > 0) {
    console.error('\nIssues by severity:');
    Object.entries(results.summary.bySeverity).forEach(([severity, count]) => {
      const emoji = {
        critical: '🔴',
        high: '🟠', 
        medium: '🟡',
        low: '🔵',
        info: '⚪'
      }[severity] || '⚪';
      console.error(`  ${emoji} ${severity}: ${count}`);
    });

    // Show high severity issues
    const highSeverityIssues = results.allReviews.filter(review => 
      SEVERITY_LEVELS[review.severity] >= SEVERITY_LEVELS.medium
    );
    
    if (highSeverityIssues.length > 0) {
      console.error('\n📋 Notable Issues:');
      highSeverityIssues.forEach(review => {
        const location = review.line ? `:${review.line}` : '';
        console.error(`\n  ${review.file}${location}`);
        console.error(`  ${review.severity.toUpperCase()}: ${review.message}`);
        if (review.suggestion) {
          console.error(`  💡 ${review.suggestion}`);
        }
      });
    }
  }

  console.error(`\n📊 Detailed results saved to: ${CONFIG.outputFile}`);
  
  if (results.blocked) {
    console.error('\n❌ Commit blocked due to high severity issues!');
    console.error(`   Configure AI_REVIEWER_MAX_SEVERITY to change blocking threshold.`);
    console.error(`   Current threshold: ${CONFIG.maxSeverityToBlock}`);
  } else {
    console.error('\n✅ No blocking issues found. Commit can proceed.');
  }
}

async function main() {
  if (!CONFIG.enabled) {
    console.error('AI code reviewer disabled (AI_REVIEWER_ENABLED=false)');
    process.exit(0);
  }

  console.error('🤖 Running AI code review...');
  
  const stagedFiles = await getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.error('No relevant files to review.');
    process.exit(0);
  }

  console.error(`Reviewing ${stagedFiles.length} files...`);

  const results = [];
  
  for (const filePath of stagedFiles) {
    const content = await getFileContent(filePath);
    if (content) {
      console.error(`  Reviewing ${filePath}...`);
      const review = await reviewCode(filePath, content);
      results.push({
        file: filePath,
        ...review
      });
    }
  }

  const formattedResults = formatResults(results);
  outputResults(formattedResults);

  // Exit with error code if blocking issues found
  process.exit(formattedResults.blocked ? 1 : 0);
}

main().catch(error => {
  console.error('AI code review failed:', error);
  process.exit(1);
});