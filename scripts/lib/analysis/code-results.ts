/**
 * Code results collection orchestrator
 */
import { StagedFiles } from '../files/staged-files';
import { runFrontendChecks } from './frontend-checks';
import { runBackendChecks } from './backend-checks';
import { runScriptChecks } from './script-checks';

/**
 * Collect results from all code quality checks
 */
export async function collectCodeResults(
  projectRoot: string,
  stagedFiles: StagedFiles
): Promise<{ failed: boolean; output: string }> {
  try {
    console.log('\n🚀 Starting code quality checks...');
    const checks = [
      {
        name: 'Frontend',
        fn: () => runFrontendChecks(projectRoot, stagedFiles),
      },
      { name: 'Backend', fn: () => runBackendChecks(projectRoot, stagedFiles) },
      { name: 'Scripts', fn: () => runScriptChecks(projectRoot, stagedFiles) },
    ];
    for (const check of checks) {
      console.log(`\n📂 === ${check.name.toUpperCase()} CHECKS ===`);
      const result = await check.fn();
      if (result.failed) {
        console.log(`\n💥 ${check.name} checks FAILED - stopping further checks`);
        return {
          failed: true,
          output: `${check.name} checks failed:\n${result.output}`,
        };
      }
      console.log(`\n✅ ${check.name} checks PASSED`);
    }
    console.log('\n🎉 All code quality checks passed!');
    return { failed: false, output: '' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`\n❌ Code check collection error: ${errorMsg}`);
    return { failed: true, output: `Code check collection error: ${errorMsg}` };
  }
}
