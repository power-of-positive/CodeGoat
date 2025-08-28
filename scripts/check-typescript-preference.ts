#!/usr/bin/env node

/**
 * Check for JavaScript files in TypeScript project and warn about TypeScript preference
 * This script encourages using .ts/.tsx files instead of .js/.jsx in the source code
 */

import fs from 'fs/promises';
import { glob } from 'glob';

interface Colors {
  reset: string;
  bright: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  cyan: string;
}

interface TypeScriptFeature {
  feature: string;
  line: number;
  context: string;
}

interface ValidationResult {
  hasTypeScriptFeatures: boolean;
  features: TypeScriptFeature[];
}

const colors: Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class TypeScriptPreferenceChecker {
  private errors: string[] = [];
  private warnings: string[] = [];
  private allowedJsFiles: string[] = [
    // Configuration files
    'eslint.config.js',
    'jest.config.js',
    'tailwind.config.js',
    'webpack.config.js',
    'vite.config.js',
    'rollup.config.js',
    'babel.config.js',
    '.eslintrc.js',
    'next.config.js',
    'nuxt.config.js',
    // Build and tooling files
    'scripts/**/*.js', // Allow scripts to be JS (for now)
    'tools/**/*.js',
    'build/**/*.js',
    // Test setup files
    'jest.setup.js',
    'test-setup.js',
    // Node.js files that might need to be JS
    'server.js',
    'app.js',
  ];

  async checkProject(): Promise<void> {
    try {
      // Find all JavaScript files in source directories
      const jsFiles = await this.findJavaScriptFiles();

      if (jsFiles.length === 0) {
        console.error(
          `${colors.green}✅ No JavaScript files found in source directories${colors.reset}`
        );
        console.error(
          `${colors.cyan}💡 Project already follows TypeScript-first approach${colors.reset}`
        );
        return;
      }

      console.error(`${colors.cyan}🔍 Found ${jsFiles.length} JavaScript files${colors.reset}\n`);

      for (const file of jsFiles) {
        await this.analyzeFile(file);
      }

      this.generateReport();
    } catch (error) {
      console.error(
        `${colors.red}❌ Error checking TypeScript preference: ${(error as Error).message}${colors.reset}`
      );
      process.exit(1);
    }
  }

  private async findJavaScriptFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.js',
      'src/**/*.jsx',
      'tests/**/*.js',
      'test/**/*.js',
      '__tests__/**/*.js',
    ];

    let allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        ignore: [
          ...this.allowedJsFiles,
          '**/node_modules/**',
          'node_modules/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
        ],
        absolute: false,
      });
      allFiles = allFiles.concat(files);
    }

    return allFiles;
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const validation = this.detectTypeScriptFeatures(content);

      if (validation.hasTypeScriptFeatures) {
        this.errors.push(filePath);
        console.error(`${colors.red}❌ ${filePath}${colors.reset}`);
        console.error(`   ${colors.red}Contains TypeScript features:${colors.reset}`);

        validation.features.forEach((f: TypeScriptFeature) => {
          console.error(`   - ${f.feature} (line ${f.line})`);
        });
        console.error(`   ${colors.yellow}💡 Recommendation: Rename to .ts/.tsx${colors.reset}\n`);
      } else {
        this.warnings.push(filePath);
        console.error(`${colors.yellow}⚠️  ${filePath}${colors.reset}`);
        console.error(`   ${colors.yellow}Pure JavaScript file in TypeScript project${colors.reset}`);
        console.error(
          `   ${colors.cyan}💡 Consider migrating to TypeScript for better type safety${colors.reset}\n`
        );
      }
    } catch (error) {
      console.error(
        `${colors.red}Error analyzing ${filePath}: ${(error as Error).message}${colors.reset}`
      );
    }
  }

  private detectTypeScriptFeatures(content: string): ValidationResult {
    const features: TypeScriptFeature[] = [];
    const lines = content.split('\n');

    // Patterns that indicate TypeScript usage
    const typeScriptPatterns = [
      { pattern: /:\s*\w+(\[\]|<.*>)?\s*[=;,)}]/, feature: 'Type annotations' },
      { pattern: /interface\s+\w+/, feature: 'Interface declarations' },
      { pattern: /type\s+\w+\s*=/, feature: 'Type aliases' },
      { pattern: /enum\s+\w+/, feature: 'Enum declarations' },
      { pattern: /as\s+\w+/, feature: 'Type assertions' },
      { pattern: /<\w+.*>/, feature: 'Generic types' },
      { pattern: /implements\s+\w+/, feature: 'Interface implementation' },
      { pattern: /public\s+|private\s+|protected\s+/, feature: 'Access modifiers' },
      { pattern: /readonly\s+/, feature: 'Readonly modifier' },
      { pattern: /\?\s*:/, feature: 'Optional properties' },
      { pattern: /!\./, feature: 'Non-null assertion' },
    ];

    lines.forEach((line, index) => {
      typeScriptPatterns.forEach(({ pattern, feature }) => {
        if (pattern.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          features.push({
            feature,
            line: index + 1,
            context: line.trim(),
          });
        }
      });
    });

    return {
      hasTypeScriptFeatures: features.length > 0,
      features,
    };
  }

  private generateReport(): void {
    console.error(`${colors.bright}${colors.blue}📋 TypeScript Preference Report${colors.reset}`);
    console.error(
      `${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
    );

    console.error(`${colors.bright}Summary:${colors.reset}`);
    console.error(
      `• Files with TypeScript features in .js files: ${colors.red}${this.errors.length}${colors.reset}`
    );
    console.error(
      `• Pure JavaScript files: ${colors.yellow}${this.warnings.length}${colors.reset}\n`
    );

    if (this.errors.length > 0) {
      console.error(
        `${colors.red}${colors.bright}❌ TypeScript features found in JavaScript files${colors.reset}`
      );
      console.error(`${colors.red}These files should be renamed to .ts/.tsx:${colors.reset}`);
      this.errors.forEach(file => console.error(`  • ${file}`));
      console.error();
    }

    if (this.warnings.length > 0) {
      console.error(
        `${colors.yellow}${colors.bright}⚠️  JavaScript files in TypeScript project${colors.reset}`
      );
      console.error(`${colors.yellow}Consider migrating these to TypeScript:${colors.reset}`);
      this.warnings.forEach(file => console.error(`  • ${file}`));
      console.error();
    }

    // Recommendations
    console.error(`${colors.bright}${colors.cyan}💡 Recommendations:${colors.reset}`);

    if (this.errors.length > 0) {
      console.error(
        `${colors.cyan}1. Rename .js/.jsx files with TypeScript features to .ts/.tsx${colors.reset}`
      );
      console.error(
        `${colors.cyan}2. Update any imports/references to use new file extensions${colors.reset}`
      );
    }

    if (this.warnings.length > 0) {
      console.error(
        `${colors.cyan}3. Gradually migrate JavaScript files to TypeScript${colors.reset}`
      );
      console.error(
        `${colors.cyan}4. Add type annotations and interfaces for better type safety${colors.reset}`
      );
    }

    console.error(
      `${colors.cyan}5. Consider updating build scripts to use TypeScript files${colors.reset}\n`
    );

    // Exit with appropriate code
    if (this.errors.length > 0) {
      console.error(
        `${colors.red}❌ Check failed: Found TypeScript features in JavaScript files${colors.reset}`
      );
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.error(`${colors.yellow}⚠️  Check passed with warnings${colors.reset}`);
      process.exit(0);
    } else {
      console.error(`${colors.green}✅ All checks passed${colors.reset}`);
      process.exit(0);
    }
  }
}

// Run the checker
async function main(): Promise<void> {
  const checker = new TypeScriptPreferenceChecker();
  await checker.checkProject();
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { TypeScriptPreferenceChecker };
