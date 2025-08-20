/**
 * Script-specific check runners with improved logging
 */
import { StagedFiles } from '../files/staged-files';
import { runScriptChecks as runScriptChecksImpl } from '../scripts/script-checks';
import { validateStagedFiles } from '../checks/check-utils';

/**
 * Run script-specific checks (lint, tests, coverage)
 */
export async function runScriptChecks(
  projectRoot: string,
  stagedFiles: StagedFiles
): Promise<{ failed: boolean; output: string }> {
  try {
    validateStagedFiles(stagedFiles);
    if (stagedFiles.scriptFiles.length === 0) {
      console.log('ℹ️ No script files to check');
      return { failed: false, output: '' };
    }
    console.log('🔍 Starting script checks...');
    const result = await runScriptChecksImpl(projectRoot, stagedFiles.scriptFiles);
    console.log(result.failed ? '❌ Script checks failed' : '✅ Script checks passed');
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Script check error: ${errorMsg}`);
    return { failed: true, output: `Script check error: ${errorMsg}` };
  }
}
