/**
 * Environment configuration processing utilities
 */
import { config } from "dotenv";
import {
  EnvLoadResult,
  fileExists,
  processVariables,
  applyVariablesToEnv,
  logSuccess,
  logNoFileFound,
} from "./env-config-helpers";

/**
 * Process a single .env file
 */
export async function processEnvFile(
  envPath: string,
  mergedVariables: Record<string, string>,
): Promise<{ success: boolean; variablesLoaded?: number }> {
  try {
    const result = config({ path: envPath, processEnv: {} });

    if (result.error) {
      console.warn(
        `Warning: Failed to parse .env file at ${envPath}:`,
        result.error.message,
      );
      return { success: false };
    }

    if (result.parsed) {
      const variablesFromFile = processVariables(
        result.parsed,
        mergedVariables,
        envPath,
      );
      return { success: true, variablesLoaded: variablesFromFile };
    }

    return { success: false };
  } catch (error) {
    console.warn(
      `Warning: Error reading .env file at ${envPath}:`,
      error instanceof Error ? error.message : error,
    );
    return { success: false };
  }
}

/**
 * Load from multiple .env files with merging
 */
export async function loadFromMultipleFiles(
  envPaths: string[],
  projectRoot: string,
): Promise<EnvLoadResult> {
  let totalVariablesLoaded = 0;
  const loadedFromPaths: string[] = [];
  const mergedVariables: Record<string, string> = {};

  for (const envPath of envPaths) {
    if (await fileExists(envPath)) {
      const result = await processEnvFile(envPath, mergedVariables);
      if (result.success) {
        totalVariablesLoaded += result.variablesLoaded || 0;
        loadedFromPaths.push(envPath);
      }
    }
  }

  applyVariablesToEnv(mergedVariables);

  if (loadedFromPaths.length > 0) {
    logSuccess(totalVariablesLoaded);
    return {
      success: true,
      envPath: loadedFromPaths[0],
      variablesLoaded: totalVariablesLoaded,
      mergedFrom: loadedFromPaths,
    };
  }

  logNoFileFound(projectRoot, envPaths);
  return { success: false, error: "No .env file found in expected locations" };
}
