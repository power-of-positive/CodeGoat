import { sharedConfig } from './eslint.shared.mjs';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

// Backend-specific ESLint configuration using shared config
export default [
  sharedConfig.typescript,
  sharedConfig.tests,
  sharedConfig.scripts,
  {
    // Backend-specific: Allow longer files and functions for API routes
    files: ['src/routes/kanban-*.ts'],
    rules: {
      'max-lines': ['error', { max: 400 }],
      'max-lines-per-function': ['error', { max: 50 }],
      'max-statements': ['error', { max: 30 }],
      complexity: ['error', { max: 12 }], // Higher complexity for API routes
      'max-params': ['error', 5], // Allow more params for API routes
    },
  },
  {
    // Backend-specific: Project-based TypeScript parsing
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json', // Backend uses project-based parsing
      },
    },
  },
  sharedConfig.ignores,
];
