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
  const patterns = [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    'ui/e2e/**/*.ts',
    'tests/**/*.ts'
  ];

  const ignorePatterns = [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '**/node_modules/**',
    'ui/node_modules/**',
    'tests/**/node_modules/**'
  ];

  const allFiles = await Promise.all(
    patterns.map(pattern => 
      glob(pattern, { 
        ignore: ignorePatterns,
        absolute: true 
      })
    )
  );

  return [...new Set(allFiles.flat())];
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
            code: line.trim()
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

  const allViolations: SkipViolation[] = [];
  
  for (const file of testFiles) {
    const violations = await scanFileForSkips(file);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log('✅ No test skipping patterns found');
    process.exit(0);
  }

  console.log(`❌ Found ${allViolations.length} test skipping violations:`);
  console.log('');

  // Group violations by file
  const violationsByFile = allViolations.reduce((acc, violation) => {
    if (!acc[violation.file]) {
      acc[violation.file] = [];
    }
    acc[violation.file].push(violation);
    return acc;
  }, {} as Record<string, SkipViolation[]>);

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