#!/usr/bin/env tsx

/**
 * Script to populate the database with comprehensive BDD scenarios
 * for all user-facing features in CODEGOAT
 */

/* eslint-disable max-lines-per-function */

import { PrismaClient, BDDScenarioStatus, TaskType, TodoStatus, TodoPriority } from '@prisma/client';

const prisma = new PrismaClient();

interface ScenarioData {
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  taskId: string;
  playwrightTestFile?: string;
  playwrightTestName?: string;
}

const COMPREHENSIVE_BDD_SCENARIOS: ScenarioData[] = [
  // Analytics Module Scenarios
  {
    title: "View analytics dashboard overview",
    feature: "Analytics Dashboard",
    description: "User can view comprehensive analytics about validation runs and performance",
    taskId: "CODEGOAT-025-ANALYTICS-01",
    playwrightTestFile: "analytics.spec.ts",
    playwrightTestName: "should display analytics dashboard overview",
    gherkinContent: `
Feature: Analytics Dashboard
  As a developer using CODEGOAT
  I want to view comprehensive analytics about validation runs and performance
  So that I can monitor system health and optimize development workflows

  Scenario: View analytics dashboard overview
    Given I am logged into CODEGOAT
    And I have access to the Analytics dashboard
    And there is validation run data available
    When I navigate to the Analytics page
    Then I should see the analytics header with refresh functionality
    And I should see validation metrics summary
    And I should see recent validation runs
    And I should see time series charts for performance trends
    And I should see validation chart with stage-wise metrics
    `
  },
  {
    title: "Filter analytics by agent type",
    feature: "Analytics Dashboard", 
    description: "User can filter analytics data by specific agent types",
    taskId: "CODEGOAT-025-ANALYTICS-02",
    playwrightTestFile: "analytics.spec.ts",
    playwrightTestName: "should filter analytics by agent type",
    gherkinContent: `
Feature: Analytics Dashboard

  Scenario: Filter analytics by agent type
    Given I am on the Analytics page
    When I select "claude_cli" from the agent filter dropdown
    Then I should see analytics data filtered for claude_cli agent only
    And the metrics should update to reflect only claude_cli data
    And the charts should display claude_cli specific trends
    `
  },
  {
    title: "Access validation run details",
    feature: "Validation Run Details",
    description: "User can view detailed information about specific validation runs",
    taskId: "CODEGOAT-025-ANALYTICS-03",
    playwrightTestFile: "validation-runs.spec.ts",
    playwrightTestName: "should show validation run details",
    gherkinContent: `
Feature: Validation Run Details
  As a developer
  I want to view detailed information about specific validation runs
  So that I can analyze failures and optimize my development process

  Scenario: Access validation run details
    Given I am on the Analytics page
    When I click on a specific validation run from the recent runs list
    Then I should navigate to the validation run detail page
    And I should see the run ID and timestamp
    And I should see all validation stages with their status
    And I should see stage-wise execution times
    And I should see any error messages from failed stages
    `
  },

  // Task Management Module Scenarios
  {
    title: "View task board layout",
    feature: "Task Board Management",
    description: "User can view and interact with the kanban-style task board",
    taskId: "CODEGOAT-025-TASKS-01",
    playwrightTestFile: "task-board.spec.ts", 
    playwrightTestName: "should display task board layout",
    gherkinContent: `
Feature: Task Board Management
  As a project manager
  I want to manage tasks using a kanban-style board
  So that I can track project progress and organize work efficiently

  Scenario: View task board layout
    Given I am logged into CODEGOAT
    And I have access to the Task Board
    And there are existing tasks in different statuses
    When I navigate to the Tasks page
    Then I should see the task board with columns for different statuses
    And I should see "Pending", "In Progress", and "Completed" columns
    And I should see tasks distributed across the appropriate columns
    And I should see an "Add Task" button
    `
  },
  {
    title: "Create a new task",
    feature: "Task Board Management",
    description: "User can create new tasks with proper attributes",
    taskId: "CODEGOAT-025-TASKS-02",
    playwrightTestFile: "task-board.spec.ts",
    playwrightTestName: "should create new task",
    gherkinContent: `
Feature: Task Board Management

  Scenario: Create a new task
    Given I am on the Task Board page
    When I click the "Add Task" button
    Then I should see a task creation dialog
    When I fill in the task content "Implement user authentication"
    And I select priority "High"
    And I select task type "Story"
    And I click "Add Task"
    Then the task should be created in the Pending column
    And the dialog should close
    And I should see the new task on the board
    `
  },
  {
    title: "Story completion validation with BDD requirements",
    feature: "Task Board Management",
    description: "Story tasks must have BDD scenarios before completion",
    taskId: "CODEGOAT-025-TASKS-03",
    playwrightTestFile: "story-validation.spec.ts",
    playwrightTestName: "should prevent story completion without BDD scenarios", 
    gherkinContent: `
Feature: Task Board Management

  Scenario: Attempt to complete story without BDD scenarios
    Given I am on the Task Board page
    And there is a story task in "In Progress" with no BDD scenarios
    When I try to move the task to "Completed"
    Then I should see an error message about missing BDD scenarios
    And the task should remain in "In Progress"
    And I should be prompted to add BDD scenarios
    `
  },
  {
    title: "View basic task details",
    feature: "Task Detail Management",
    description: "User can view comprehensive information about individual tasks",
    taskId: "CODEGOAT-025-TASKS-04",
    playwrightTestFile: "task-detail.spec.ts",
    playwrightTestName: "should display task details",
    gherkinContent: `
Feature: Task Detail Management
  As a developer
  I want to view and manage detailed task information
  So that I can track task progress and manage associated resources

  Scenario: View basic task details
    Given I am on the Task Board page
    When I click on a task
    Then I should navigate to the task detail page
    And I should see the task content and description
    And I should see the task priority and status
    And I should see creation and update timestamps
    And I should see the task type (Task or Story)
    `
  },

  // Claude Workers Module Scenarios
  {
    title: "View workers dashboard overview",
    feature: "Claude Workers Dashboard",
    description: "User can monitor and manage Claude AI workers",
    taskId: "CODEGOAT-025-WORKERS-01",
    playwrightTestFile: "workers-dashboard.spec.ts",
    playwrightTestName: "should display workers dashboard",
    gherkinContent: `
Feature: Claude Workers Dashboard
  As a developer
  I want to manage and monitor Claude AI workers
  So that I can orchestrate automated development tasks

  Scenario: View workers dashboard overview
    Given I am logged into CODEGOAT
    And I have access to the Workers Dashboard
    And there may be active or completed workers in the system
    When I navigate to the Workers Dashboard
    Then I should see a list of all workers (active and completed)
    And I should see worker status indicators
    And I should see worker start times and durations
    And I should see the tasks each worker is executing
    And I should see worker performance metrics
    `
  },
  {
    title: "Start a new Claude worker",
    feature: "Claude Workers Dashboard",
    description: "User can start new workers to execute tasks",
    taskId: "CODEGOAT-025-WORKERS-02",
    playwrightTestFile: "workers-dashboard.spec.ts",
    playwrightTestName: "should start new worker",
    gherkinContent: `
Feature: Claude Workers Dashboard

  Scenario: Start a new Claude worker
    Given I am on the Workers Dashboard
    When I select a task from the task list
    And I click "Start Worker"
    Then a new Claude worker should be created
    And the worker should begin executing the selected task
    And I should see the worker appear in the active workers list
    And I should see real-time status updates
    `
  },
  {
    title: "View comprehensive worker details",
    feature: "Worker Detail Management",
    description: "User can view detailed information about specific workers",
    taskId: "CODEGOAT-025-WORKERS-03",
    playwrightTestFile: "worker-detail.spec.ts",
    playwrightTestName: "should show worker details",
    gherkinContent: `
Feature: Worker Detail Management
  As a developer
  I want to view detailed information about specific workers
  So that I can monitor progress and troubleshoot issues

  Scenario: View comprehensive worker details
    Given I am on the Workers Dashboard
    When I click on a specific worker
    Then I should navigate to the worker detail page
    And I should see the worker's task and status
    And I should see execution timeline and duration
    And I should see real-time or historical logs
    And I should see any validation runs performed
    `
  },

  // BDD Testing Module Scenarios
  {
    title: "View BDD scenarios overview",
    feature: "BDD Tests Dashboard",
    description: "User can manage BDD scenarios and their test coverage",
    taskId: "CODEGOAT-025-BDD-01",
    playwrightTestFile: "bdd-dashboard.spec.ts",
    playwrightTestName: "should display BDD scenarios overview",
    gherkinContent: `
Feature: BDD Tests Dashboard
  As a QA engineer
  I want to manage BDD scenarios and their test coverage
  So that I can ensure comprehensive testing of all features

  Scenario: View BDD scenarios overview
    Given I am logged into CODEGOAT
    And I have access to the BDD Tests Dashboard
    And there are BDD scenarios in the system
    When I navigate to the BDD Tests Dashboard
    Then I should see a list of all BDD scenarios
    And I should see their current execution status
    And I should see which scenarios are linked to Playwright tests
    And I should see test coverage statistics
    And I should see recent test execution results
    `
  },
  {
    title: "Create new BDD scenario",
    feature: "BDD Tests Dashboard",
    description: "User can create new BDD scenarios with proper Gherkin syntax",
    taskId: "CODEGOAT-025-BDD-02",
    playwrightTestFile: "bdd-dashboard.spec.ts",
    playwrightTestName: "should create new BDD scenario",
    gherkinContent: `
Feature: BDD Tests Dashboard

  Scenario: Create new BDD scenario
    Given I am on the BDD Tests Dashboard
    When I click "Add New Scenario"
    Then I should see a scenario creation form
    When I enter the scenario title "User can login with valid credentials"
    And I enter the Gherkin content with Given/When/Then steps
    And I associate it with a task
    And I click "Create Scenario"
    Then the scenario should be created successfully
    And it should appear in the scenarios list
    `
  },

  // Settings Module Scenarios
  {
    title: "View settings dashboard",
    feature: "System Settings Management",
    description: "Administrator can configure system settings and validation pipelines",
    taskId: "CODEGOAT-025-SETTINGS-01",
    playwrightTestFile: "settings.spec.ts",
    playwrightTestName: "should display settings dashboard",
    gherkinContent: `
Feature: System Settings Management
  As an administrator
  I want to configure system settings and validation pipelines
  So that I can customize CODEGOAT behavior and validation requirements

  Scenario: View settings dashboard
    Given I am logged into CODEGOAT
    And I have administrative access to settings
    When I navigate to the Settings page
    Then I should see different settings categories
    And I should see validation pipeline configuration
    And I should see fallback configuration options
    And I should see current system configuration
    `
  },
  {
    title: "Add new validation stage",
    feature: "System Settings Management",
    description: "Administrator can add new stages to the validation pipeline",
    taskId: "CODEGOAT-025-SETTINGS-02",
    playwrightTestFile: "settings.spec.ts",
    playwrightTestName: "should add new validation stage",
    gherkinContent: `
Feature: System Settings Management

  Scenario: Add new validation stage
    Given I am in the validation stages section
    When I click "Add New Stage"
    Then I should see a stage creation form
    When I enter stage name "Security Scan"
    And I enter the command "npm audit"
    And I set continue on failure to false
    And I click "Add Stage"
    Then the new stage should be added to the pipeline
    And it should be available for validation runs
    `
  },

  // Permissions Module Scenarios
  {
    title: "View permission rules",
    feature: "Permission Management",
    description: "Administrator can manage user permissions and access controls",
    taskId: "CODEGOAT-025-PERMISSIONS-01",
    playwrightTestFile: "permissions.spec.ts",
    playwrightTestName: "should display permission rules",
    gherkinContent: `
Feature: Permission Management
  As an administrator
  I want to manage user permissions and access controls
  So that I can secure the CODEGOAT system and control user access

  Scenario: View permission rules
    Given I am logged into CODEGOAT
    And I have administrative access to permission settings
    When I navigate to the Permissions page
    Then I should see a list of all permission rules
    And I should see rule types and targets
    And I should see rule priorities and effects
    And I should see which rules are active
    `
  },

  // Integration Scenarios
  {
    title: "Complete story development workflow",
    feature: "End-to-End Workflow Integration",
    description: "All modules work together in a complete development workflow",
    taskId: "CODEGOAT-025-INTEGRATION-01",
    playwrightTestFile: "integration-workflow.spec.ts",
    playwrightTestName: "should complete story development workflow",
    gherkinContent: `
Feature: End-to-End Workflow Integration
  As a user of CODEGOAT
  I want all modules to work together seamlessly
  So that I can have a complete development and testing workflow

  Scenario: Complete story development workflow
    Given I have a story task that needs development
    When I start a Claude worker for the task
    And the worker implements the required functionality
    And the worker creates appropriate BDD scenarios
    And the BDD scenarios are linked to Playwright tests
    And all tests pass successfully
    And validation pipeline completes successfully
    Then I should be able to complete the story task
    And all changes should be properly merged
    And the task should show as completed with full traceability
    `
  },

  // Error Handling Scenarios
  {
    title: "Handle validation failures gracefully",
    feature: "Error Handling and Recovery",
    description: "System handles errors gracefully and provides recovery options",
    taskId: "CODEGOAT-025-ERRORS-01",
    playwrightTestFile: "error-handling.spec.ts",
    playwrightTestName: "should handle validation failures gracefully",
    gherkinContent: `
Feature: Error Handling and Recovery
  As a user of CODEGOAT
  I want the system to handle errors gracefully
  So that I can recover from failures and continue working

  Scenario: Handle validation failures gracefully
    Given I have a validation run in progress
    When a validation stage fails
    Then I should see clear error messages
    And I should see suggested remediation steps
    And I should be able to retry the failed stage
    And the system should remain stable
    `
  }
];

// Create placeholder tasks for each module
const TASK_TEMPLATES = [
  {
    id: "CODEGOAT-025-ANALYTICS-01",
    content: "Analytics Dashboard - View comprehensive analytics overview",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-ANALYTICS-02", 
    content: "Analytics Dashboard - Filter by agent type functionality",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-ANALYTICS-03",
    content: "Validation Run Details - View detailed run information",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-TASKS-01",
    content: "Task Board - Kanban-style task management interface",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-TASKS-02",
    content: "Task Board - Task creation and management functionality",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-TASKS-03",
    content: "Task Board - Story completion validation with BDD requirements",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-TASKS-04",
    content: "Task Detail - Comprehensive task information display",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-WORKERS-01",
    content: "Claude Workers Dashboard - Worker monitoring and management",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-WORKERS-02",
    content: "Claude Workers Dashboard - Worker creation and orchestration",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-WORKERS-03",
    content: "Worker Detail - Detailed worker information and logs",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-BDD-01",
    content: "BDD Tests Dashboard - BDD scenario management interface",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-BDD-02",
    content: "BDD Tests Dashboard - BDD scenario creation and editing",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-SETTINGS-01",
    content: "Settings - System configuration management interface",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-SETTINGS-02",
    content: "Settings - Validation pipeline configuration",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-PERMISSIONS-01",
    content: "Permissions - Access control and security management",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-INTEGRATION-01",
    content: "Integration - End-to-end workflow functionality",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  },
  {
    id: "CODEGOAT-025-ERRORS-01",
    content: "Error Handling - Graceful error recovery and user feedback",
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    status: TodoStatus.PENDING
  }
];

async function main() {
  try {
    console.log('🚀 Starting comprehensive BDD scenarios population...');

    // First, create all the placeholder tasks
    console.log('\n📝 Creating placeholder tasks for BDD scenarios...');
    
    for (const taskTemplate of TASK_TEMPLATES) {
      try {
        // Check if task already exists
        const existingTask = await prisma.todoTask.findUnique({
          where: { id: taskTemplate.id }
        });

        if (!existingTask) {
          await prisma.todoTask.create({
            data: taskTemplate
          });
          console.log(`   ✅ Created task: ${taskTemplate.id}`);
        } else {
          console.log(`   ⏭️  Task already exists: ${taskTemplate.id}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating task ${taskTemplate.id}:`, error);
      }
    }

    // Now create all the BDD scenarios
    console.log('\n🎭 Creating comprehensive BDD scenarios...');
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const scenario of COMPREHENSIVE_BDD_SCENARIOS) {
      try {
        // Check if scenario already exists
        const existingScenario = await prisma.bDDScenario.findFirst({
          where: {
            title: scenario.title,
            todoTaskId: scenario.taskId
          }
        });

        if (!existingScenario) {
          await prisma.bDDScenario.create({
            data: {
              title: scenario.title,
              feature: scenario.feature,
              description: scenario.description,
              gherkinContent: scenario.gherkinContent.trim(),
              status: BDDScenarioStatus.PENDING,
              todoTaskId: scenario.taskId,
              playwrightTestFile: scenario.playwrightTestFile || null,
              playwrightTestName: scenario.playwrightTestName || null,
            }
          });
          
          createdCount++;
          console.log(`   ✅ Created BDD scenario: ${scenario.title}`);
        } else {
          skippedCount++;
          console.log(`   ⏭️  BDD scenario already exists: ${scenario.title}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating BDD scenario "${scenario.title}":`, error);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   📝 Tasks processed: ${TASK_TEMPLATES.length}`);
    console.log(`   🎭 BDD scenarios created: ${createdCount}`);
    console.log(`   ⏭️  BDD scenarios skipped (already exist): ${skippedCount}`);
    console.log(`   📈 Total BDD scenarios: ${COMPREHENSIVE_BDD_SCENARIOS.length}`);

    // Verify the data
    console.log('\n🔍 Verifying data...');
    const totalTasks = await prisma.todoTask.count({
      where: {
        id: {
          startsWith: 'CODEGOAT-025-'
        }
      }
    });
    
    const totalScenarios = await prisma.bDDScenario.count({
      where: {
        todoTask: {
          id: {
            startsWith: 'CODEGOAT-025-'
          }
        }
      }
    });

    const linkedScenarios = await prisma.bDDScenario.count({
      where: {
        todoTask: {
          id: {
            startsWith: 'CODEGOAT-025-'
          }
        },
        AND: [
          { playwrightTestFile: { not: null } },
          { playwrightTestName: { not: null } }
        ]
      }
    });

    console.log(`   📋 Total CODEGOAT-025 tasks in database: ${totalTasks}`);
    console.log(`   🎭 Total CODEGOAT-025 BDD scenarios in database: ${totalScenarios}`);
    console.log(`   🔗 Linked scenarios: ${linkedScenarios}`);
    console.log(`   📊 Coverage: ${totalScenarios > 0 ? ((linkedScenarios / totalScenarios) * 100).toFixed(1) : 0}%`);

    console.log('\n✅ Comprehensive BDD scenarios population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during BDD scenarios population:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { COMPREHENSIVE_BDD_SCENARIOS, TASK_TEMPLATES };