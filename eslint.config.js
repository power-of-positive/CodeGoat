import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
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
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error', // Enforce no any types
      '@typescript-eslint/explicit-function-return-type': 'error', // Enforce explicit return types
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-console': 'error', // Disallow all console statements
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack'], location: 'start' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'max-lines': ['error', {
        max: 350,
        skipBlankLines: true,
        skipComments: true
      }], // Limit files to 350 lines
      'max-lines-per-function': ['error', {
        max: 50,
        skipBlankLines: true,
        skipComments: true
      }], // Limit functions to 50 lines
    },
  },
  {
    // Discourage JavaScript files in favor of TypeScript
    files: ['src/**/*.js', 'tests/**/*.js'],
    rules: {
      'no-console': ['warn', {
        allow: ['warn', 'error', 'log']
      }],
      // Custom warning for JavaScript files in TypeScript project
      'prefer-const': ['error'],
      'no-var': ['error'],
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
  },
  {
    // Allow console statements in CLI tools and scripts
    files: ['scripts/**/*.js', 'scripts/**/*.ts', 'src/tools/**/*.ts', 'src/**/cli.ts'],
    rules: {
      'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }], // Allow console in CLI tools
    },
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
      },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
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
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'max-lines': 'off', // Disable max-lines for test files
      'max-lines-per-function': 'off', // Disable max-lines-per-function for test files
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js'],
  },
  prettier,
];
