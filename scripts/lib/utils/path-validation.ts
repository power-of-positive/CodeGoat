/**
 * Path validation utilities for security and safety
 */

import * as path from "path";
import * as fs from "fs";

/**
 * Validate path input is non-empty string
 */
function validatePathFormat(value: string): void {
  if (!value || typeof value !== "string") {
    throw new Error("Invalid path: must be non-empty string");
  }
}

/**
 * Check for directory traversal attacks
 */
function validateNoDirectoryTraversal(value: string): void {
  if (value.includes("..")) {
    throw new Error("Invalid path: directory traversal not allowed");
  }
}

/**
 * Check for command injection attempts via dangerous characters
 */
function validateNoCommandInjection(value: string): void {
  const dangerousChars = [
    ";",
    "|",
    "&",
    "$",
    "`",
    "(",
    ")",
    "{",
    "}",
    "<",
    ">",
  ];
  if (dangerousChars.some((char) => value.includes(char))) {
    throw new Error("Invalid path: contains dangerous characters");
  }
}

/**
 * Check for null bytes and unicode escapes
 */
function validateNoControlCharacters(value: string): void {
  if (value.includes("\0") || /\\u[0-9a-fA-F]{4}/.test(value)) {
    throw new Error("Invalid path: contains null bytes or unicode escapes");
  }
}

/**
 * Ensure resolved path stays within project boundaries
 */
function validatePathWithinProject(value: string): void {
  // Empty or just current directory should fail
  if (!value || value === ".") {
    throw new Error("Invalid path: must be within project directory");
  }
  
  const resolved = path.resolve(value);
  const currentDir = process.cwd();
  
  // Find project root by looking for package.json
  let projectRoot = currentDir;
  while (projectRoot !== path.dirname(projectRoot)) {
    if (fs.existsSync(path.join(projectRoot, "package.json"))) {
      break;
    }
    projectRoot = path.dirname(projectRoot);
  }
  
  // Allow paths within project root or current working directory
  const validRoots = [projectRoot, currentDir];
  const isValid = validRoots.some(root => resolved.startsWith(root));
  
  if (!isValid) {
    throw new Error("Invalid path: must be within project directory");
  }
}

/**
 * Enhanced path validation with comprehensive security checks
 */
export function validatePath(value: string): void {
  validatePathFormat(value);
  validateNoDirectoryTraversal(value);
  validateNoCommandInjection(value);
  validateNoControlCharacters(value);
  validatePathWithinProject(value);
}

/**
 * Validate directory exists before running commands
 */
export function validateDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }
  try {
    if (!fs.statSync(dirPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
  } catch {
    throw new Error(`Unable to access directory: ${dirPath}`);
  }
}