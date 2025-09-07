#!/usr/bin/env node

/**
 * Test Skipping Detection Script
 *
 * This script scans for test skipping patterns in the codebase and fails if any are found.
 * It's designed to be integrated into the validation pipeline to prevent skipped tests
 * from being committed.
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

interface SkipPattern {
  pattern: RegExp;
  description: string;
}

const SKIP_PATTERNS: SkipPattern[] = [
  { pattern: /\.skip\s*\(/g, description: '.skip() method' },
  { pattern: /\bxit\s*\(/g, description: 'xit() function' },
  { pattern: /\bxdescribe\s*\(/g, description: 'xdescribe() function' },
  { pattern: /\bxtest\s*\(/g, description: 'xtest() function' },
  { pattern: /\btest\.skip\s*\(/g, description: 'test.skip() method' },
  { pattern: /\bit\.skip\s*\(/g, description: 'it.skip() method' },
  { pattern: /\bdescribe\.skip\s*\(/g, description: 'describe.skip() method' },
];

interface SkipViolation {
  file: string;
  line: number;
  pattern: string;
  code: string;
}

async function findTestFiles(): Promise<string[]> {
  // Use more specific patterns to avoid deep traversal
  const patterns = [
    'src/**/*.test.ts',
    'src/**/*.spec.ts',
    'scripts/**/*.test.ts',
    'scripts/**/*.spec.ts',
    'ui/src/**/*.test.ts',
    'ui/src/**/*.test.tsx',
    'ui/src/**/*.spec.ts',
    'ui/src/**/*.spec.tsx',
    'ui/e2e/*.spec.ts',
    'ui/e2e/*.test.ts',
    'tests/**/*.spec.ts',
    'tests/**/*.test.ts',
  ];

  const ignorePatterns = [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '**/node_modules/**',
    'prisma/**',
    '.git/**',
    'logs/**',
    'tmp/**',
    'temp/**',
    '.next/**',
    'out/**',
  ];

  try {
    // Process all patterns in parallel for better performance
    const promises = patterns.map(async pattern => {
      try {
        const files = await glob(pattern, {
          ignore: ignorePatterns,
          absolute: true,
          nodir: true,
          follow: false, // Don't follow symlinks
          maxDepth: 10, // Limit directory depth
          dot: false, // Skip hidden files
          windowsPathsNoEscape: true, // Better Windows support
        });
        return files;
      } catch (error) {
        console.warn(`Warning: Could not glob pattern ${pattern}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allFiles = results.flat();

    return [...new Set(allFiles)];
  } catch (error) {
    console.error('Error finding test files:', error);
    return [];
  }
}

async function scanFileForSkips(filePath: string): Promise<SkipViolation[]> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const violations: SkipViolation[] = [];

    lines.forEach((line, index) => {
      SKIP_PATTERNS.forEach(({ pattern, description }) => {
        const matches = line.match(pattern);
        if (matches) {
          violations.push({
            file: filePath,
            line: index + 1,
            pattern: description,
            code: line.trim(),
          });
        }
      });
    });

    return violations;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
    return [];
  }
}

async function main(): Promise<void> {
  console.log('🔍 Scanning for test skipping patterns...');

  const testFiles = await findTestFiles();
  console.log(`📁 Found ${testFiles.length} test files to scan`);

  // Process files in parallel for faster execution
  const violationPromises = testFiles.map(file => scanFileForSkips(file));
  const violationResults = await Promise.all(violationPromises);
  const allViolations = violationResults.flat();

  if (allViolations.length === 0) {
    console.log('✅ No test skipping patterns found');
    process.exit(0);
  }

  console.log(`❌ Found ${allViolations.length} test skipping violations:`);
  console.log('');

  // Group violations by file
  const violationsByFile = allViolations.reduce(
    (acc, violation) => {
      if (!acc[violation.file]) {
        acc[violation.file] = [];
      }
      acc[violation.file].push(violation);
      return acc;
    },
    {} as Record<string, SkipViolation[]>
  );

  Object.entries(violationsByFile).forEach(([file, violations]) => {
    console.log(`📄 ${file.replace(process.cwd(), '.')}`);
    violations.forEach(violation => {
      console.log(`   Line ${violation.line}: ${violation.pattern}`);
      console.log(`   Code: ${violation.code}`);
      console.log('');
    });
  });

  console.log('❌ Test skipping is not allowed. Please fix or remove the skipped tests.');
  console.log('   Use proper test organization and conditions instead of skipping.');
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Remove .skip() calls and fix failing tests');
  console.log('   - Use conditional test execution with if statements');
  console.log('   - Use testPathIgnorePatterns in Jest config for permanent exclusions');
  console.log('   - Use test.todo() for placeholder tests instead of skipping');

  process.exit(1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { main as checkTestSkipping };
