/**
 * Security check orchestration
 */

import {
  runDuplicateCodeDetection,
  runDeadCodeDetection,
  runDependencyVulnerabilityCheck,
} from './security-runners';

export interface SecurityCheckResult {
  securityFailure: boolean;
  securityOutput: string;
}

/**
 * Run all security checks and collect results
 */
export function runSecurityChecks(projectRoot: string): SecurityCheckResult {
  console.log('🔒 Running security checks...');
  const results: string[] = [];
  let hasFailure = false;

  const securityChecks = [
    { name: 'Duplicate Code Detection', runner: runDuplicateCodeDetection },
    { name: 'Dead Code Detection', runner: runDeadCodeDetection },
    {
      name: 'Dependency Vulnerabilities',
      runner: runDependencyVulnerabilityCheck,
    },
  ];

  // Run all security checks to collect all issues
  for (const { name, runner } of securityChecks) {
    try {
      const result = runner(projectRoot);
      results.push(`${name}: ${result.output}`);

      if (!result.success) {
        hasFailure = true;
        console.log(`❌ ${name} failed`);
      } else {
        console.log(`✅ ${name} passed`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push(`${name}: ⚠️ Failed to run - ${errorMsg}`);
      console.warn(`⚠️ ${name} check failed: ${errorMsg}`);
    }
  }

  const securityOutput = results.length > 0 ? `\nSECURITY CHECKS:\n${results.join('\n')}\n` : '';

  return { securityFailure: hasFailure, securityOutput };
}
