/**
 * LLM review functionality for precommit checks - modular version
 */
import { PrecommitResult } from "../utils/utils";
import { REVIEW_FILE_NAME } from "../utils/constants";
import {
  LlmReviewResult,
  validateInputs,
  processReviewResult,
  handleReviewError,
} from "./precommit-llm-helpers";
import {
  handleReviewGeneration,
  handleReviewCheck,
} from "./precommit-llm-handlers";

/**
 * Run LLM review process with comprehensive error handling and validation
 */
export async function runLlmReviewProcess(
  projectRoot: string,
  allOutput: string,
): Promise<PrecommitResult | null> {
  const reviewResult = await runLlmReviewProcessInternal(
    projectRoot,
    allOutput,
  );

  switch (reviewResult.status) {
    case "skipped":
      console.log(`ℹ️ LLM review skipped: ${reviewResult.reason}`);
      return null;
    case "success":
      return null;
    case "blocked":
    case "error":
      return reviewResult.result;
    default:
      throw new Error("Unexpected LLM review result status");
  }
}

/**
 * Internal LLM review process with explicit result types
 */
async function runLlmReviewProcessInternal(
  projectRoot: string,
  allOutput: string,
): Promise<LlmReviewResult> {
  // Check if LLM review is disabled
  if (process.env.SKIP_LLM_REVIEW === "true") {
    console.log(
      "⚡ LLM review disabled via SKIP_LLM_REVIEW environment variable",
    );
    return {
      status: "skipped",
      reason: "LLM review disabled via SKIP_LLM_REVIEW environment variable",
    };
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === "") {
    return {
      status: "skipped",
      reason: "Required API key environment variable is not configured",
    };
  }

  try {
    validateInputs(projectRoot, allOutput);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      error: errorMsg,
      result: {
        decision: "block",
        reason: `LLM review validation failed: ${errorMsg}`,
      },
    };
  }

  try {
    await handleReviewGeneration(projectRoot);
    const llmResult = await handleReviewCheck(projectRoot);
    return processReviewResult(llmResult, allOutput);
  } catch (error) {
    return handleReviewError(error);
  }
}

export { REVIEW_FILE_NAME };
