#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BDDScenarioData {
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  taskId: string;
}

/**
 * Comprehensive BDD scenarios for all CODEGOAT tasks
 * Based on BDD_SPECIFICATIONS.feature file
 */
const bddScenarios: BDDScenarioData[] = [
  // CODEGOAT-001: Audit and link existing BDD scenarios to Playwright tests via cucumber
  {
    taskId: 'CODEGOAT-001',
    title: 'View current BDD scenario coverage',
    feature: 'BDD Scenario Audit and Linking',
    description: 'Users should be able to view all BDD scenarios and their test coverage status',
    gherkinContent: `Feature: BDD Scenario Audit and Linking
  As a QA engineer
  I want to audit existing BDD scenarios and link them to Playwright tests via Cucumber
  So that I can ensure complete test coverage and traceability

  Scenario: View current BDD scenario coverage
    When I navigate to the BDD Tests Dashboard
    Then I should see a list of all BDD scenarios
    And I should see their current status (pending, passed, failed, skipped)
    And I should see which scenarios are linked to Playwright tests
    And I should see which scenarios have no test coverage`,
  },
  {
    taskId: 'CODEGOAT-001',
    title: 'Discover unlinked BDD scenarios',
    feature: 'BDD Scenario Audit and Linking',
    description: 'Users should be able to filter and identify BDD scenarios without test coverage',
    gherkinContent: `Scenario: Discover unlinked BDD scenarios
    Given I am on the BDD Tests Dashboard
    When I filter by "Unlinked scenarios"
    Then I should see all BDD scenarios without associated Playwright tests
    And I should see a "Link to Test" button for each unlinked scenario
    And I should see the scenario's gherkin content`,
  },
  {
    taskId: 'CODEGOAT-001',
    title: 'Link BDD scenario to existing Playwright test',
    feature: 'BDD Scenario Audit and Linking',
    description: 'Users should be able to link BDD scenarios to specific Playwright tests',
    gherkinContent: `Scenario: Link BDD scenario to existing Playwright test
    Given I have an unlinked BDD scenario "User login functionality"
    And I have a Playwright test file "auth.spec.ts" with test "should login successfully"
    When I click "Link to Test" for the scenario
    And I select the test file "auth.spec.ts"
    And I select the test "should login successfully"
    And I click "Create Link"
    Then the scenario should be marked as linked
    And I should see the test file path in the scenario details
    And the link should be saved to the database`,
  },

  // CODEGOAT-014: Switching across agents in analytics page does not change the data displayed
  {
    taskId: 'CODEGOAT-014',
    title: 'View available agent options',
    feature: 'Agent Analytics Data Filtering',
    description: 'Users should see all available agents in the analytics dropdown',
    gherkinContent: `Feature: Agent Analytics Data Filtering
  As a developer
  I want to switch between different agents in the analytics page
  So that I can view agent-specific analytics data

  Scenario: View available agent options
    When I look at the agent selector dropdown
    Then I should see "claude_cli" as an option
    And I should see "gemini_cli" as an option
    And I should see "cursor_cli" as an option
    And I should see "All Agents" as an option`,
  },
  {
    taskId: 'CODEGOAT-014',
    title: 'Switch to Claude CLI agent data',
    feature: 'Agent Analytics Data Filtering',
    description: 'Users should be able to filter analytics data by Claude CLI agent',
    gherkinContent: `Scenario: Switch to Claude CLI agent data
    Given the default "All Agents" is selected
    When I select "claude_cli" from the agent dropdown
    Then the analytics data should update to show only Claude CLI results
    And the summary cards should reflect Claude CLI metrics
    And the charts should update with Claude CLI data points
    And the recent runs list should show only Claude CLI runs`,
  },

  // CODEGOAT-015: Add task editing functionality to the tasks board
  {
    taskId: 'CODEGOAT-015',
    title: 'Open task edit modal',
    feature: 'Task Editing on Tasks Board',
    description: 'Users should be able to open edit modal for tasks',
    gherkinContent: `Feature: Task Editing on Tasks Board
  As a project manager
  I want to edit tasks directly on the tasks board
  So that I can quickly update task details without navigating away

  Scenario: Open task edit modal
    Given I have a task "Implement user authentication" in the pending column
    When I click the edit icon on the task card
    Then a task edit modal should open
    And the modal should display the current task details
    And I should see fields for title, description, priority, and status
    And the save and cancel buttons should be available`,
  },
  {
    taskId: 'CODEGOAT-015',
    title: 'Edit task title and description',
    feature: 'Task Editing on Tasks Board',
    description: 'Users should be able to modify task title and description',
    gherkinContent: `Scenario: Edit task title and description
    Given I have opened the edit modal for a task
    When I change the title to "Implement OAuth authentication"
    And I update the description to "Add OAuth login with Google and GitHub providers"
    And I click "Save Changes"
    Then the modal should close
    And the task card should display the updated title
    And the task should be saved to the database
    And I should see a success notification`,
  },
  {
    taskId: 'CODEGOAT-015',
    title: 'Add BDD scenarios to a story task',
    feature: 'Task Editing on Tasks Board',
    description: 'Users should be able to add BDD scenarios to story type tasks',
    gherkinContent: `Scenario: Add BDD scenarios to a story task
    Given I have a task marked as type "story"
    When I open the edit modal
    And I navigate to the "BDD Scenarios" tab
    And I click "Add Scenario"
    And I enter scenario title "User logs in successfully"
    And I enter the Gherkin content
    And I click "Save Scenario"
    Then the scenario should be added to the task
    And the task card should show the scenario count
    And the scenario should be available for linking to tests`,
  },

  // CODEGOAT-017: Reorganise folder structure of the files
  {
    taskId: 'CODEGOAT-017',
    title: 'Verify new pages folder structure',
    feature: 'Folder Structure Reorganization',
    description: 'Page components should be organized in a dedicated pages folder',
    gherkinContent: `Feature: Folder Structure Reorganization
  As a developer
  I want the codebase to have a well-organized folder structure
  So that code is easy to find, maintain, and understand

  Scenario: Verify new pages folder structure
    When I examine the frontend folder structure
    Then I should see a "pages" folder containing all page components
    And I should see pages like AnalyticsPage, DashboardPage, SettingsPage are in the pages folder
    And page files should follow naming convention *Page.tsx
    And page components should not be mixed with reusable components`,
  },

  // CODEGOAT-018: Increase test coverage to 90%
  {
    taskId: 'CODEGOAT-018',
    title: 'View current test coverage baseline',
    feature: 'Achieve 90% Test Coverage',
    description: 'Users should be able to view current test coverage metrics',
    gherkinContent: `Feature: Achieve 90% Test Coverage
  As a developer
  I want to achieve 90% test coverage across the codebase
  So that I can ensure code quality and reduce bugs

  Scenario: View current test coverage baseline
    When I run the test coverage command
    Then I should see the current coverage percentage for the entire codebase
    And I should see coverage broken down by file and folder
    And I should see lines, branches, and functions coverage
    And I should see which files have the lowest coverage`,
  },

  // CODEGOAT-019: Tighten eslint rules to improve quality
  {
    taskId: 'CODEGOAT-019',
    title: 'Configure strict TypeScript ESLint rules',
    feature: 'Enhanced ESLint Configuration for Code Quality',
    description: 'ESLint should be configured with strict TypeScript rules',
    gherkinContent: `Feature: Enhanced ESLint Configuration for Code Quality
  As a developer
  I want stricter ESLint rules
  So that code quality and consistency are maintained across the codebase

  Scenario: Configure strict TypeScript ESLint rules
    When I update the ESLint configuration
    Then I should enable @typescript-eslint/strict rules
    And I should require explicit return types for functions
    And I should disallow 'any' types without comments
    And I should enforce consistent naming conventions`,
  },

  // CODEGOAT-022: Add task duration charts and time range filters
  {
    taskId: 'CODEGOAT-022',
    title: 'View task duration overview chart',
    feature: 'Task Duration Analytics with Time Range Filtering',
    description: 'Users should see task duration analytics with filtering options',
    gherkinContent: `Feature: Task Duration Analytics with Time Range Filtering
  As a project manager
  I want to view task duration charts with time range filters
  So that I can analyze task completion patterns and optimize workflows

  Scenario: View task duration overview chart
    When I navigate to the Task Analytics page
    Then I should see a task duration chart showing average completion times
    And I should see tasks grouped by priority (high, medium, low)
    And I should see duration data for the last 30 days by default
    And I should see both individual task durations and averages`,
  },
  {
    taskId: 'CODEGOAT-022',
    title: 'Apply 7-day time range filter',
    feature: 'Task Duration Analytics with Time Range Filtering',
    description: 'Users should be able to filter task duration data by time range',
    gherkinContent: `Scenario: Apply 7-day time range filter
    Given I am viewing the task analytics
    When I select "7 days" from the time range filter
    Then all charts should update to show only data from the last 7 days
    And I should see task duration trends for the past week
    And the summary metrics should reflect the 7-day period
    And the URL should update to reflect the selected time range`,
  },

  // CODEGOAT-024: Add BDD test coverage reporting
  {
    taskId: 'CODEGOAT-024',
    title: 'View BDD test coverage overview',
    feature: 'BDD Test Coverage Analysis',
    description: 'Users should see overall BDD coverage statistics',
    gherkinContent: `Feature: BDD Test Coverage Analysis
  As a QA lead
  I want to track what percentage of BDD scenarios have associated Playwright tests
  So that I can ensure complete test automation coverage

  Scenario: View BDD test coverage overview
    When I navigate to the Test Coverage tab
    Then I should see the overall BDD coverage percentage
    And I should see total number of BDD scenarios
    And I should see number of scenarios with linked Playwright tests
    And I should see number of scenarios without test coverage`,
  },
  {
    taskId: 'CODEGOAT-024',
    title: 'View coverage breakdown by feature',
    feature: 'BDD Test Coverage Analysis',
    description: 'Users should see coverage metrics broken down by feature area',
    gherkinContent: `Scenario: View coverage breakdown by feature
    When I view the coverage by feature section
    Then I should see each feature listed with its coverage percentage
    And I should see features sorted by lowest coverage first
    And I should see number of scenarios per feature
    And I should be able to click on a feature to see its scenarios`,
  },

  // CODEGOAT-025: Create comprehensive BDD scenarios for all todo-list.json tasks
  {
    taskId: 'CODEGOAT-025',
    title: 'Analyze todo-list.json for user-facing tasks',
    feature: 'Todo List Task BDD Scenario Generation',
    description: 'System should identify which tasks require BDD scenarios',
    gherkinContent: `Feature: Todo List Task BDD Scenario Generation
  As a project manager
  I want comprehensive BDD scenarios for every task in todo-list.json
  So that all user-facing features have proper behavior specifications

  Scenario: Analyze todo-list.json for user-facing tasks
    When I examine all tasks in todo-list.json
    Then I should identify which tasks are user-facing features
    And I should distinguish between technical tasks and user stories
    And I should mark user-facing tasks as requiring BDD scenarios
    And I should prioritize based on user impact`,
  },

  // CODEGOAT-026: Decouple business logic from API routes
  {
    taskId: 'CODEGOAT-026',
    title: 'Audit current routes for business logic',
    feature: 'Service Layer Architecture for API Routes',
    description: 'Developers should identify routes that need service layer extraction',
    gherkinContent: `Feature: Service Layer Architecture for API Routes
  As a developer
  I want business logic decoupled from API routes using service files
  So that code is more maintainable and testable

  Scenario: Audit current routes for business logic
    When I examine all files in src/routes/
    Then I should identify routes with embedded business logic
    And I should see which routes have database operations
    And I should see which routes have complex calculations
    And I should see which routes have external API calls
    And I should create a refactoring plan`,
  },

  // CODEGOAT-027: Add analytics for workers
  {
    taskId: 'CODEGOAT-027',
    title: 'View worker execution time analytics',
    feature: 'Worker Analytics and Performance Monitoring',
    description: 'System administrators should see worker performance metrics',
    gherkinContent: `Feature: Worker Analytics and Performance Monitoring
  As a system administrator
  I want comprehensive analytics for Claude Code workers
  So that I can monitor performance and optimize resource utilization

  Scenario: View worker execution time analytics
    When I navigate to the Worker Analytics dashboard
    Then I should see average execution time per worker
    And I should see execution time trends over the last 30 days
    And I should see the longest running tasks by worker
    And I should see execution time percentiles (50th, 90th, 95th)`,
  },

  // CODEGOAT-028: Analytics page performance investigation
  {
    taskId: 'CODEGOAT-028',
    title: 'Measure current analytics page load time',
    feature: 'Analytics Page Performance Optimization',
    description: 'Performance metrics should be collected for the analytics page',
    gherkinContent: `Feature: Analytics Page Performance Optimization
  As a user
  I want the analytics page to load quickly and respond smoothly
  So that I can efficiently analyze system data

  Scenario: Measure current analytics page load time
    When I navigate to the analytics page
    And I measure the page load performance
    Then I should record the total page load time
    And I should measure time to first meaningful paint
    And I should measure time to interactive
    And I should identify the slowest loading components`,
  },
];

async function addBddScenarios() {
  try {
    console.error('🔍 Adding comprehensive BDD scenarios to the database...');

    let addedCount = 0;
    let skippedCount = 0;

    for (const scenarioData of bddScenarios) {
      try {
        // Check if task exists
        const task = await prisma.task.findUnique({
          where: { id: scenarioData.taskId },
        });

        if (!task) {
          console.error(
            `⚠️  Task ${scenarioData.taskId} not found, skipping scenario: ${scenarioData.title}`
          );
          skippedCount++;
          continue;
        }

        // Check if scenario already exists (by title and task)
        const existingScenario = await prisma.bDDScenario.findFirst({
          where: {
            taskId: scenarioData.taskId,
            title: scenarioData.title,
          },
        });

        if (existingScenario) {
          console.error(
            `⚠️  Scenario already exists: ${scenarioData.title} for ${scenarioData.taskId}`
          );
          skippedCount++;
          continue;
        }

        // Create the BDD scenario
        await prisma.bDDScenario.create({
          data: {
            taskId: scenarioData.taskId,
            title: scenarioData.title,
            feature: scenarioData.feature,
            description: scenarioData.description,
            gherkinContent: scenarioData.gherkinContent,
            status: 'PENDING',
          },
        });

        console.error(`✅ Added BDD scenario: ${scenarioData.title} for ${scenarioData.taskId}`);
        addedCount++;
      } catch (error) {
        console.error(
          `❌ Error adding scenario "${scenarioData.title}" for ${scenarioData.taskId}:`,
          error
        );
      }
    }

    console.error(`\n📊 Summary:`);
    console.error(`   ✅ Added: ${addedCount} scenarios`);
    console.error(`   ⚠️  Skipped: ${skippedCount} scenarios`);
    console.error(`   📈 Total processed: ${bddScenarios.length} scenarios`);
  } catch (error) {
    console.error('💥 Script failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  addBddScenarios()
    .then(() => {
      console.error('\n🎉 BDD scenario addition completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { addBddScenarios };
