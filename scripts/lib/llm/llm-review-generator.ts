/**
 * LLM-powered code review comment generation using OpenAI API
 */

import * as fs from "fs";
import * as path from "path";
import { execCommand } from "../utils/command-utils";
import { getProjectMetrics } from "../utils/project-metrics";
import { LLMReviewer } from "./llm-reviewer";

/**
 * Get git status information for staged files
 */
function getGitInfo(projectRoot: string) {
  const stagedFilesResult = execCommand(
    "git diff --cached --name-only",
    projectRoot,
  );
  const stagedFilesList = stagedFilesResult.success
    ? stagedFilesResult.output
    : "";

  const gitStatusResult = execCommand("git status --porcelain", projectRoot);
  const gitStatus = gitStatusResult.success ? gitStatusResult.output : "";

  return { stagedFilesList, gitStatus };
}

/**
 * Build the header section of the review document
 */
function buildReviewHeader(timestamp: string): string {
  return `# LLM Code Review Comments
Generated: ${timestamp}

## Recent Changes Analysis
`;
}

/**
 * Build the git status section of the review document
 */
function buildGitStatusSection(
  stagedFilesList: string,
  gitStatus: string,
): string {
  let content = "";

  if (stagedFilesList.trim()) {
    content += "### Staged Files Being Reviewed:\n";
    stagedFilesList
      .trim()
      .split("\n")
      .forEach((file) => {
        if (file.trim()) {
          content += `- ${file.trim()}\n`;
        }
      });
    content += "\n";
  }

  if (gitStatus.trim()) {
    content += "### Current Git Status:\n```\n";
    content += gitStatus;
    content += "```\n\n";
  }

  return content;
}

/**
 * Build the project metrics section of the review document
 */
function buildProjectMetricsSection(projectRoot: string): string {
  const metrics = getProjectMetrics(projectRoot);
  return "## Project Metrics\n" + metrics + "\n\n";
}

/**
 * Run the LLM review process and return results
 */
async function runLLMReview(
  projectRoot: string,
): Promise<{ reviewContent: string; structuredReviewData: unknown }> {
  let structuredReviewData = null;
  let reviewContent = "";

  try {
    const llmReviewer = new LLMReviewer();
    const { structuredData, textReport } =
      await llmReviewer.reviewChangedFiles(projectRoot);
    structuredReviewData = structuredData;
    reviewContent += textReport + "\n\n";
  } catch (error) {
    console.error("Failed to run LLM review:", error);
    reviewContent += "## AI-Powered Code Review Results\n\n";
    reviewContent +=
      "❌ **LLM Review Failed** - Check OpenAI API configuration\n";
    reviewContent += `Error: ${error instanceof Error ? error.message : "Unknown error"}\n\n`;
  }

  return { reviewContent, structuredReviewData };
}

/**
 * Build the summary section of the review document
 */
function buildReviewSummary(timestamp: string): string {
  return `## Review Summary

The LLM code review has been completed for all staged TypeScript/JavaScript files using OpenAI API.
Files with critical or medium severity issues will block the commit.

### Key Requirements:
- Files must stay under 150 lines (clean code compliance)
- Functions should be under 150 lines
- No hardcoded secrets or security vulnerabilities
- Proper error handling and TypeScript typing
- Avoid \`any\` types and ensure explicit return types

---
*This review was generated using OpenAI ${process.env.LLM_REVIEWER_MODEL || "gpt-4o-mini"} API*
*Review timestamp: ${timestamp}*`;
}

/**
 * Save review files to disk
 */
function saveReviewFiles(
  reviewFile: string,
  reviewContent: string,
  projectRoot: string,
  structuredReviewData: unknown,
): void {
  fs.writeFileSync(reviewFile, reviewContent);
  console.log(`📝 Code review comments saved to: ${reviewFile}`);

  if (structuredReviewData) {
    const structuredReviewFile = path.join(
      projectRoot,
      "code-review-structured.json",
    );
    fs.writeFileSync(
      structuredReviewFile,
      JSON.stringify(structuredReviewData, null, 2),
    );
    console.log(`🔍 Structured review data saved to: ${structuredReviewFile}`);
  }
}

/**
 * Generate LLM-powered code review comments for staged files
 *
 * @param projectRoot - Root directory of the project
 */
export async function generateLlmReviewComments(
  projectRoot: string,
): Promise<void> {
  const reviewFile = path.join(projectRoot, "code-review-comments.tmp");
  console.log("🤖 Generating LLM code review comments for staged files...");

  const { stagedFilesList, gitStatus } = getGitInfo(projectRoot);
  const timestamp = new Date().toLocaleString();
  let reviewContent = buildReviewHeader(timestamp);

  reviewContent += buildGitStatusSection(stagedFilesList, gitStatus);
  reviewContent += buildProjectMetricsSection(projectRoot);

  const { reviewContent: llmContent, structuredReviewData } =
    await runLLMReview(projectRoot);
  reviewContent += llmContent;

  reviewContent += buildReviewSummary(timestamp);
  saveReviewFiles(reviewFile, reviewContent, projectRoot, structuredReviewData);
}
