import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintComments from 'eslint-plugin-eslint-comments';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Unified ESLint configuration for entire repository
export default [
  // Base recommended configuration
  eslint.configs.recommended,
  
  // Base TypeScript configuration for all TypeScript files
  {
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
      'complexity': ['warn', { max: 12 }],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 5],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 20],
      'eslint-comments/no-use': ['error', { allow: [] }]
    },
  },

  // Backend-specific configurations with project-based parsing
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', '__tests__/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
  },

  // Backend API routes - allow more complexity
  {
    files: ['src/routes/kanban-*.ts'],
    rules: {
      'max-lines': ['error', { max: 400 }],
      'max-lines-per-function': ['error', { max: 50 }],
      'max-statements': ['error', { max: 30 }],
      complexity: ['error', { max: 12 }],
      'max-params': ['error', 5],
    },
  },

  // Scripts configuration - more lenient
  {
    files: ['scripts/**/*.js', 'scripts/**/*.ts', 'src/tools/**/*.ts', 'src/**/cli.ts'],
    rules: {
      'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
      'max-lines': ['error', { max: 450 }],
      'max-lines-per-function': ['error', { max: 60 }],
      'max-statements': ['error', { max: 30 }],
      complexity: ['error', { max: 12 }],
      'max-params': ['error', 5],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'eslint-comments/no-use': 'off',
    },
  },

  // Script test files - very lenient
  {
    files: ['scripts/**/*.test.ts', 'scripts/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-statements': 'off',
      'eslint-comments/no-use': 'off',
    },
  },

  // Frontend/UI React configurations
  {
    files: ['ui/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Frontend components - allow larger and more complex files
  {
    files: ['ui/src/components/**/*.{ts,tsx}', 'ui/src/pages/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 500 }],
      'max-lines-per-function': ['error', { max: 100 }],
      complexity: ['error', { max: 20 }],
      'max-statements': ['error', { max: 30 }],
    },
  },

  // Test files configuration - relaxed rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx', 'tests/**/*.ts', '**/e2e/**/*.ts'],
    languageOptions: {
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
        vi: 'readonly',
        vitest: 'readonly',
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
      complexity: 'off',
      'max-statements': 'off',
    },
  },

  // UI test files - browser globals
  {
    files: ['ui/**/*.test.{ts,tsx}', 'ui/**/*.spec.{ts,tsx}', 'ui/e2e/**/*.{ts,tsx}', 'ui/tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
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
        vi: 'readonly',
        vitest: 'readonly',
      },
    },
  },

  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'build/', 'playwright-report/', 'test-results/'],
  },

  // Prettier integration (must be last to override conflicting rules)
  prettier,
];