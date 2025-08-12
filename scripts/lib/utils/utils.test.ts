/**
 * Tests for utils.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { findProjectRoot, PrecommitResult } from "./utils";

// Mock external dependencies
vi.mock("fs");
vi.mock("path");

describe("utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findProjectRoot", () => {
    it("should find project root with package.json", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(path.join).mockReturnValue("/mock/package.json");
      vi.mocked(path.parse).mockReturnValue({
        root: "/",
        dir: "/mock",
        base: "current",
        ext: "",
        name: "current",
      });

      const result = findProjectRoot();

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should throw error when package.json not found", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(path.parse).mockReturnValue({
        root: "/",
        dir: "/",
        base: "root",
        ext: "",
        name: "root",
      });
      vi.mocked(path.dirname).mockReturnValue("/");

      expect(() => findProjectRoot()).toThrow(
        "Could not find project root with package.json",
      );
    });
  });

  describe("PrecommitResult interface", () => {
    it("should have correct structure", () => {
      const result: PrecommitResult = {
        decision: "approve",
        feedback: "All good",
      };

      expect(result).toHaveProperty("decision");
      expect(["approve", "block"]).toContain(result.decision);
    });
  });
});
