#!/usr/bin/env npx ts-node

/**
 * Script to sync all tasks from todo-list.json to the database with BDD scenarios
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient, TodoStatus, TodoPriority, BDDScenarioStatus } from '@prisma/client';

interface TodoTask {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime?: string;
  endTime?: string;
  duration?: string;
}

const prisma = new PrismaClient();

// Status mapping
const statusMapping: Record<string, TodoStatus> = {
  pending: TodoStatus.PENDING,
  in_progress: TodoStatus.IN_PROGRESS,
  completed: TodoStatus.COMPLETED,
};

const priorityMapping: Record<string, TodoPriority> = {
  low: TodoPriority.LOW,
  medium: TodoPriority.MEDIUM,
  high: TodoPriority.HIGH,
};

function createBugFixScenario(task: TodoTask) {
  return {
    title: `Fix Implementation Verification`,
    feature: 'Bug Fix Validation',
    description: `Verify that the fix for "${task.content}" works correctly`,
    gherkinContent: `Feature: Bug Fix Validation
  As a developer
  I want to ensure the bug fix works correctly
  So that the system operates as expected

Scenario: Verify fix implementation
  Given the system has the reported issue
  When the fix is implemented
  Then the issue should be resolved
  And no new issues should be introduced

Scenario: Regression testing
  Given the fix is implemented
  When I run related functionality
  Then existing features should continue to work
  And no performance degradation should occur`,
    status: task.status === 'completed' ? BDDScenarioStatus.PASSED : BDDScenarioStatus.PENDING,
  };
}

function createTestCoverageScenario(task: TodoTask) {
  return {
    title: `Test Coverage Verification`,
    feature: 'Test Quality Assurance',
    description: `Ensure adequate test coverage for "${task.content}"`,
    gherkinContent: `Feature: Test Coverage Assurance
  As a quality engineer
  I want to ensure adequate test coverage
  So that the code is well-tested and maintainable

Scenario: Coverage threshold verification
  Given the codebase has test files
  When I run the test coverage analysis
  Then the coverage should meet or exceed the required threshold
  And all critical paths should be tested

Scenario: Test execution verification
  Given the test suite exists
  When I run all tests
  Then all tests should pass
  And no tests should be skipped or ignored`,
    status: task.status === 'completed' ? BDDScenarioStatus.PASSED : BDDScenarioStatus.PENDING,
  };
}

function createUIScenario(task: TodoTask) {
  return {
    title: `UI Component Functionality`,
    feature: 'User Interface',
    description: `Verify UI functionality for "${task.content}"`,
    gherkinContent: `Feature: User Interface Functionality
  As a user
  I want the UI to work correctly
  So that I can accomplish my tasks efficiently

Scenario: Component rendering
  Given I am on the relevant page
  When the component loads
  Then it should render correctly
  And all elements should be visible

Scenario: User interaction
  Given the component is rendered
  When I interact with the UI elements
  Then the interactions should work as expected
  And the system should respond appropriately`,
    status: task.status === 'completed' ? BDDScenarioStatus.PASSED : BDDScenarioStatus.PENDING,
  };
}

function createAPIScenario(task: TodoTask) {
  return {
    title: `API Functionality Verification`,
    feature: 'API Integration',
    description: `Verify API functionality for "${task.content}"`,
    gherkinContent: `Feature: API Functionality
  As an API consumer
  I want the endpoints to work correctly
  So that I can integrate with the system

Scenario: API endpoint availability
  Given the API server is running
  When I make a request to the endpoint
  Then I should receive a valid response
  And the response should contain expected data

Scenario: CRUD operations
  Given the API endpoint exists
  When I perform create, read, update, and delete operations
  Then each operation should work correctly
  And data should be persisted appropriately`,
    status: task.status === 'completed' ? BDDScenarioStatus.PASSED : BDDScenarioStatus.PENDING,
  };
}

function createValidationScenario(task: TodoTask) {
  return {
    title: `Validation Process Verification`,
    feature: 'Code Quality',
    description: `Verify validation processes for "${task.content}"`,
    gherkinContent: `Feature: Code Quality Validation
  As a developer
  I want validation processes to work correctly
  So that code quality is maintained

Scenario: Validation execution
  Given the validation system is configured
  When I run the validation process
  Then it should complete successfully
  And provide meaningful feedback

Scenario: Error detection
  Given there are code quality issues
  When I run the validation
  Then issues should be detected and reported
  And the process should fail appropriately`,
    status: task.status === 'completed' ? BDDScenarioStatus.PASSED : BDDScenarioStatus.PENDING,
  };
}

function createGenericScenario(task: TodoTask) {
  return {
    title: `Task Implementation Verification`,
    feature: 'General Task Completion',
    description: `Verify implementation of "${task.content}"`,
    gherkinContent: `Feature: Task Implementation
  As a stakeholder
  I want tasks to be implemented correctly
  So that project goals are achieved

Scenario: Task completion verification
  Given the task requirements are understood
  When the task is implemented
  Then the implementation should meet the requirements
  And the solution should be tested and verified

Scenario: Integration verification
  Given the task is completed
  When it integrates with the existing system
  Then it should work seamlessly
  And not break existing functionality`,
    status: task.status === 'completed' ? BDDScenarioStatus.PASSED : BDDScenarioStatus.PENDING,
  };
}

function generateBDDScenarios(task: TodoTask): Array<{
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  status: BDDScenarioStatus;
}> {
  const taskContent = task.content.toLowerCase();
  const scenarios = [];

  // Generate different types of BDD scenarios based on task content
  if (taskContent.includes('fix') || taskContent.includes('bug')) {
    scenarios.push(createBugFixScenario(task));
  }

  if (taskContent.includes('test') || taskContent.includes('coverage')) {
    scenarios.push(createTestCoverageScenario(task));
  }

  if (
    taskContent.includes('ui') ||
    taskContent.includes('page') ||
    taskContent.includes('component')
  ) {
    scenarios.push(createUIScenario(task));
  }

  if (
    taskContent.includes('api') ||
    taskContent.includes('endpoint') ||
    taskContent.includes('crud')
  ) {
    scenarios.push(createAPIScenario(task));
  }

  if (
    taskContent.includes('validation') ||
    taskContent.includes('check') ||
    taskContent.includes('lint')
  ) {
    scenarios.push(createValidationScenario(task));
  }

  // If no specific scenarios were generated, create a generic one
  if (scenarios.length === 0) {
    scenarios.push(createGenericScenario(task));
  }

  return scenarios;
}

interface DbTask {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

async function loadTodoData(): Promise<{
  todoData: TodoTask[];
  existingTasks: DbTask[];
  existingTaskIds: Set<string>;
}> {
  // Read todo-list.json
  const todoListPath = path.join(process.cwd(), 'todo-list.json');
  if (!fs.existsSync(todoListPath)) {
    console.error('❌ todo-list.json not found');
    process.exit(1);
  }

  const todoData = JSON.parse(fs.readFileSync(todoListPath, 'utf8')) as TodoTask[];
  console.log(`📋 Found ${todoData.length} tasks in todo-list.json`);

  // Get existing tasks from database
  const existingTasks = await prisma.todoTask.findMany();
  const existingTaskIds = new Set(existingTasks.map(task => task.id));
  console.log(`💾 Found ${existingTasks.length} existing tasks in database`);

  return { todoData, existingTasks, existingTaskIds };
}

async function syncSingleTask(
  task: TodoTask
): Promise<{ syncedTasks: number; createdScenarios: number }> {
  // Parse start and end times
  let startTime: Date | undefined;
  let endTime: Date | undefined;

  if (task.startTime) {
    startTime = new Date(task.startTime);
  }

  if (task.endTime) {
    endTime = new Date(task.endTime);
  }

  // Create task in database
  const dbTask = await prisma.todoTask.create({
    data: {
      id: task.id,
      content: task.content,
      status: statusMapping[task.status],
      priority: priorityMapping[task.priority],
      startTime,
      endTime,
      duration: task.duration,
      createdAt: startTime || new Date(),
      updatedAt: endTime || new Date(),
    },
  });

  console.log(`✅ Synced task ${task.id}: ${task.content.substring(0, 50)}...`);

  // Generate and create BDD scenarios
  const scenarios = generateBDDScenarios(task);
  let createdScenarios = 0;

  for (const scenarioData of scenarios) {
    await prisma.bDDScenario.create({
      data: {
        title: scenarioData.title,
        feature: scenarioData.feature,
        description: scenarioData.description,
        gherkinContent: scenarioData.gherkinContent,
        status: scenarioData.status,
        todoTaskId: dbTask.id,
        createdAt: dbTask.createdAt,
        updatedAt: dbTask.updatedAt,
      },
    });
    createdScenarios++;
  }

  console.log(`  📝 Created ${scenarios.length} BDD scenarios for task ${task.id}`);
  return { syncedTasks: 1, createdScenarios };
}

async function printSyncResults(
  todoData: TodoTask[],
  existingTasks: DbTask[],
  syncedTasks: number,
  createdScenarios: number
) {
  console.log('\n🎉 Sync completed!');
  console.log(`📊 Statistics:`);
  console.log(`  - Total tasks in todo-list.json: ${todoData.length}`);
  console.log(`  - Existing tasks in database: ${existingTasks.length}`);
  console.log(`  - New tasks synced: ${syncedTasks}`);
  console.log(`  - BDD scenarios created: ${createdScenarios}`);

  // Verify the sync
  const finalTaskCount = await prisma.todoTask.count();
  const finalScenarioCount = await prisma.bDDScenario.count();

  console.log(`\n✅ Final verification:`);
  console.log(`  - Total tasks in database: ${finalTaskCount}`);
  console.log(`  - Total BDD scenarios in database: ${finalScenarioCount}`);
}

async function syncTodoToDatabase() {
  try {
    console.log('🔄 Starting todo-list.json to database sync...');

    const { todoData, existingTasks, existingTaskIds } = await loadTodoData();

    let syncedTasks = 0;
    let createdScenarios = 0;

    for (const task of todoData) {
      if (existingTaskIds.has(task.id)) {
        console.log(`⏭️  Skipping existing task ${task.id}: ${task.content.substring(0, 50)}...`);
        continue;
      }

      const { syncedTasks: newSynced, createdScenarios: newScenarios } = await syncSingleTask(task);
      syncedTasks += newSynced;
      createdScenarios += newScenarios;
    }

    await printSyncResults(todoData, existingTasks, syncedTasks, createdScenarios);
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncTodoToDatabase().catch(console.error);
