/**
 * Core OpenAI review functionality
 */
import OpenAI from "openai";
import * as path from "path";
import type { ReviewResult } from "./llm-reviewer-types";

/**
 * Core LLM reviewer functionality
 */
export class LLMReviewerCore {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({ apiKey });
    this.model = process.env.LLM_REVIEWER_MODEL || "gpt-4o-mini";
  }

  /**
   * Review a single file's code
   */
  async reviewCode(filePath: string, content: string): Promise<ReviewResult> {
    const ext = path.extname(filePath).slice(1);
    const prompt = this.createReviewPrompt(filePath, content, ext);

    try {
      // Try structured output first
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: {
          type: "json_schema",
          json_schema: this.getReviewSchema(),
        },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return this.validateAndNormalizeResult(result);
    } catch (error) {
      console.error(`Review failed for ${filePath}:`, error);
      return this.createErrorResult();
    }
  }

  private createReviewPrompt(
    filePath: string,
    content: string,
    ext: string,
  ): string {
    return `You are a senior code reviewer. Review this ${ext} file for quality, bugs, security, performance, and maintainability.

File: ${filePath}
Content:
\`\`\`${ext}
${content}
\`\`\`

Analyze the code and provide a comprehensive review. Focus on:
- Security vulnerabilities
- Critical bugs or logic errors
- Performance issues
- Maintainability problems
- Code quality and best practices

Use "high" severity only for security issues, critical bugs, or major problems that would break functionality.
Use "medium" severity for code quality issues, maintainability concerns, or performance problems.
Use "low" severity for minor style issues or suggestions.`;
  }

  private getReviewSchema() {
    return {
      name: "review_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          issues: {
            type: "array",
            items: { type: "string" },
          },
          suggestions: {
            type: "array",
            items: { type: "string" },
          },
          summary: { type: "string" },
          hasBlockingIssues: { type: "boolean" },
          confidence: { type: "number" },
        },
        required: [
          "severity",
          "issues",
          "suggestions",
          "summary",
          "hasBlockingIssues",
          "confidence",
        ],
        additionalProperties: false,
      },
    };
  }

  private validateAndNormalizeResult(result: unknown): ReviewResult {
    const r = result as Record<string, unknown>;
    return {
      severity:
        typeof r.severity === "string" &&
        ["low", "medium", "high"].includes(r.severity)
          ? (r.severity as "low" | "medium" | "high")
          : "low",
      issues: Array.isArray(r.issues) ? r.issues : [],
      suggestions: Array.isArray(r.suggestions) ? r.suggestions : [],
      summary:
        typeof r.summary === "string" ? r.summary : "No summary provided",
      hasBlockingIssues: Boolean(r.hasBlockingIssues),
      confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.5)),
    };
  }

  private createErrorResult(): ReviewResult {
    return {
      severity: "medium",
      issues: ["Review failed due to API error"],
      suggestions: ["Manual review recommended"],
      summary: "Automated review could not be completed",
      hasBlockingIssues: false,
      confidence: 0.1,
    };
  }
}
