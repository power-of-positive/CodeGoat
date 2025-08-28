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
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['warn', 'all'],
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      'no-magic-numbers': [
        'warn',
        {
          ignore: [0, 1, -1, 2, 3, 5, 10, 100, 1000],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
        },
      ],
      complexity: ['warn', { max: 10 }],
      'max-depth': ['warn', { max: 4 }],
      'max-params': ['warn', { max: 4 }],
      'max-statements-per-line': ['error', { max: 1 }],
    },
  },

  // Backend-specific configurations with TypeScript project
  {
    files: ['src/**/*.ts', '__tests__/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
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
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-statements': ['warn', { max: 25 }],
      'jsx-quotes': ['error', 'prefer-double'],
    },
  },

  // Legacy files - temporarily disable max-lines for files not related to current task
  {
    files: [
      'ui/src/features/permissions/components/PermissionEditor.tsx',
      'ui/src/shared/components/Settings.tsx',
      'ui/src/features/tasks/components/TaskBoard.tsx',
      'ui/src/features/workers/components/WorkerDetail.tsx',
      'ui/shared/lib/api.test.ts',
      'ui/shared/lib/api.ts',
      'ui/src/lib/api.test.ts',
      'ui/src/lib/api.ts',
      'ui/src/pages/BDDTestsDashboard.tsx',
    ],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      complexity: 'off',
      'max-params': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'no-magic-numbers': 'off',
    },
  },

  // E2E tests and step definitions - relaxed rules
  {
    files: [
      '**/e2e/**/*.{ts,tsx}',
      '**/step_definitions/**/*.ts',
      '**/support/**/*.ts',
      'tests/**/*.ts',
    ],
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
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'max-depth': 'off',
      complexity: 'off',
      'max-statements': 'off',
      'max-params': 'off',
      'no-magic-numbers': 'off',
      curly: 'off',
    },
  },

  // Unit test files - very relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
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
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-statements': 'off',
      'max-params': 'off',
      'no-magic-numbers': 'off',
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
    files: ['ui/**/*.js', 'ui/**/*config.ts', 'ui/**/vite.config.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-magic-numbers': 'off',
      curly: 'off',
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
      'vibe-kanban/**', // Ignore vibe-kanban directory
      'tests/e2e/**/*', // Exclude Playwright e2e tests
      'tests/**/*.spec.ts', // Exclude all spec files in tests
    ],
  },
];
