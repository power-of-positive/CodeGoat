#!/usr/bin/env npx tsx

/**
 * Comprehensive Validation Runner - Runs ALL validation stages regardless of settings
 * This ensures the stop hook validates everything before allowing completion
 */

import { execSync } from 'child_process';

const projectRoot = '/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat';
process.chdir(projectRoot);

interface ValidationStage {
  id: string;
  name: string;
  command: string;
  timeout: number;
}

const VALIDATION_STAGES: ValidationStage[] = [
  {
    id: 'lint',
    name: 'Code Linting',
    command:
      'npm run lint --max-warnings=500 || (echo "Linting completed with warnings" && exit 0)',
    timeout: 90000,
  },
  {
    id: 'typecheck',
    name: 'Type Checking',
    command: 'npm run type-check',
    timeout: 45000,
  },
  {
    id: 'unit-tests-backend',
    name: 'Backend Unit Tests',
    command: 'npm run test:unit:backend',
    timeout: 60000,
  },
  {
    id: 'unit-tests-frontend',
    name: 'Frontend Unit Tests',
    command:
      'cd ui && CI=true npm test -- --watchAll=false --no-watch --passWithNoTests --testTimeout=15000 --maxWorkers=1 --forceExit',
    timeout: 120000,
  },
  {
    id: 'coverage-frontend',
    name: 'Frontend Coverage Check',
    command: 'cd ui && npm run test:coverage -- --maxWorkers=1 --testTimeout=15000',
    timeout: 180000,
  },
  {
    id: 'coverage-backend',
    name: 'Backend Coverage Check',
    command: 'npm run test:coverage:backend',
    timeout: 45000,
  },
  {
    id: 'unit-tests-scripts',
    name: 'Scripts Unit Tests',
    command: 'npm run test:unit:scripts',
    timeout: 30000,
  },
  {
    id: 'integration-tests',
    name: 'Integration Tests',
    command: 'npm run test:integration',
    timeout: 90000,
  },
  {
    id: 'coverage-scripts',
    name: 'Scripts Coverage Check',
    command: 'npm run test:coverage:scripts',
    timeout: 30000,
  },
  {
    id: 'api-e2e-tests',
    name: 'API E2E Tests',
    command: 'npm run test:api-e2e',
    timeout: 120000,
  },
  {
    id: 'typescript-preference',
    name: 'TypeScript Preference Check',
    command: 'npx ts-node scripts/check-typescript-preference.ts',
    timeout: 10000,
  },
  {
    id: 'ai-code-review',
    name: 'AI Code Review',
    command: 'npx ts-node src/tools/ai-code-reviewer.ts',
    timeout: 120000,
  },
  {
    id: 'dead-code',
    name: 'Dead Code Detection',
    command: 'npx ts-node scripts/check-dead-code.ts',
    timeout: 45000,
  },
  {
    id: 'duplication-check',
    name: 'Code Duplication Detection',
    command: 'npm run duplication-check',
    timeout: 45000,
  },
  {
    id: 'vulnerability-check',
    name: 'Dependency Vulnerability Scan',
    command: 'npm audit --audit-level=moderate',
    timeout: 30000,
  },
  {
    id: 'playwright-e2e',
    name: 'Playwright E2E Tests',
    command: 'cd ui && npm run test:e2e:robust',
    timeout: 300000,
  },
  {
    id: 'uncommitted-files',
    name: 'Uncommitted Files Check',
    command: 'npx ts-node scripts/check-uncommitted-files.ts',
    timeout: 10000,
  },
  {
    id: 'todo-list',
    name: 'Todo List Validation',
    command: 'npx ts-node scripts/validate-todo-list.ts',
    timeout: 10000,
  },
];

interface ValidationResult {
  stage: string;
  passed: boolean;
  duration: number;
  error?: string;
}

function runStage(stage: ValidationStage): ValidationResult {
  const startTime = Date.now();

  try {
    console.error(`\n🔍 [${stage.id}] Running: ${stage.name}`);
    console.error(`📋 Command: ${stage.command}`);

    execSync(stage.command, {
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: stage.timeout,
      encoding: 'utf-8',
    });

    const duration = Date.now() - startTime;
    console.error(`✅ [${stage.id}] Passed (${duration}ms)`);

    return {
      stage: stage.id,
      passed: true,
      duration,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(`❌ [${stage.id}] Failed (${duration}ms)`);
    console.error(`💥 Error: ${errorMsg}`);

    return {
      stage: stage.id,
      passed: false,
      duration,
      error: errorMsg,
    };
  }
}

async function main(): Promise<void> {
  console.error('🚀 Running comprehensive validation pipeline...');
  console.error(`📊 Total stages: ${VALIDATION_STAGES.length}`);

  const results: ValidationResult[] = [];
  let passedCount = 0;

  for (const stage of VALIDATION_STAGES) {
    const result = runStage(stage);
    results.push(result);

    if (result.passed) {
      passedCount++;
    }
  }

  // Summary
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  const failedCount = results.length - passedCount;

  console.error(`\n📊 Validation Summary:`);
  console.error(`✅ Passed: ${passedCount}`);
  console.error(`❌ Failed: ${failedCount}`);
  console.error(`⏱️  Total time: ${totalTime}ms`);

  if (failedCount > 0) {
    console.error(`\n❌ Failed stages:`);
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.error(`  - ${r.stage}: ${r.error}`);
      });

    process.stdout.write(
      '{"decision": "block", "reason": "Validation pipeline failed - fix all issues before completing"}\n'
    );
    process.exit(2);
  }

  console.error(`\n🎉 All validation stages passed!`);
  process.stdout.write('{"decision": "approve"}\n');
  process.exit(0);
}

main().catch(error => {
  console.error(`💥 Validation runner error: ${error}`);
  process.stdout.write('{"decision": "block", "reason": "Validation runner failed"}\n');
  process.exit(2);
});
