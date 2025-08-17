import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintComments from 'eslint-plugin-eslint-comments';
import prettier from 'eslint-config-prettier';

// Shared ESLint configuration for the entire monorepo
export const sharedConfig = {
  // Base TypeScript configuration
  typescript: {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'eslint-comments': eslintComments,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack'], location: 'start' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'complexity': ['warn', { max: 12 }], // Limit cyclomatic complexity
      'max-lines': ['warn', {
        max: 400,
        skipBlankLines: true,
        skipComments: true
      }],
      'max-lines-per-function': ['warn', {
        max: 60,
        skipBlankLines: true,
        skipComments: true
      }],
      'max-params': ['warn', 5], // Limit function parameters
      'max-depth': ['warn', 4], // Limit nesting depth  
      'max-statements': ['warn', 20], // Limit statements per function
      'eslint-comments/no-use': ['error', {
        'allow': []
      }]
    },
  },

  // Test files configuration
  tests: {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx', 'tests/**/*.ts', '**/e2e/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        test: 'readonly',
        fail: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off',
      'max-statements': 'off',
    },
  },

  // Scripts and CLI tools configuration
  scripts: {
    files: ['scripts/**/*.js', 'scripts/**/*.ts', 'src/tools/**/*.ts', 'src/**/cli.ts'],
    rules: {
      'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
      'max-lines': ['error', { max: 450 }], // Allow longer script files
      'max-lines-per-function': ['error', { max: 60 }], // Allow longer functions in scripts (increased from 40)
      'max-statements': ['error', { max: 30 }], // Allow more statements in scripts
      'complexity': ['error', { max: 12 }], // Allow higher complexity in scripts
      'max-params': ['error', 5], // Allow more params in scripts
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn instead of error for scripts
      '@typescript-eslint/explicit-function-return-type': 'off', // Turn off for scripts
      'eslint-comments/no-use': 'off', // Allow eslint directives in scripts
    },
  },

  // Script test files configuration - even more lenient
  scriptsTests: {
    files: ['scripts/**/*.test.ts', 'scripts/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off', // Allow very long test functions
      'complexity': 'off',
      'max-statements': 'off',
      'eslint-comments/no-use': 'off',
    },
  },

  // Ignore patterns
  ignores: {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'build/', 'playwright-report/', 'test-results/'],
  },
};

export default [
  eslint.configs.recommended,
  sharedConfig.typescript,
  sharedConfig.tests,
  sharedConfig.scripts,
  sharedConfig.scriptsTests,
  sharedConfig.ignores,
  prettier,
];