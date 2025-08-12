/**
 * LLM reviewer file processing utilities
 */
import type { ReviewedFile } from "./llm-reviewer-types";
import type { LLMReviewerCore } from "./llm-reviewer-core";
import { reviewSingleFile } from "./llm-reviewer-helpers";

/**
 * Process files with rate limiting and concurrency control
 */
export async function processFiles(
  core: LLMReviewerCore,
  projectRoot: string,
  changedFiles: string[],
): Promise<ReviewedFile[]> {
  const reviews: ReviewedFile[] = [];
  const maxConcurrency = Math.min(3, changedFiles.length);
  const delayBetweenBatches = 100;

  for (let i = 0; i < changedFiles.length; i += maxConcurrency) {
    const batch = changedFiles.slice(i, i + maxConcurrency);
    const batchResults = await processBatch(core, projectRoot, batch);
    reviews.push(...batchResults.filter((result) => result !== null));

    if (i + maxConcurrency < changedFiles.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }
  return reviews;
}

/**
 * Process a batch of files with staggered timing
 */
export async function processBatch(
  core: LLMReviewerCore,
  projectRoot: string,
  batch: string[],
): Promise<(ReviewedFile | null)[]> {
  const batchPromises = batch.map(async (file, index) => {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, index * 50));
    }
    return reviewSingleFile(core, projectRoot, file);
  });
  return Promise.all(batchPromises);
}
