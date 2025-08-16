import { sharedConfig } from '../eslint.shared.mjs';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tsparser from '@typescript-eslint/parser';

// Frontend-specific ESLint configuration using shared config
export default [
  sharedConfig.typescript,
  sharedConfig.tests,
  {
    // Frontend-specific: React and browser environment
    files: ['**/*.{ts,tsx}'],
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
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      // Frontend-specific: Flexible file size limits
      'max-lines': [
        'error',
        {
          max: 400, // Allow larger components
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': [
        'error',
        {
          max: 80, // Allow larger functions for complex components
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      // Allow console in development but error
    },
  },
  {
    // Frontend-specific: Component files can be larger and more complex
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 500 }],
      'max-lines-per-function': ['error', { max: 100 }],
      complexity: ['error', { max: 20 }],
      'max-statements': ['error', { max: 30 }],
    },
  },
  {
    // E2E tests: Very relaxed rules
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-statements': 'off',
      'max-depth': 'off',
      'max-params': 'off',
      'no-console': 'off',
    },
  },
  sharedConfig.ignores,
];
