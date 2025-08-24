#!/usr/bin/env node
/**
 * Dead code detection validation stage
 *
 * This script uses ts-prune to detect unused exports, functions, and variables
 * in the TypeScript codebase. It helps maintain code quality by identifying
 * dead code that can be safely removed.
 *
 * The script allows a small number of unused exports to accommodate
 * ongoing development but warns when there are too many unused exports.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DeadCodeConfig {
  // Maximum number of unused exports allowed before warning
  maxUnusedExports: number;
  // Files to ignore in the check (patterns)
  ignorePatterns: string[];
  // Whether to fail the check or just warn
  failOnExcess: boolean;
  // Additional ts-prune options
  tsPruneOptions: string[];
}

const DEFAULT_CONFIG: DeadCodeConfig = {
  maxUnusedExports: 20,
  ignorePatterns: [
    // Test files often export utilities that are only used in tests
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    // Type definitions may have unused exports for public APIs
    '*.d.ts',
    // Entry points and main files may export items for external use
    'index.ts',
    'main.ts',
    'server.ts',
    // Scripts may export functions for CLI usage
    'scripts/**',
    // UI components may export props interfaces for documentation
    'ui/src/types/**',
    // API route handlers export functions for Next.js
    'pages/api/**',
    'app/api/**',
  ],
  failOnExcess: false, // Start with warnings only
  tsPruneOptions: ['--project', 'tsconfig.json'],
};

function loadConfig(): DeadCodeConfig {
  const configPath = path.join(process.cwd(), 'dead-code-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...configData };
    } catch {
      console.warn('⚠️  Failed to load dead code config, using defaults');
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

function shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => {
    // Simple glob pattern matching
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    } else if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

interface UnusedExport {
  file: string;
  line: number;
  export: string;
}

function parseUnusedExports(output: string): UnusedExport[] {
  const lines = output
    .trim()
    .split('\n')
    .filter(line => line.trim());
  const exports: UnusedExport[] = [];

  for (const line of lines) {
    // ts-prune output format: "file:line - exportName (used in file)"
    // or "file:line - exportName"
    const match = line.match(/^(.+):(\d+)\s*-\s*(.+?)(?:\s+\(.*\))?$/);
    if (match) {
      const [, file, lineStr, exportName] = match;
      exports.push({
        file: file.trim(),
        line: parseInt(lineStr, 10),
        export: exportName.trim(),
      });
    }
  }

  return exports;
}

function formatExportsList(exports: UnusedExport[], maxDisplay: number = 15): string {
  if (exports.length === 0) {
    return 'none';
  }

  // Group by file for better readability
  const byFile = exports.reduce(
    (acc, exp) => {
      if (!acc[exp.file]) {
        acc[exp.file] = [];
      }
      acc[exp.file].push(exp);
      return acc;
    },
    {} as Record<string, UnusedExport[]>
  );

  const files = Object.keys(byFile).slice(0, maxDisplay);
  const result = files
    .map(file => {
      const fileExports = byFile[file];
      const exportsList = fileExports
        .slice(0, 5)
        .map(e => e.export)
        .join(', ');
      const extra = fileExports.length > 5 ? ` (+${fileExports.length - 5} more)` : '';
      return `  ${file}: ${exportsList}${extra}`;
    })
    .join('\n');

  if (Object.keys(byFile).length > maxDisplay) {
    return result + `\n  ... and ${Object.keys(byFile).length - maxDisplay} more files`;
  }

  return result;
}

function executeDeadCodeCheck(config: DeadCodeConfig): string {
  const command = `npx ts-prune ${config.tsPruneOptions.join(' ')}`;
  console.log(`📋 Running: ${command}`);

  return execSync(command, {
    encoding: 'utf-8',
    cwd: process.cwd(),
  });
}

function processUnusedExports(output: string, config: DeadCodeConfig): void {
  if (!output.trim()) {
    console.log('✅ No unused exports detected - excellent code hygiene!');
    return;
  }

  const allExports = parseUnusedExports(output);
  console.log(`📊 Found ${allExports.length} potentially unused exports`);

  const filteredExports = allExports.filter(
    exp => !shouldIgnoreFile(exp.file, config.ignorePatterns)
  );

  const unusedCount = filteredExports.length;
  console.log(
    `📊 Unused exports after filtering: ${unusedCount} (max: ${config.maxUnusedExports})`
  );

  if (unusedCount === 0) {
    console.log('✅ All unused exports are in ignored files - good job!');
    return;
  }

  handleUnusedExportsResults(filteredExports, config);
}

function showDeadCodeGuidance(): void {
  console.log('\n💡 Consider removing unused exports to maintain clean codebase:');
  console.log('   • Remove unused functions, classes, and variables');
  console.log('   • Use private/internal exports for implementation details');
  console.log('   • Add ignore patterns for legitimate public API exports');
  console.log('   • Consider if exports are needed for future use or external consumption');

  console.log('\n📈 Benefits of removing dead code:');
  console.log('   • Smaller bundle sizes and faster builds');
  console.log('   • Easier code navigation and maintenance');
  console.log('   • Reduced cognitive load for developers');
  console.log('   • Better tree-shaking optimization');
}

function handleUnusedExportsResults(filteredExports: UnusedExport[], config: DeadCodeConfig): void {
  const unusedCount = filteredExports.length;
  let shouldFail = false;

  if (unusedCount > config.maxUnusedExports) {
    console.log(
      `\n⚠️  Warning: Too many unused exports (${unusedCount} > ${config.maxUnusedExports})`
    );
    console.log('Unused exports by file:');
    console.log(formatExportsList(filteredExports));

    if (config.failOnExcess) {
      shouldFail = true;
    }

    showDeadCodeGuidance();
  } else {
    console.log(
      `\n✅ Unused exports within acceptable limits (${unusedCount}/${config.maxUnusedExports})`
    );
    if (unusedCount > 0) {
      console.log('Consider reviewing these exports:');
      console.log(formatExportsList(filteredExports, 10));
    }
  }

  if (shouldFail) {
    console.log('\n❌ Dead code detection failed due to configuration settings');
    process.exit(1);
  } else if (unusedCount > config.maxUnusedExports) {
    console.log('\n✅ Dead code detection completed with warnings');
  } else {
    console.log('\n✅ Dead code detection passed');
  }
}

function handleDeadCodeError(error: unknown, config: DeadCodeConfig): void {
  const execError = error as { status?: number; message?: string; stdout?: string };
  if (execError.status && execError.status !== 0) {
    console.error('❌ Failed to run dead code detection:', execError.message);
    process.exit(1);
  } else {
    const output = execError.stdout || '';
    if (output.trim()) {
      const allExports = parseUnusedExports(output);
      const filteredExports = allExports.filter(
        exp => !shouldIgnoreFile(exp.file, config.ignorePatterns)
      );

      if (filteredExports.length > config.maxUnusedExports && config.failOnExcess) {
        console.log('\n❌ Dead code detection failed - too many unused exports found');
        process.exit(1);
      }
    }
  }
}

function runDeadCodeDetection(): void {
  console.log('🔍 Running dead code detection...');

  const config = loadConfig();

  try {
    const output = executeDeadCodeCheck(config);
    processUnusedExports(output, config);
  } catch (error: unknown) {
    handleDeadCodeError(error, config);
  }
}

// Run the detection
if (require.main === module) {
  runDeadCodeDetection();
}

export { runDeadCodeDetection, DEFAULT_CONFIG, loadConfig };
