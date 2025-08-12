/**
 * Severity analysis parsing utilities
 */

import * as fs from "fs";
import * as path from "path";
import { validatePath } from "../utils/validation-utils";
import {
  validateReviewData,
  analyzeStructuredReview,
} from "./severity-analysis-core";

/**
 * Configuration for structured review file
 */
export const STRUCTURED_REVIEW_FILENAME = "code-review-structured.json";

/**
 * Error result for analysis failures
 */
export interface AnalysisError {
  success: false;
  error: string;
  details?: string;
}

/**
 * Success result for analysis
 */
export interface AnalysisSuccess {
  success: true;
  data: string;
}

export type AnalysisResult = AnalysisSuccess | AnalysisError;

/**
 * Parse structured review content from JSON with detailed error reporting
 */
export function parseStructuredReviewContent(
  reviewContent: string,
): AnalysisResult {
  try {
    if (!reviewContent?.trim()) {
      return { success: false, error: "Empty review content" };
    }

    const reviewData = JSON.parse(reviewContent);

    if (!validateReviewData(reviewData)) {
      return {
        success: false,
        error: "Invalid review data structure",
        details: "Missing required fields: files (array) or summary (object)",
      };
    }

    const analysis = analyzeStructuredReview(reviewData);
    return { success: true, data: analysis };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: "JSON parsing failed",
      details: errorMessage,
    };
  }
}

/**
 * Read and parse structured review file
 */
export function readStructuredReviewFile(reviewDir: string): AnalysisResult {
  const structuredReviewFile = path.join(reviewDir, STRUCTURED_REVIEW_FILENAME);

  // Ensure structured review file is within expected directory
  if (!structuredReviewFile.startsWith(reviewDir)) {
    console.error("Severity analysis: Invalid structured review file path");
    return { success: false, error: "Invalid file path" };
  }

  if (!fs.existsSync(structuredReviewFile)) {
    console.info(
      `Severity analysis: Structured review file not found: ${STRUCTURED_REVIEW_FILENAME}`,
    );
    return { success: false, error: "File not found" };
  }

  const structuredContent = fs.readFileSync(structuredReviewFile, "utf-8");
  return parseStructuredReviewContent(structuredContent);
}

/**
 * Analyze LLM review file for severity issues with comprehensive error handling
 */
export function analyzeLlmReviewSeverity(reviewFile: string): string {
  try {
    // Enhanced path validation
    if (!reviewFile?.trim()) {
      console.warn("Severity analysis: Empty review file path provided");
      return "";
    }

    validatePath(reviewFile);

    const reviewDir = path.resolve(path.dirname(reviewFile));
    const result = readStructuredReviewFile(reviewDir);

    if (!result.success) {
      const errorResult = result as AnalysisError;
      console.error(`Severity analysis failed: ${errorResult.error}`);
      if (errorResult.details) {
        console.error(`Details: ${errorResult.details}`);
      }
      return "";
    }

    return result.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Severity analysis error: ${errorMessage}`);
    return "";
  }
}
