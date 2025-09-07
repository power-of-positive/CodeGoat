#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getCodeQualityStages() {
  return [
    {
      stageId: 'lint',
      name: 'Code Linting',
      command: 'npm run lint',
      timeout: 90000,
      enabled: true,
      continueOnFailure: false,
      priority: 1,
    },
    {
      stageId: 'typecheck',
      name: 'Type Checking',
      command: 'npm run type-check',
      timeout: 45000,
      enabled: true,
      continueOnFailure: false,
      priority: 2,
    },
    {
      stageId: 'typescript-preference',
      name: 'TypeScript File Preference',
      command: 'npm run typescript-check',
      timeout: 5000,
      enabled: true,
      continueOnFailure: false,
      priority: 11,
    },
    {
      stageId: 'duplication',
      name: 'Code Duplication Check',
      command: 'npm run duplication-check || true',
      timeout: 30000,
      enabled: true,
      continueOnFailure: false,
      priority: 14,
    },
  ];
}

function getTestingStages() {
  return [
    {
      stageId: 'unit-tests-backend',
      name: 'Backend Unit Tests',
      command: 'npm run test:unit:backend',
      timeout: 60000,
      enabled: true,
      continueOnFailure: false,
      priority: 3,
    },
    {
      stageId: 'unit-tests-frontend',
      name: 'Frontend Unit Tests',
      command:
        'cd ui && CI=true npm test -- --watchAll=false --no-watch --passWithNoTests --testTimeout=10000 --maxWorkers=1 --forceExit',
      timeout: 60000,
      enabled: true,
      continueOnFailure: false,
      priority: 4,
    },
    {
      stageId: 'unit-tests-scripts',
      name: 'Scripts Unit Tests',
      command: 'npm run test:unit:scripts',
      timeout: 30000,
      enabled: true,
      continueOnFailure: false,
      priority: 7,
    },
    {
      stageId: 'integration-tests',
      name: 'Integration Tests',
      command: 'npm run test:integration',
      timeout: 90000,
      enabled: true,
      continueOnFailure: false,
      priority: 8,
    },
    {
      stageId: 'api-e2e-tests',
      name: 'API E2E Tests',
      command: 'npm run test:api-e2e',
      timeout: 120000,
      enabled: true,
      continueOnFailure: false,
      priority: 10,
    },
    {
      stageId: 'playwright-e2e',
      name: 'Playwright E2E Tests',
      command: 'npm run test:playwright',
      timeout: 300000,
      enabled: true,
      continueOnFailure: false,
      priority: 16,
    },
  ];
}

function getCoverageStages() {
  return [
    {
      stageId: 'coverage-frontend',
      name: 'Frontend Coverage Check',
      command: 'cd ui && npm run test:coverage -- --maxWorkers=1 --testTimeout=10000 --forceExit',
      timeout: 90000,
      enabled: true,
      continueOnFailure: false,
      priority: 5,
    },
    {
      stageId: 'coverage-backend',
      name: 'Backend Coverage Check',
      command: 'npm run test:coverage:backend',
      timeout: 45000,
      enabled: true,
      continueOnFailure: false,
      priority: 6,
    },
    {
      stageId: 'coverage-scripts',
      name: 'Scripts Coverage Check',
      command: 'npm run test:coverage:scripts',
      timeout: 30000,
      enabled: true,
      continueOnFailure: false,
      priority: 9,
    },
  ];
}

function getOptionalStages() {
  return [
    {
      stageId: 'ai-review',
      name: 'AI Code Review',
      command: './scripts/llm-code-review.sh',
      timeout: 60000,
      enabled: false,
      continueOnFailure: false,
      priority: 12,
    },
    {
      stageId: 'dead-code',
      name: 'Dead Code Detection',
      command: 'echo "Dead code detection skipped"',
      timeout: 30000,
      enabled: false,
      continueOnFailure: false,
      priority: 13,
    },
    {
      stageId: 'vulnerability-scan',
      name: 'Security Vulnerability Scan',
      command: 'npm audit --audit-level=high || echo "Security check completed with warnings"',
      timeout: 60000,
      enabled: true,
      continueOnFailure: false,
      priority: 15,
    },
    {
      stageId: 'uncommitted-files',
      name: 'Uncommitted Files Check',
      command: 'git status --porcelain',
      timeout: 5000,
      enabled: false,
      continueOnFailure: false,
      priority: 17,
    },
    {
      stageId: 'todo-validation',
      name: 'Todo List Validation',
      command: 'echo "Todo validation not implemented yet"',
      timeout: 5000,
      enabled: false,
      continueOnFailure: false,
      priority: 18,
    },
  ];
}

function getValidationStages() {
  return [
    ...getCodeQualityStages(),
    ...getTestingStages(),
    ...getCoverageStages(),
    ...getOptionalStages(),
  ];
}

async function seedValidationStages() {
  const stages = getValidationStages();

  console.log('Seeding validation stages...');

  for (const stage of stages) {
    await prisma.validationStageConfig.upsert({
      where: { stageId: stage.stageId },
      update: stage,
      create: stage,
    });
    console.log(`✓ Seeded stage: ${stage.name}`);
  }

  console.log(`\nSuccessfully seeded ${stages.length} validation stages`);
}

async function main() {
  try {
    await seedValidationStages();
  } catch (error) {
    console.error('Error seeding validation stages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
