/**
 * Tests for severity-analyzer blocking decision logic
 * Focused on shouldBlockClaude and processReviewResults functions
 */
import { describe, it, expect } from "vitest";
import { shouldBlockClaude, processReviewResults } from "./severity-analyzer";

describe("severity-analyzer blocking logic", () => {
  describe("shouldBlockClaude", () => {
    it("should correctly identify blocking patterns", () => {
      // Test HIGH severity patterns
      expect(shouldBlockClaude("HIGH: Critical issues")).toBe(true);
      expect(shouldBlockClaude("Some text with HIGH: in middle")).toBe(true);

      // Test MEDIUM severity patterns
      expect(shouldBlockClaude("MEDIUM: Some issues")).toBe(true);
      expect(shouldBlockClaude("Text with MEDIUM: pattern")).toBe(true);

      // Test non-blocking cases
      expect(shouldBlockClaude("LOW: Minor issues")).toBe(false);
      expect(shouldBlockClaude("Just some regular text")).toBe(false);
      expect(shouldBlockClaude("")).toBe(false);
      expect(shouldBlockClaude("   \n\t  ")).toBe(false);
    });

    it("should handle various input types", () => {
      // Test edge cases
      expect(shouldBlockClaude(null as unknown as string)).toBe(false);
      expect(shouldBlockClaude(undefined as unknown as string)).toBe(false);

      // Test case sensitivity
      expect(shouldBlockClaude("high: should not match")).toBe(false);
      expect(shouldBlockClaude("medium: should not match")).toBe(false);
    });
  });

  describe("processReviewResults", () => {
    it("should block HIGH/MEDIUM severity issues", () => {
      // Test HIGH severity blocking
      let result = processReviewResults("HIGH: Critical issue found");
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("medium or high severity issues");

      // Test MEDIUM severity blocking
      result = processReviewResults("MEDIUM: Quality issue detected");
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("medium or high severity issues");
    });

    it("should approve non-blocking cases", () => {
      // Test approval for low-priority issues
      let result = processReviewResults("Minor formatting issues");
      expect(result.decision).toBe("approve");
      expect(result.feedback).toContain("low-priority items");

      // Test approval for empty/no issues
      result = processReviewResults("");
      expect(result.decision).toBe("approve");
      expect(result.feedback).toContain("no issues detected");

      // Test approval for whitespace-only
      result = processReviewResults("   \n\t  ");
      expect(result.decision).toBe("approve");
      expect(result.feedback).toContain("no issues detected");
    });

    it("should return consistent structure for all inputs", () => {
      // Test that all results have the expected structure
      const testCases = [
        "HIGH: Critical",
        "MEDIUM: Quality",
        "LOW: Minor",
        "Some text",
        "",
        "   \n\t  ",
      ];

      testCases.forEach((testCase) => {
        const result = processReviewResults(testCase);

        // All results should have decision property
        expect(result).toHaveProperty("decision");
        expect(["block", "approve"]).toContain(result.decision);

        // Block results should have reason, approve results should have feedback
        if (result.decision === "block") {
          expect(result).toHaveProperty("reason");
          expect(typeof result.reason).toBe("string");
        } else {
          expect(result).toHaveProperty("feedback");
          expect(typeof result.feedback).toBe("string");
        }
      });
    });
  });
});
