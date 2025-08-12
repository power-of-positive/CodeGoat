/**
 * Code analysis utilities
 */

import { runAnalysis } from "../../code-analysis-staged";

/**
 * Run code analysis checks
 *
 * Returns a simplified interface for integration with precommit checks.
 * This differs from other check functions that return CheckResult because
 * analysis results need to be processed differently than simple pass/fail checks.
 */
export async function runCodeAnalysis(): Promise<{
  blocked: boolean;
  details: string;
}> {
  try {
    const result = await runAnalysis();
    if (result.blocked) {
      return {
        blocked: true,
        details: `Code Analysis Blocking Issues:\n${result.reasons.map((r: string) => `- ${r}`).join("\n")}`,
      };
    }
    return { blocked: false, details: "" };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      blocked: true,
      details: `Code Analysis Failed:\n${errorMessage}`,
    };
  }
}
