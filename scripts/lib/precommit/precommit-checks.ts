/**
 * Individual precommit check functions
 */

import { StagedFiles } from "../files/staged-files";
import { runCodeAnalysis } from "../analysis/code-analysis";
import { collectCodeResults } from "../analysis/code-results";
import { runSecurityChecks } from "../security/security-checks";

/**
 * Run code analysis checks
 */
export interface CheckResults {
  criticalFailure: boolean;
  allOutput: string;
  analysisResult: { blocked: boolean; details: string };
  securityFailure?: boolean;
}

/**
 * Run code analysis with error handling
 */
async function runCodeAnalysisWithHandling(criticalFailure: boolean): Promise<{
  analysisResult: { blocked: boolean; details: string };
  outputSuffix: string;
}> {
  if (criticalFailure) {
    return {
      analysisResult: {
        blocked: false,
        details: "Code analysis skipped due to failed quality checks",
      },
      outputSuffix: "",
    };
  }

  try {
    const analysisResult = await runCodeAnalysis();
    const outputSuffix = analysisResult.blocked
      ? `\n${analysisResult.details}\n`
      : "";
    return { analysisResult, outputSuffix };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Code analysis failed: ${errorMsg}`);
    const analysisResult = {
      blocked: false,
      details: `Code analysis error: ${errorMsg}`,
    };
    return { analysisResult, outputSuffix: `\n${analysisResult.details}\n` };
  }
}

/**
 * Run all quality checks and collect results
 */
export async function runAllChecks(
  projectRoot: string,
  stagedFiles: StagedFiles,
): Promise<CheckResults> {
  const codeResult = await collectCodeResults(projectRoot, stagedFiles);
  const criticalFailure = codeResult.failed;

  let allOutput = codeResult.output;

  const { analysisResult, outputSuffix } =
    await runCodeAnalysisWithHandling(criticalFailure);
  allOutput += outputSuffix;

  const { securityFailure, securityOutput } = runSecurityChecks(projectRoot);
  allOutput += securityOutput;

  return {
    criticalFailure: criticalFailure || securityFailure,
    allOutput,
    analysisResult,
    securityFailure,
  };
}
