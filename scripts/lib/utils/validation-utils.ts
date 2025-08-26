/**
 * Main validation utilities dispatcher
 */

import { validatePath } from './path-validation';
import { validateCommand } from './command-validation';

// Constants
const MIN_PORT_NUMBER = 1;
const MAX_PORT_NUMBER = 65535;

/**
 * General input validation dispatcher
 */
export function validateInput(value: string, type: 'path' | 'command'): void {
  switch (type) {
    case 'path':
      validatePath(value);
      break;
    case 'command':
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
  if (!Number.isInteger(port) || port < MIN_PORT_NUMBER || port > MAX_PORT_NUMBER) {
    throw new Error(`Invalid port: ${port}. Must be integer between ${MIN_PORT_NUMBER}-${MAX_PORT_NUMBER}`);
  }
}

// Re-export from modules for backward compatibility
export { validatePath, validateDirectoryExists } from './path-validation';
export { validateCommand } from './command-validation';
