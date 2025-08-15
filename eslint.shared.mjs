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
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-console': 'error',
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack'], location: 'start' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'complexity': ['error', { max: 8 }], // Limit cyclomatic complexity
      'max-lines': ['error', {
        max: 250,
        skipBlankLines: true,
        skipComments: true
      }],
      'max-lines-per-function': ['error', {
        max: 30,
        skipBlankLines: true,
        skipComments: true
      }],
      'max-params': ['error', 3], // Limit function parameters
      'max-depth': ['error', 3], // Limit nesting depth  
      'max-statements': ['error', 12], // Limit statements per function
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
      'max-lines': ['error', { max: 350 }], // Allow slightly longer script files
      'max-lines-per-function': ['error', { max: 40 }], // Allow longer functions in scripts
      'max-statements': ['error', { max: 18 }], // Allow more statements in scripts
      'complexity': ['error', { max: 10 }], // Allow higher complexity in scripts
      'max-params': ['error', 4], // Allow more params in scripts
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
  sharedConfig.ignores,
  prettier,
];