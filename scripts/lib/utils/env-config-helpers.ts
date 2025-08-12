/**
 * Environment configuration helper utilities
 */
import * as path from "path";
import * as fs from "fs";

export type EnvLoadResult = {
  success: boolean;
  envPath?: string;
  error?: string;
  variablesLoaded?: number;
  mergedFrom?: string[];
};

/**
 * Check if file exists asynchronously
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process and validate variables from parsed result
 */
export function processVariables(
  parsed: Record<string, string>,
  mergedVariables: Record<string, string>,
  envPath: string,
): number {
  let count = 0;

  Object.entries(parsed).forEach(([key, value]) => {
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      console.warn(
        `Warning: Invalid environment variable name '${key}' in ${envPath}`,
      );
      return;
    }

    const sanitizedValue =
      typeof value === "string"
        ? value
            .split("")
            .filter((char) => {
              const code = char.charCodeAt(0);
              return code > 31 && code !== 127;
            })
            .join("")
        : String(value);

    mergedVariables[key] = sanitizedValue;
    count++;
  });

  return count;
}

/**
 * Apply variables to process.env
 */
export function applyVariablesToEnv(
  mergedVariables: Record<string, string>,
): void {
  Object.entries(mergedVariables).forEach(([key, value]) => {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

/**
 * Log success message
 */
export function logSuccess(totalVariablesLoaded: number): void {
  if (process.env.NODE_ENV !== "test" && totalVariablesLoaded > 0) {
    console.log(`✅ Loaded ${totalVariablesLoaded} environment variables`);
  }
}

/**
 * Log no file found message
 */
export function logNoFileFound(projectRoot: string, envPaths: string[]): void {
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `ℹ️ No .env file found in ${projectRoot} (checked: ${envPaths.map((p) => path.basename(p)).join(", ")})`,
    );
  }
}

/**
 * Handle loading errors
 */
export function handleLoadError(error: unknown): EnvLoadResult {
  const errorMsg = error instanceof Error ? error.message : String(error);

  if (process.env.NODE_ENV !== "test") {
    console.warn("Warning: Failed to load environment config:", errorMsg);
  }

  return { success: false, error: errorMsg };
}
