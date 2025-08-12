/**
 * Shared utilities for code review processing
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as process from "process";

export interface ReviewResult {
  decision: "block" | "approve";
  reason?: string;
  feedback?: string;
}

/**
 * Find project root by looking for package.json
 */
export function findProjectRoot(): string {
  let currentDir = process.cwd();
  while (currentDir !== "/") {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return process.cwd();
}

/**
 * Execute shell command with error handling
 */
export function execCommand(command: string, cwd?: string): string {
  return execSync(command, {
    cwd: cwd || process.cwd(),
    encoding: "utf-8",
  });
}
