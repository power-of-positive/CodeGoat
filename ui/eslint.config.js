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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Frontend-specific: Stricter file size limits
      'max-lines': ['error', {
        max: 250, // Smaller than backend for better component organization
        skipBlankLines: true,
        skipComments: true
      }],
      'max-lines-per-function': ['error', {
        max: 30, // Smaller functions for React components
        skipBlankLines: true,
        skipComments: true
      }],
      // Allow console in development but warn
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Frontend-specific: Component files can be slightly larger
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 300 }],
      'max-lines-per-function': ['error', { max: 40 }],
    },
  },
  {
    // E2E tests: Very relaxed rules
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off',
      'max-statements': 'off',
      'max-depth': 'off',
      'max-params': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  sharedConfig.ignores,
];
