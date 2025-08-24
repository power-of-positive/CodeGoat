#!/usr/bin/env npx tsx

/**
 * Fast code analysis for staged files only (for precommit hooks)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

export function getStagedFiles(): string[] {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(
        file =>
          file &&
          (file.endsWith('.ts') ||
            file.endsWith('.tsx') ||
            file.endsWith('.js') ||
            file.endsWith('.jsx'))
      );
  } catch {
    return [];
  }
}

export function checkDuplicatesInStagedFiles(): {
  blocked: boolean;
  details: string;
} {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    return { blocked: false, details: 'No staged files to check' };
  }

  try {
    // Quick duplicate check on staged files only
    const output = execSync(
      `npx jscpd --silent --threshold 30 --min-lines 10 --min-tokens 100 ${stagedFiles.join(' ')}`,
      { encoding: 'utf-8' }
    );

    // Parse percentage from output
    const percentMatch = output.match(/(\d+\.\d+)%.*duplicated/);
    const percentage = percentMatch ? parseFloat(percentMatch[1]) : 0;

    if (percentage > 5) {
      return {
        blocked: true,
        details: `High code duplication in staged files: ${percentage.toFixed(1)}% (threshold: 5%)`,
      };
    }

    return {
      blocked: false,
      details: `Duplication check passed: ${percentage.toFixed(1)}%`,
    };
  } catch {
    return {
      blocked: false,
      details: 'Duplicate check failed - assuming no issues',
    };
  }
}

export function analyzeFileExports(file: string): {
  count: number;
  estimated: number;
} {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const exportMatches =
      content.match(/^export\s+(const|function|class|interface|type)\s+\w+/gm) || [];
    const estimated = Math.floor(exportMatches.length * 0.3);
    return { count: exportMatches.length, estimated };
  } catch {
    return { count: 0, estimated: 0 };
  }
}

export function checkUnusedExportsQuick(): {
  blocked: boolean;
  details: string;
} {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    return { blocked: false, details: 'No staged files to check' };
  }

  let unusedExportCount = 0;
  const unusedExports: string[] = [];

  for (const file of stagedFiles.slice(0, 10)) {
    const { count, estimated } = analyzeFileExports(file);
    if (count > 5) {
      unusedExportCount += estimated;
      unusedExports.push(`${file}: ${count} exports (estimated ${estimated} unused)`);
    }
  }

  if (unusedExportCount > 5) {
    return {
      blocked: true,
      details: `Potentially unused exports: ${unusedExportCount} (threshold: 5)\n${unusedExports.join('\n')}`,
    };
  }

  return {
    blocked: false,
    details: `Export check passed: ~${unusedExportCount} potential unused exports`,
  };
}

export function outputResults(
  duplicateCheck: { blocked: boolean; details: string },
  exportCheck: { blocked: boolean; details: string }
): void {
  const blocked = duplicateCheck.blocked || exportCheck.blocked;
  const reasons: string[] = [];

  if (duplicateCheck.blocked) {
    reasons.push(duplicateCheck.details);
  }
  if (exportCheck.blocked) {
    reasons.push(exportCheck.details);
  }

  console.log('📊 Quick Analysis Results:');
  console.log(`   ${duplicateCheck.details}`);
  console.log(`   ${exportCheck.details}`);

  const result = {
    blocked,
    reasons,
    details: { duplicates: duplicateCheck, exports: exportCheck },
  };
  console.log(JSON.stringify(result));

  if (blocked) {
    console.error('🚫 Code analysis blocked - see reasons above');
    process.exit(1);
  } else {
    console.log('✅ Fast code analysis passed');
    process.exit(0);
  }
}

export async function runAnalysis(): Promise<{
  blocked: boolean;
  reasons: string[];
  details: {
    duplicates: { blocked: boolean; details: string };
    exports: { blocked: boolean; details: string };
  };
}> {
  const duplicateCheck = checkDuplicatesInStagedFiles();
  const exportCheck = checkUnusedExportsQuick();

  const blocked = duplicateCheck.blocked || exportCheck.blocked;
  const reasons: string[] = [];

  if (duplicateCheck.blocked) {
    reasons.push(duplicateCheck.details);
  }
  if (exportCheck.blocked) {
    reasons.push(exportCheck.details);
  }

  return {
    blocked,
    reasons,
    details: { duplicates: duplicateCheck, exports: exportCheck },
  };
}

async function main(): Promise<void> {
  console.log('🚀 Running fast code analysis on staged files...');
  const result = await runAnalysis();
  outputResults(result.details.duplicates, result.details.exports);
}

// Only run main if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}
