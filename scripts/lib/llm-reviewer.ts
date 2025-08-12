/**
 * LLM code reviewer - compatibility wrapper
 *
 * This file provides backward compatibility by re-exporting from the main LLM module.
 * All new code should import from './llm/llm-reviewer' directly.
 */

// Re-export everything from the main LLM module
export { LLMReviewer as default } from "./llm/llm-reviewer";
export { LLMReviewer } from "./llm/llm-reviewer";

// Re-export types for backward compatibility
export type {
  StructuredReviewData,
  LLMReviewOutput,
} from "./llm/llm-reviewer-types";
