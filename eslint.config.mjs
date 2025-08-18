import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Unified ESLint configuration for entire repository
export default [
  // Base recommended configuration
  eslint.configs.recommended,
  
  // Base TypeScript configuration for ALL TypeScript files
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
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Backend-specific configurations with TypeScript project
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', '__tests__/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },

  // Scripts - more lenient console usage
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.js'],
    rules: {
      'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-lines-per-function': ['error', { max: 80 }],
    },
  },

  // Examples - fully allow console usage
  {
    files: ['examples/**/*.ts', 'examples/**/*.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // AI Code Reviewer - allow console in test mode
  {
    files: ['src/tools/ai-code-reviewer.ts'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },

  // React/UI specific configuration
  {
    files: ['ui/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
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
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Test files - very relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/e2e/**/*.{ts,tsx}', 'tests/**/*.ts'],
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
        vi: 'readonly',
        vitest: 'readonly',
        ...globals.browser, // For UI tests
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off',
      'max-statements': 'off',
    },
  },

  // JavaScript files - Node.js environment
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        jest: 'readonly',
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
    },
  },

  // CommonJS files
  {
    files: ['jest*.js', '**/jest*.js', '**/*config.js', '!ui/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        jest: 'readonly',
      },
    },
  },

  // UI JavaScript config files (ES modules)
  {
    files: ['ui/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
  },

  // Scripts with CommonJS require/module patterns
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        NodeJS: 'readonly',
      },
    },
  },

  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'build/',
      'playwright-report/',
      'test-results/',
      '**/*.d.ts',
      'ui/dist/',
      'ui/build/',
      '**/dist/',
      '**/build/',
      'eslint.config.mjs', // Ignore main config file
      'scripts/migrate-*.ts', // Migration scripts
      'scripts/diagnose-database.ts', // Diagnostic scripts
    ],
  },
];