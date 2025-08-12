/**
 * UI component analysis tests for playwright-coverage.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import { isUiComponentFile } from "./playwright-coverage";

vi.mock("fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));

describe("playwright-coverage UI analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("export default Component;");
  });

  describe("isUiComponentFile - detailed component analysis", () => {
    it("should identify UI components by content analysis", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        "export function Component() { return <div>test</div>; }",
      );

      expect(isUiComponentFile("frontend/src/components/Component.tsx")).toBe(
        true,
      );
    });

    it("should detect React components and reject non-UI files", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Test various React component patterns - use frontend paths
      vi.mocked(fs.readFileSync).mockReturnValue(
        "export const Modal = () => <div>Modal</div>;",
      );
      expect(isUiComponentFile("frontend/src/components/Modal.tsx")).toBe(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        "const Input: React.FC = () => <input />;",
      );
      expect(isUiComponentFile("frontend/src/pages/Input.tsx")).toBe(true);

      // Test non-UI files
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(isUiComponentFile("utils.ts")).toBe(false);
      expect(isUiComponentFile("config.json")).toBe(false);

      // Test tsx without JSX - file outside frontend should still check content
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        'console.log("no components");',
      );
      expect(isUiComponentFile("other/utils.tsx")).toBe(false);
    });

    it("should handle file read errors gracefully", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("Read error");
      });

      expect(isUiComponentFile("other/Component.tsx")).toBe(false);
    });
  });
});
