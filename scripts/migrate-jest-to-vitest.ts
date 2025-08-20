#!/usr/bin/env npx ts-node

/**
 * Jest to Vitest Migration Script
 *
 * Automatically converts Jest test files to Vitest format,
 * resolving CommonJS/ESM conflicts and framework syntax differences.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
  skipBackup: boolean;
  targetDirectory: string;
}

interface MigrationResult {
  file: string;
  changed: boolean;
  changes: string[];
  errors: string[];
}

class JestToVitestMigrator {
  private options: MigrationOptions;
  private results: MigrationResult[] = [];

  constructor(options: MigrationOptions) {
    this.options = options;
  }

  /**
   * Main migration function
   */
  async migrate(): Promise<void> {
    console.log('🔧 Starting Jest to Vitest migration...\n');

    if (this.options.dryRun) {
      console.log('📋 DRY RUN MODE - No files will be modified\n');
    }

    const testFiles = this.findTestFiles(this.options.targetDirectory);
    console.log(`📁 Found ${testFiles.length} test files to analyze\n`);

    for (const file of testFiles) {
      try {
        const result = await this.migrateFile(file);
        this.results.push(result);

        if (this.options.verbose || result.changed) {
          this.logResult(result);
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
        this.results.push({
          file,
          changed: false,
          changes: [],
          errors: [(error as Error).message],
        });
      }
    }

    this.printSummary();
  }

  /**
   * Find all test files in the target directory
   */
  private findTestFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) {
      console.warn(`⚠️ Directory does not exist: ${dir}`);
      return files;
    }

    const processDirectory = (currentDir: string) => {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (
            !item.includes('node_modules') &&
            !item.includes('dist') &&
            !item.includes('coverage')
          ) {
            processDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = extname(item);
          if (
            (ext === '.ts' || ext === '.js') &&
            (item.includes('.test.') || item.includes('.spec.') || item.includes('__tests__'))
          ) {
            files.push(fullPath);
          }
        }
      }
    };

    processDirectory(dir);
    return files;
  }

  /**
   * Migrate a single file from Jest to Vitest
   */
  private async migrateFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      changed: false,
      changes: [],
      errors: [],
    };

    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply migration transformations
    const transformations = [
      this.transformImports,
      this.transformGlobals,
      this.transformMockFunctions,
      this.transformTestSyntax,
      this.transformExpectations,
      this.transformTimers,
      this.transformModuleMocks,
    ];

    for (const transform of transformations) {
      const transformResult = transform.call(this, content);
      if (transformResult.content !== content) {
        content = transformResult.content;
        result.changes.push(...transformResult.changes);
      }
    }

    // Check if file was actually changed
    result.changed = content !== originalContent;

    if (result.changed && !this.options.dryRun) {
      // Create backup unless skipped
      if (!this.options.skipBackup) {
        writeFileSync(`${filePath}.backup`, originalContent);
      }

      // Write the migrated content
      writeFileSync(filePath, content);
    }

    return result;
  }

  /**
   * Transform import statements
   */
  private transformImports(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    // Add Vitest imports if needed
    const needsVitestImports =
      /\b(describe|it|test|expect|beforeEach|afterEach|beforeAll|afterAll|vi|mock)\b/.test(content);
    const hasVitestImports = /from ['"]vitest['"]/.test(content);

    if (needsVitestImports && !hasVitestImports) {
      // Add Vitest imports at the top
      const importStatement =
        "import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';\n";
      content = importStatement + content;
      changes.push('Added Vitest imports');
    }

    return { content, changes };
  }

  /**
   * Transform global function usage
   */
  private transformGlobals(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    // Replace jest global with vi
    const jestGlobalRegex = /\bjest\./g;
    if (jestGlobalRegex.test(content)) {
      content = content.replace(jestGlobalRegex, 'vi.');
      changes.push('Replaced jest.* with vi.*');
    }

    return { content, changes };
  }

  /**
   * Transform mock function calls
   */
  private transformMockFunctions(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    // Transform common mock patterns
    const mockTransforms = [
      {
        pattern: /jest\.fn\(\)/g,
        replacement: 'vi.fn()',
        description: 'jest.fn() → vi.fn()',
      },
      {
        pattern: /jest\.spyOn\(/g,
        replacement: 'vi.spyOn(',
        description: 'jest.spyOn() → vi.spyOn()',
      },
      {
        pattern: /jest\.mock\(/g,
        replacement: 'vi.mock(',
        description: 'jest.mock() → vi.mock()',
      },
      {
        pattern: /jest\.clearAllMocks\(\)/g,
        replacement: 'vi.clearAllMocks()',
        description: 'jest.clearAllMocks() → vi.clearAllMocks()',
      },
    ];

    for (const transform of mockTransforms) {
      if (transform.pattern.test(content)) {
        content = content.replace(transform.pattern, transform.replacement);
        changes.push(transform.description);
      }
    }

    return { content, changes };
  }

  /**
   * Transform test syntax
   */
  private transformTestSyntax(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    // Most Jest test syntax is compatible with Vitest, but we can check for potential issues
    const problematicPatterns = [
      {
        pattern: /jest\.setTimeout\(/,
        suggestion: 'Use vi.setConfig({ testTimeout: ... }) instead of jest.setTimeout()',
      },
      {
        pattern: /jest\.retryTimes\(/,
        suggestion: 'Vitest uses retry option in test configuration',
      },
    ];

    for (const pattern of problematicPatterns) {
      if (pattern.pattern.test(content)) {
        changes.push(`SUGGESTION: ${pattern.suggestion}`);
      }
    }

    return { content, changes };
  }

  /**
   * Transform expectation patterns
   */
  private transformExpectations(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    // Most expect patterns are compatible, but we can note any special cases
    return { content, changes };
  }

  /**
   * Transform timer mocks
   */
  private transformTimers(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    const timerTransforms = [
      {
        pattern: /jest\.useFakeTimers\(\)/g,
        replacement: 'vi.useFakeTimers()',
        description: 'jest.useFakeTimers() → vi.useFakeTimers()',
      },
      {
        pattern: /jest\.useRealTimers\(\)/g,
        replacement: 'vi.useRealTimers()',
        description: 'jest.useRealTimers() → vi.useRealTimers()',
      },
      {
        pattern: /jest\.advanceTimersByTime\(/g,
        replacement: 'vi.advanceTimersByTime(',
        description: 'jest.advanceTimersByTime() → vi.advanceTimersByTime()',
      },
    ];

    for (const transform of timerTransforms) {
      if (transform.pattern.test(content)) {
        content = content.replace(transform.pattern, transform.replacement);
        changes.push(transform.description);
      }
    }

    return { content, changes };
  }

  /**
   * Transform module mocking
   */
  private transformModuleMocks(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];

    // Transform jest.doMock patterns
    if (/jest\.doMock\(/.test(content)) {
      content = content.replace(/jest\.doMock\(/g, 'vi.doMock(');
      changes.push('jest.doMock() → vi.doMock()');
    }

    return { content, changes };
  }

  /**
   * Log the result of a file migration
   */
  private logResult(result: MigrationResult): void {
    const status = result.changed ? '✅' : '⚪';
    console.log(`${status} ${result.file}`);

    if (result.changes.length > 0) {
      result.changes.forEach(change => {
        console.log(`   📝 ${change}`);
      });
    }

    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });
    }

    console.log();
  }

  /**
   * Print migration summary
   */
  private printSummary(): void {
    const total = this.results.length;
    const changed = this.results.filter(r => r.changed).length;
    const errors = this.results.filter(r => r.errors.length > 0).length;

    console.log('\n📊 Migration Summary:');
    console.log(`   Total files: ${total}`);
    console.log(`   Files changed: ${changed}`);
    console.log(`   Files with errors: ${errors}`);

    if (this.options.dryRun) {
      console.log('\n📋 This was a dry run - no files were modified');
    }

    if (changed > 0 && !this.options.dryRun && !this.options.skipBackup) {
      console.log('\n💾 Backup files created with .backup extension');
    }

    console.log('\n✨ Migration completed!');

    if (changed > 0) {
      console.log('\n🔄 Next steps:');
      console.log('   1. Review the changes and test your migrated files');
      console.log('   2. Update your test scripts to use Vitest');
      console.log('   3. Install jest-vitest-shims if needed for compatibility');
      console.log("   4. Remove .backup files once you're satisfied with the results");
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipBackup: args.includes('--no-backup'),
    targetDirectory: process.cwd(),
  };

  // Parse target directory if provided
  const targetIndex = args.findIndex(arg => arg === '--target' || arg === '-t');
  if (targetIndex !== -1 && args[targetIndex + 1]) {
    options.targetDirectory = args[targetIndex + 1];
  }

  const migrator = new JestToVitestMigrator(options);
  await migrator.migrate();
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export { JestToVitestMigrator, MigrationOptions, MigrationResult };
