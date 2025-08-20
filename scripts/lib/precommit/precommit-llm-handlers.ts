/**
 * LLM review precommit handlers
 */
import { generateLlmReviewComments } from '../llm/llm-review-generator';
import { checkLlmReview } from '../llm/llm-check';
import { REVIEW_FILE_NAME } from '../utils/constants';
import { isTransientError, ReviewResult } from './precommit-llm-helpers';

/**
 * Handle review generation with error handling
 */
export async function handleReviewGeneration(projectRoot: string): Promise<void> {
  try {
    await generateLlmReviewComments(projectRoot);
  } catch (genError) {
    const errorMsg = genError instanceof Error ? genError.message : String(genError);

    if (genError instanceof Error && isTransientError(genError)) {
      console.warn(`⚠️ Transient error generating LLM review (allowing commit): ${errorMsg}`);
      return;
    }

    throw new Error(`Failed to generate LLM review comments: ${errorMsg}`);
  }
}

/**
 * Handle review check with validation
 */
export async function handleReviewCheck(projectRoot: string): Promise<ReviewResult> {
  try {
    const llmResult = await checkLlmReview(projectRoot, REVIEW_FILE_NAME);

    if (!llmResult || typeof llmResult !== 'object') {
      throw new Error('Invalid LLM review result: expected object');
    }

    return llmResult as ReviewResult;
  } catch (checkError) {
    const errorMsg = checkError instanceof Error ? checkError.message : String(checkError);
    throw new Error(`Failed to check LLM review results: ${errorMsg}`);
  }
}
