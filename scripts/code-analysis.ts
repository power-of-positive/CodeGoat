#!/usr/bin/env npx tsx

import { execSync } from 'child_process';
import * as fs from 'fs';

interface AnalysisResult {
  duplicates: {
    found: boolean;
    count: number;
    percentage: number;
    files: string[];
  };
  deadCode: { unusedImports: string[]; unusedExports: string[] };
  summary: string;
}

const run = (cmd: string, silent = true): string => {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
  } catch {
    return '';
  }
};

const parseJscpd = (): AnalysisResult['duplicates'] => {
  try {
    const report = JSON.parse(fs.readFileSync('./code-analysis/jscpd/jscpd-report.json', 'utf-8'));
    const duplicates = report.duplicates || [];
    return {
      found: duplicates.length > 0,
      count: duplicates.length,
      percentage: report.statistics?.percentage || 0,
      files: duplicates
        .map((d: { firstFile?: { name: string } }) => d.firstFile?.name)
        .filter(Boolean),
    };
  } catch {
    return { found: false, count: 0, percentage: 0, files: [] };
  }
};

const analyzeDuplicates = (): AnalysisResult['duplicates'] => {
  console.log('🔍 Analyzing code duplication...');
  if (!fs.existsSync('./code-analysis')) fs.mkdirSync('./code-analysis', { recursive: true });
  run('npx jscpd --reporters json --output ./code-analysis/jscpd .');
  return parseJscpd();
};

const analyzeDeadCode = (): AnalysisResult['deadCode'] => {
  console.log('🧹 Analyzing dead code...');
  const unusedImports = run('npx unimported')
    .split('\n')
    .filter(l => l.trim() && !l.includes('✓'))
    .slice(0, 20);
  const unusedExports = run('npx ts-prune --project frontend/tsconfig.json')
    .split('\n')
    .filter(l => l.includes('used'))
    .slice(0, 20);
  return { unusedImports, unusedExports };
};

const generateReport = (result: AnalysisResult): void => {
  const report = `# Code Analysis Report
Generated: ${new Date().toISOString()}

## Summary
${result.summary}

## Duplicates
- Found: ${result.duplicates.found ? 'Yes' : 'No'} (${result.duplicates.count} blocks, ${result.duplicates.percentage.toFixed(2)}%)

## Dead Code  
- Unused Imports: ${result.deadCode.unusedImports.length}
- Unused Exports: ${result.deadCode.unusedExports.length}

${result.duplicates.files.length > 0 ? `### Files with Duplicates:\n${result.duplicates.files.map(f => `- ${f}`).join('\n')}` : ''}
${
  result.deadCode.unusedImports.length > 0
    ? `\n### Unused Imports:\n${result.deadCode.unusedImports
        .slice(0, 10)
        .map(i => `- ${i}`)
        .join('\n')}`
    : ''
}
${
  result.deadCode.unusedExports.length > 0
    ? `\n### Unused Exports:\n${result.deadCode.unusedExports
        .slice(0, 10)
        .map(e => `- ${e}`)
        .join('\n')}`
    : ''
}
`;
  fs.writeFileSync('./code-analysis/report.md', report);
};

async function main(): Promise<void> {
  console.log('🚀 Starting automated code analysis...');

  const result: AnalysisResult = {
    duplicates: analyzeDuplicates(),
    deadCode: analyzeDeadCode(),
    summary: '',
  };

  const issues = [];
  if (result.duplicates.percentage > 2)
    issues.push(`${result.duplicates.percentage.toFixed(1)}% duplication`);
  if (result.deadCode.unusedImports.length > 5)
    issues.push(`${result.deadCode.unusedImports.length} unused imports`);
  if (result.deadCode.unusedExports.length > 3)
    issues.push(`${result.deadCode.unusedExports.length} unused exports`);

  result.summary =
    issues.length === 0
      ? '✅ No significant code quality issues detected'
      : `⚠️ Issues found: ${issues.join(', ')}`;

  generateReport(result);

  console.log(
    `\n📊 Summary: Duplicates: ${result.duplicates.count} (${result.duplicates.percentage.toFixed(1)}%), Unused: ${result.deadCode.unusedImports.length} imports, ${result.deadCode.unusedExports.length} exports`
  );

  const shouldBlock =
    result.duplicates.percentage > 5 ||
    result.deadCode.unusedImports.length > 10 ||
    result.deadCode.unusedExports.length > 5;

  if (shouldBlock) {
    const reasons = [];
    if (result.duplicates.percentage > 5)
      reasons.push(`High duplication: ${result.duplicates.percentage.toFixed(1)}%`);
    if (result.deadCode.unusedImports.length > 10)
      reasons.push(`Too many unused imports: ${result.deadCode.unusedImports.length}`);
    if (result.deadCode.unusedExports.length > 5)
      reasons.push(`Unused exports: ${result.deadCode.unusedExports.length}`);

    console.error('🚫 Blocking issues:', reasons.join(', '));
    console.log(JSON.stringify({ blocked: true, reasons }));
    process.exit(1);
  }

  console.log('✅ Code analysis passed');
  console.log(JSON.stringify({ blocked: false, summary: result.summary }));
}

main().catch(console.error);
