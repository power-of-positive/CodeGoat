/**
 * Main validation utilities dispatcher
 */

import { validatePath } from "./path-validation";
import { validateCommand } from "./command-validation";

/**
 * General input validation dispatcher
 */
export function validateInput(value: string, type: "path" | "command"): void {
  switch (type) {
    case "path":
      validatePath(value);
      break;
    case "command":
      validateCommand(value);
      break;
    default:
      throw new Error(`Unknown validation type: ${type}`);
  }
}

/**
 * Validate port number is in valid range
 */
export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}. Must be integer between 1-65535`);
  }
}

// Re-export from modules for backward compatibility
export { validatePath, validateDirectoryExists } from "./path-validation";
export { validateCommand } from "./command-validation";
