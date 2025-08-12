/**
 * Environment configuration utilities - modular version
 */
import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { EnvLoadResult, handleLoadError } from "./env-config-helpers";
import { loadFromMultipleFiles } from "./env-config-processor";

/**
 * Load environment variables from project root .env file with comprehensive error handling
 * Supports multiple .env file locations and provides detailed feedback
 */
export async function loadProjectEnv(
  scriptsDepth: number = 2,
): Promise<EnvLoadResult> {
  try {
    const projectRoot = path.resolve(__dirname, "../".repeat(scriptsDepth));
    const envPaths = [
      path.join(projectRoot, ".env"),
      path.join(projectRoot, ".env.local"),
      path.join(projectRoot, ".env.development"),
    ];

    return await loadFromMultipleFiles(envPaths, projectRoot);
  } catch (error) {
    return handleLoadError(error);
  }
}

/**
 * Synchronous version of loadProjectEnv for backward compatibility
 * Note: This version doesn't support merging multiple .env files
 */
export function loadProjectEnvSync(scriptsDepth: number = 2): EnvLoadResult {
  try {
    const projectRoot = path.resolve(__dirname, "../".repeat(scriptsDepth));
    const envPath = path.join(projectRoot, ".env");

    if (fs.existsSync(envPath)) {
      const result = config({ path: envPath });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      const variablesLoaded = result.parsed
        ? Object.keys(result.parsed).length
        : 0;
      return { success: true, envPath, variablesLoaded };
    }

    return { success: false, error: "No .env file found" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate that required environment variables are present with enhanced validation
 */
function validateSingleVar(
  varName: string,
  allowEmpty: boolean,
  validateFormat: Record<string, RegExp>,
  missing: string[],
  invalid: Array<{ name: string; reason: string }>,
): void {
  const value = process.env[varName];
  if (!value || (value.trim() === "" && !allowEmpty)) {
    missing.push(varName);
    return;
  }
  if (
    validateFormat[varName] &&
    value &&
    !validateFormat[varName].test(value)
  ) {
    invalid.push({
      name: varName,
      reason: `Does not match required format: ${validateFormat[varName]}`,
    });
  }
}

/**
 * Validate required environment variables with enhanced validation
 */
export function validateRequiredEnvVars(
  requiredVars: string[],
  options: {
    allowEmpty?: boolean;
    validateFormat?: Record<string, RegExp>;
  } = {},
): {
  valid: boolean;
  missing: string[];
  invalid: Array<{ name: string; reason: string }>;
} {
  const { allowEmpty = false, validateFormat = {} } = options;
  const missing: string[] = [];
  const invalid: Array<{ name: string; reason: string }> = [];

  requiredVars.forEach((varName) => {
    validateSingleVar(varName, allowEmpty, validateFormat, missing, invalid);
  });

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}
