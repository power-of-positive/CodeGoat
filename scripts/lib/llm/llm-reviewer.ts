/**
 * LLM code reviewer - modular version
 */
import { LLMReviewerCore } from './llm-reviewer-core';
import type { ReviewedFile, LLMReviewOutput } from './llm-reviewer-types';
import { generateReport, generateStructuredData, shouldBlockCommit } from './llm-reviewer-utils';
import { getChangedFiles, createEmptyResult, createErrorResult } from './llm-reviewer-helpers';
import { processFiles } from './llm-reviewer-processor';
import { loadProjectEnvSync } from '../utils/env-config';

// Load environment variables synchronously
loadProjectEnvSync(3);
export type { LLMReviewOutput } from './llm-reviewer-types';

/**
 * Main LLM reviewer class
 */
export class LLMReviewer {
  private core: LLMReviewerCore;

  /**
   * Initialize LLM reviewer with core engine
   */
  constructor() {
    // Ensure environment is loaded before creating core
    loadProjectEnvSync(3);
    this.core = new LLMReviewerCore();
  }

  /**
   * Review a single file with input validation
   */
  async reviewCode(filePath: string, content: string) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid filePath: must be non-empty string');
    }
    if (typeof content !== 'string') {
      throw new Error('Invalid content: must be string');
    }
    return this.core.reviewCode(filePath, content);
  }

  /**
   * Review all changed files in a project
   */
  async reviewChangedFiles(projectRoot: string): Promise<LLMReviewOutput> {
    if (!projectRoot || typeof projectRoot !== 'string') {
      throw new Error('Invalid projectRoot: must be non-empty string');
    }

    try {
      const changedFiles = getChangedFiles(projectRoot);
      if (changedFiles.length === 0) {
        return createEmptyResult();
      }
      const reviews = await processFiles(this.core, projectRoot, changedFiles);
      return {
        structuredData: generateStructuredData(reviews),
        textReport: generateReport(reviews),
      };
    } catch (error) {
      return createErrorResult(error);
    }
  }

  /**
   * Check if commit should be blocked
   */
  shouldBlockCommit(reviews: ReviewedFile[]): boolean {
    return shouldBlockCommit(reviews);
  }
}

export default LLMReviewer;
