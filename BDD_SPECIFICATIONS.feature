# CODEGOAT BDD Specifications
# Comprehensive Behavior-Driven Development scenarios for CODEGOAT tasks
# Generated for Claude Code integration with Playwright tests via Cucumber

# ==============================================================================
# CODEGOAT-001: Audit and link existing BDD scenarios to Playwright tests via cucumber
# ==============================================================================

Feature: BDD Scenario Audit and Linking
  As a QA engineer
  I want to audit existing BDD scenarios and link them to Playwright tests via Cucumber
  So that I can ensure complete test coverage and traceability

  Background:
    Given I have access to the BDD Tests Dashboard
    And I have existing BDD scenarios in the system
    And I have Playwright tests in the e2e directory

  Scenario: View current BDD scenario coverage
    When I navigate to the BDD Tests Dashboard
    Then I should see a list of all BDD scenarios
    And I should see their current status (pending, passed, failed, skipped)
    And I should see which scenarios are linked to Playwright tests
    And I should see which scenarios have no test coverage

  Scenario: Discover unlinked BDD scenarios
    Given I am on the BDD Tests Dashboard
    When I filter by "Unlinked scenarios"
    Then I should see all BDD scenarios without associated Playwright tests
    And I should see a "Link to Test" button for each unlinked scenario
    And I should see the scenario's gherkin content

  Scenario: Link BDD scenario to existing Playwright test
    Given I have an unlinked BDD scenario "User login functionality"
    And I have a Playwright test file "auth.spec.ts" with test "should login successfully"
    When I click "Link to Test" for the scenario
    And I select the test file "auth.spec.ts"
    And I select the test "should login successfully"
    And I click "Create Link"
    Then the scenario should be marked as linked
    And I should see the test file path in the scenario details
    And the link should be saved to the database

  Scenario: Auto-discover potential test mappings
    Given I have unlinked BDD scenarios
    And I have Playwright test files
    When I click "Auto-discover mappings"
    Then the system should analyze scenario titles and test names
    And I should see suggested mappings based on text similarity
    And I should be able to accept or reject each suggestion
    And accepted mappings should be automatically linked

  Scenario: View scenario execution history
    Given I have linked BDD scenarios
    When I view a scenario's details
    Then I should see its execution history
    And I should see timestamps of each execution
    And I should see pass/fail status for each execution
    And I should see any error messages from failed executions

  Scenario: Export BDD audit report
    When I click "Export Audit Report"
    Then I should get a CSV or JSON report
    And the report should include all scenarios
    And the report should show linking status
    And the report should include test coverage percentages
    And the report should show recent execution results

# ==============================================================================
# CODEGOAT-014: Switching across agents in analytics page does not change the data displayed
# ==============================================================================

Feature: Agent Analytics Data Filtering
  As a developer
  I want to switch between different agents in the analytics page
  So that I can view agent-specific analytics data

  Background:
    Given I am logged into the CODEGOAT system
    And I have validation runs from multiple agents: "claude_cli", "gemini_cli", "cursor_cli"
    And I am on the Analytics page

  Scenario: View available agent options
    When I look at the agent selector dropdown
    Then I should see "claude_cli" as an option
    And I should see "gemini_cli" as an option
    And I should see "cursor_cli" as an option
    And I should see "All Agents" as an option

  Scenario: Switch to Claude CLI agent data
    Given the default "All Agents" is selected
    When I select "claude_cli" from the agent dropdown
    Then the analytics data should update to show only Claude CLI results
    And the summary cards should reflect Claude CLI metrics
    And the charts should update with Claude CLI data points
    And the recent runs list should show only Claude CLI runs

  Scenario: Switch to Gemini CLI agent data
    Given I have "claude_cli" selected
    When I select "gemini_cli" from the agent dropdown
    Then the analytics data should update to show only Gemini CLI results
    And the validation success rate should change to reflect Gemini data
    And the stage performance charts should update
    And the most failed stages should reflect Gemini-specific failures

  Scenario: Switch to Cursor CLI agent data
    Given I have "gemini_cli" selected
    When I select "cursor_cli" from the agent dropdown
    Then the analytics data should update to show only Cursor CLI results
    And all time-series charts should re-render with Cursor data
    And the average duration metrics should update
    And the historical trends should reflect Cursor-specific patterns

  Scenario: Return to all agents view
    Given I have "cursor_cli" selected
    When I select "All Agents" from the agent dropdown
    Then the analytics data should show combined data from all agents
    And the metrics should reflect the aggregate of all agent runs
    And the charts should include data points from all agents
    And I should see the complete validation history

  Scenario: Agent filter persistence
    Given I select "claude_cli" from the agent dropdown
    When I refresh the page
    Then "claude_cli" should still be selected
    And the data should remain filtered to Claude CLI
    When I navigate away and return to analytics
    Then the agent selection should be preserved

  Scenario: Empty state for agent with no data
    Given I select an agent that has no validation runs
    When the page loads the filtered data
    Then I should see an empty state message
    And I should see "No validation runs found for this agent"
    And all metric cards should show zero values
    And charts should display appropriate empty states

# ==============================================================================
# CODEGOAT-015: Add task editing functionality to the tasks board
# ==============================================================================

Feature: Task Editing on Tasks Board
  As a project manager
  I want to edit tasks directly on the tasks board
  So that I can quickly update task details without navigating away

  Background:
    Given I am on the Tasks Board page
    And I have tasks in different columns (pending, in_progress, completed)
    And I have appropriate permissions to edit tasks

  Scenario: Open task edit modal
    Given I have a task "Implement user authentication" in the pending column
    When I click the edit icon on the task card
    Then a task edit modal should open
    And the modal should display the current task details
    And I should see fields for title, description, priority, and status
    And the save and cancel buttons should be available

  Scenario: Edit task title and description
    Given I have opened the edit modal for a task
    When I change the title to "Implement OAuth authentication"
    And I update the description to "Add OAuth login with Google and GitHub providers"
    And I click "Save Changes"
    Then the modal should close
    And the task card should display the updated title
    And the task should be saved to the database
    And I should see a success notification

  Scenario: Change task priority
    Given I have a task with "medium" priority
    When I open the edit modal
    And I change the priority to "high"
    And I click "Save Changes"
    Then the task card should display a high priority indicator
    And the task should move to reflect priority ordering
    And the change should be persisted

  Scenario: Move task between columns by editing status
    Given I have a task in the "pending" column
    When I open the edit modal
    And I change the status to "in_progress"
    And I click "Save Changes"
    Then the task should move from pending to in_progress column
    And the task should appear in the correct position
    And the column counts should update

  Scenario: Add BDD scenarios to a story task
    Given I have a task marked as type "story"
    When I open the edit modal
    And I navigate to the "BDD Scenarios" tab
    And I click "Add Scenario"
    And I enter scenario title "User logs in successfully"
    And I enter the Gherkin content
    And I click "Save Scenario"
    Then the scenario should be added to the task
    And the task card should show the scenario count
    And the scenario should be available for linking to tests

  Scenario: Inline editing of task title
    Given I have a task card displayed
    When I double-click on the task title
    Then the title should become editable in-place
    And I should see a text input field with the current title
    When I change the text and press Enter
    Then the title should update immediately
    And the change should be auto-saved
    When I press Escape while editing
    Then the edit should be cancelled and original title restored

  Scenario: Bulk edit multiple tasks
    Given I have multiple tasks selected using checkboxes
    When I click the "Bulk Edit" button
    Then a bulk edit modal should open
    And I should see options to change priority, assignee, or tags for all selected tasks
    When I change the priority to "high" for all selected tasks
    And I click "Apply Changes"
    Then all selected tasks should update to high priority
    And I should see a confirmation of how many tasks were updated

  Scenario: Edit task with validation errors
    Given I have opened the edit modal for a task
    When I clear the required title field
    And I click "Save Changes"
    Then I should see validation error messages
    And the modal should not close
    And the task should not be saved
    And I should see "Title is required" error message

  Scenario: Cancel editing changes
    Given I have made changes in the edit modal
    When I click "Cancel"
    Then the modal should close without saving changes
    And the original task data should remain unchanged
    When I have unsaved changes and click "Cancel"
    Then I should see a confirmation dialog asking if I want to discard changes

# ==============================================================================
# CODEGOAT-017: Reorganise folder structure of the files
# ==============================================================================

Feature: Folder Structure Reorganization
  As a developer
  I want the codebase to have a well-organized folder structure
  So that code is easy to find, maintain, and understand

  Background:
    Given I have the current CODEGOAT codebase structure
    And I need to improve organization into logical folders

  Scenario: Verify new pages folder structure
    When I examine the frontend folder structure
    Then I should see a "pages" folder containing all page components
    And I should see pages like AnalyticsPage, DashboardPage, SettingsPage are in the pages folder
    And page files should follow naming convention *Page.tsx
    And page components should not be mixed with reusable components

  Scenario: Verify shared folder organization
    When I examine the shared folder structure
    Then I should see a "shared" folder containing common utilities
    And I should see shared types in shared/types.ts
    And I should see shared constants in shared/constants.ts
    And I should see shared hooks in shared/hooks/
    And shared utilities should be framework-agnostic

  Scenario: Verify utils folder structure
    When I examine the utils folder
    Then I should see utility functions grouped by functionality
    And I should see utils/validation/ for validation helpers
    And I should see utils/formatting/ for formatting functions
    And I should see utils/api/ for API-related utilities
    And each utility should have a clear, single responsibility

  Scenario: Verify types organization
    When I examine type definitions
    Then I should see domain-specific types in appropriate folders
    And I should see api/types/ for API-related types
    And I should see shared/types/ for common types used across modules
    And component-specific types should be co-located with components

  Scenario: Verify component folder structure
    When I examine the components folder
    Then I should see components organized by feature area
    And I should see ui/ folder for basic UI components
    And I should see feature-specific folders like analytics/, tasks/, workers/
    And each component folder should contain related files (component, test, styles)

  Scenario: Verify services organization
    When I examine the services folder
    Then I should see services grouped by domain area
    And I should see api service files following consistent naming
    And business logic should be separated from API calls
    And services should have clear interfaces and error handling

  Scenario: Validate imports still work after restructuring
    Given the folder structure has been reorganized
    When I run the build process
    Then all imports should resolve correctly
    And there should be no broken import paths
    And the application should build without errors
    And all tests should continue to pass

  Scenario: Verify backend route organization
    When I examine the backend routes folder
    Then routes should be organized by feature area
    And business logic should be moved to service files
    And routes should only handle HTTP concerns
    And route files should follow consistent structure

  Scenario: Check for circular dependencies
    Given the new folder structure is in place
    When I analyze module dependencies
    Then there should be no circular import dependencies
    And the dependency graph should be clean and hierarchical
    And shared modules should not depend on feature modules

# ==============================================================================
# CODEGOAT-018: Increase test coverage to 90%
# ==============================================================================

Feature: Achieve 90% Test Coverage
  As a developer
  I want to achieve 90% test coverage across the codebase
  So that I can ensure code quality and reduce bugs

  Background:
    Given I have the current CODEGOAT codebase
    And I can measure test coverage for frontend and backend separately

  Scenario: View current test coverage baseline
    When I run the test coverage command
    Then I should see the current coverage percentage for the entire codebase
    And I should see coverage broken down by file and folder
    And I should see lines, branches, and functions coverage
    And I should see which files have the lowest coverage

  Scenario: Identify untested backend routes
    When I analyze backend test coverage
    Then I should see coverage for all API routes in src/routes/
    And I should identify routes with less than 90% coverage
    And I should see which error handling paths are untested
    And I should see which service methods need tests

  Scenario: Identify untested frontend components
    When I analyze frontend test coverage
    Then I should see coverage for all React components
    And I should identify components with less than 90% coverage
    And I should see which user interaction scenarios are untested
    And I should see which hooks and utility functions need tests

  Scenario: Add tests for uncovered utility functions
    Given I have utility functions with low coverage
    When I write unit tests for these functions
    And I cover edge cases and error scenarios
    And I run the test coverage again
    Then the coverage for utility functions should increase
    And I should achieve at least 90% coverage for the utils folder

  Scenario: Add integration tests for API endpoints
    Given I have API endpoints with insufficient test coverage
    When I write integration tests covering happy path scenarios
    And I write tests for error conditions and edge cases
    And I test authentication and authorization flows
    And I run the test coverage analysis
    Then API endpoints should achieve 90% coverage
    And all major user workflows should be tested

  Scenario: Add component interaction tests
    Given I have React components with low test coverage
    When I write tests for user interactions
    And I test component state changes
    And I test props variations and edge cases
    And I mock external dependencies appropriately
    Then component coverage should reach 90%
    And all user-facing functionality should be tested

  Scenario: Verify coverage thresholds are enforced
    Given I have configured coverage thresholds at 90%
    When I run the test suite with coverage
    And any file falls below the 90% threshold
    Then the test run should fail
    And I should see which files are below the threshold
    And the CI/CD pipeline should prevent deployment

  Scenario: Generate and review coverage reports
    When I generate a detailed coverage report
    Then I should see an HTML report with file-by-file breakdown
    And I should see highlighted lines showing untested code
    And I should see branch coverage showing untested conditions
    And I should be able to drill down into specific files

  Scenario: Monitor coverage trends over time
    Given I track coverage metrics over time
    When I commit new code changes
    Then I should see how coverage changes with each commit
    And I should be alerted if coverage drops below 90%
    And I should see coverage trends in the analytics dashboard

# ==============================================================================
# CODEGOAT-019: Tighten eslint rules to improve quality
# ==============================================================================

Feature: Enhanced ESLint Configuration for Code Quality
  As a developer
  I want stricter ESLint rules
  So that code quality and consistency are maintained across the codebase

  Background:
    Given I have the current ESLint configuration
    And I want to improve code quality standards
    And I need to maintain developer productivity

  Scenario: Configure strict TypeScript ESLint rules
    When I update the ESLint configuration
    Then I should enable @typescript-eslint/strict rules
    And I should require explicit return types for functions
    And I should disallow 'any' types without comments
    And I should enforce consistent naming conventions

  Scenario: Enforce code complexity limits
    When I configure complexity rules
    Then I should set maximum cyclomatic complexity to 10
    And I should set maximum function length to 50 lines
    And I should set maximum file length to 500 lines
    And I should enforce maximum nesting depth of 4

  Scenario: Require comprehensive JSDoc comments
    When I enable JSDoc rules
    Then public functions should require JSDoc comments
    And complex logic should require explanatory comments
    And interface and type definitions should be documented
    And deprecated functions should have JSDoc @deprecated tags

  Scenario: Enforce consistent import/export patterns
    When I configure import rules
    Then I should enforce alphabetical import ordering
    And I should require consistent import grouping (external, internal, relative)
    And I should disallow default exports except for main components
    And I should enforce import/export consistency

  Scenario: Enable accessibility linting for React
    When I add jsx-a11y plugin rules
    Then I should enforce ARIA attribute usage
    And I should require alt text for images
    And I should enforce semantic HTML usage
    And I should validate keyboard navigation support

  Scenario: Configure React-specific strict rules
    When I update React ESLint rules
    Then I should enforce React hooks rules strictly
    And I should require key props in list rendering
    And I should disallow inline styles without specific exceptions
    And I should enforce consistent component naming

  Scenario: Run ESLint with new strict rules
    Given I have updated the ESLint configuration
    When I run ESLint on the entire codebase
    Then I should see all violations of the new rules
    And I should fix critical violations immediately
    And I should plan incremental fixes for non-critical issues
    And the linting should pass on all new code

  Scenario: Integrate strict linting with CI/CD
    When I update the CI/CD pipeline
    Then ESLint should run with strict rules on every commit
    And pull requests should be blocked if linting fails
    And I should see linting results in the PR review process
    And coverage of linting rules should be tracked

  Scenario: Configure gradual rule enforcement
    Given some strict rules may break existing code
    When I enable new rules
    Then I should use warning level for existing violations
    And I should use error level for new code violations
    And I should track progress on fixing existing warnings
    And I should have a timeline for converting warnings to errors

# ==============================================================================
# CODEGOAT-022: Add task duration charts and time range filters
# ==============================================================================

Feature: Task Duration Analytics with Time Range Filtering
  As a project manager
  I want to view task duration charts with time range filters
  So that I can analyze task completion patterns and optimize workflows

  Background:
    Given I am on the Task Analytics page
    And I have completed tasks with recorded durations
    And I have tasks from different time periods

  Scenario: View task duration overview chart
    When I navigate to the Task Analytics page
    Then I should see a task duration chart showing average completion times
    And I should see tasks grouped by priority (high, medium, low)
    And I should see duration data for the last 30 days by default
    And I should see both individual task durations and averages

  Scenario: Apply 7-day time range filter
    Given I am viewing the task analytics
    When I select "7 days" from the time range filter
    Then all charts should update to show only data from the last 7 days
    And I should see task duration trends for the past week
    And the summary metrics should reflect the 7-day period
    And the URL should update to reflect the selected time range

  Scenario: Apply 30-day time range filter
    Given I have "7 days" selected
    When I change the time range to "30 days"
    Then the charts should re-render with 30-day data
    And I should see longer-term trends in task completion
    And weekly aggregation should be visible for better overview
    And the date axis should adjust to show appropriate intervals

  Scenario: Apply 90-day time range filter
    Given I am viewing task analytics
    When I select "90 days" from the time range filter
    Then I should see quarterly task completion patterns
    And the data should be aggregated by week for readability
    And I should see seasonal trends if they exist
    And performance metrics should be calculated for the 3-month period

  Scenario: Apply custom time range
    When I click on "Custom Range"
    Then I should see a date picker with start and end date fields
    When I select a start date of "2024-01-01" and end date of "2024-01-31"
    And I click "Apply"
    Then the charts should show data for January 2024 only
    And I should see "Jan 1 - Jan 31, 2024" in the time range display
    And all metrics should be calculated for this specific period

  Scenario: View task duration by task type
    Given I have both "story" and "task" type items
    When I view the duration chart
    Then I should see separate series for stories vs tasks
    And I should see that stories typically take longer than tasks
    And I should be able to toggle story/task visibility
    And I should see average duration for each type

  Scenario: View task duration distribution
    When I navigate to the duration distribution chart
    Then I should see a histogram of task completion times
    And I should see the most common duration ranges highlighted
    And I should see outliers (unusually long or short tasks)
    And I should be able to click on a duration range to see specific tasks

  Scenario: Filter duration charts by priority
    Given I am viewing task duration analytics
    When I select "High Priority Only" from the priority filter
    Then the duration charts should show only high priority tasks
    And I should see if high priority tasks are completed faster
    And the average duration should reflect only high priority items
    And I should be able to compare with other priority levels

  Scenario: View task duration trends over time
    When I look at the time series duration chart
    Then I should see task completion time trends over the selected period
    And I should see if teams are getting faster or slower over time
    And I should see weekly/monthly averages depending on time range
    And trend lines should indicate improvement or degradation

  Scenario: Export task duration data
    When I click "Export Data"
    Then I should be able to download duration data as CSV
    And the export should include task ID, title, duration, priority, completion date
    And the export should respect the current time range filter
    And I should be able to use this data for further analysis

# ==============================================================================
# CODEGOAT-024: Add BDD test coverage reporting
# ==============================================================================

Feature: BDD Test Coverage Analysis
  As a QA lead
  I want to track what percentage of BDD scenarios have associated Playwright tests
  So that I can ensure complete test automation coverage

  Background:
    Given I have BDD scenarios defined in the system
    And I have Playwright tests with Cucumber integration
    And I am on the BDD Tests Dashboard

  Scenario: View BDD test coverage overview
    When I navigate to the Test Coverage tab
    Then I should see the overall BDD coverage percentage
    And I should see total number of BDD scenarios
    And I should see number of scenarios with linked Playwright tests
    And I should see number of scenarios without test coverage

  Scenario: View coverage breakdown by feature
    When I view the coverage by feature section
    Then I should see each feature listed with its coverage percentage
    And I should see features sorted by lowest coverage first
    And I should see number of scenarios per feature
    And I should be able to click on a feature to see its scenarios

  Scenario: View coverage breakdown by task type
    When I filter coverage by task type
    Then I should see coverage percentage for "story" type tasks
    And I should see coverage percentage for "task" type tasks
    And I should see that story tasks have higher coverage requirement
    And I should see which task types need more test coverage

  Scenario: Identify scenarios missing Playwright tests
    When I click on "Untested Scenarios"
    Then I should see a list of BDD scenarios without linked Playwright tests
    And each scenario should show its feature and priority
    And I should see when each scenario was created
    And I should see a "Create Test" button for each scenario

  Scenario: View coverage trends over time
    When I look at the coverage trends chart
    Then I should see how BDD coverage has changed over the last 30 days
    And I should see when new scenarios were added
    And I should see when tests were linked to scenarios
    And I should see the target coverage goal line (e.g., 90%)

  Scenario: Set coverage quality gates
    Given I am a project administrator
    When I navigate to BDD Settings
    Then I should be able to set minimum coverage thresholds
    And I should set different thresholds for story vs task types
    And I should be able to enforce coverage requirements
    And failing coverage should block task completion

  Scenario: Generate BDD coverage report
    When I click "Generate Coverage Report"
    Then I should get a detailed report in PDF or HTML format
    And the report should include coverage by feature area
    And the report should list all untested scenarios
    And the report should include recommendations for improvement
    And I should be able to schedule automatic report generation

  Scenario: Track Cucumber step definition coverage
    When I view step definition coverage
    Then I should see which Gherkin steps have corresponding step definitions
    And I should see reusable step definitions vs scenario-specific ones
    And I should see unused step definitions that can be cleaned up
    And I should see step definitions that need Playwright implementation

  Scenario: Cucumber integration validation
    When I run the Cucumber integration test
    Then all linked BDD scenarios should execute via Cucumber
    And Cucumber should call the corresponding Playwright tests
    And test results should be reported back to BDD scenarios
    And execution history should be updated for each scenario

# ==============================================================================
# CODEGOAT-025: Create comprehensive BDD scenarios for all todo-list.json tasks
# ==============================================================================

Feature: Todo List Task BDD Scenario Generation
  As a project manager
  I want comprehensive BDD scenarios for every task in todo-list.json
  So that all user-facing features have proper behavior specifications

  Background:
    Given I have access to the todo-list.json file
    And I have the tasks management system
    And I need BDD scenarios for user-facing features

  Scenario: Analyze todo-list.json for user-facing tasks
    When I examine all tasks in todo-list.json
    Then I should identify which tasks are user-facing features
    And I should distinguish between technical tasks and user stories
    And I should mark user-facing tasks as requiring BDD scenarios
    And I should prioritize based on user impact

  Scenario: Generate BDD scenarios for authentication features
    Given I have authentication-related tasks in the todo list
    When I create BDD scenarios for login functionality
    Then I should cover successful login scenarios
    And I should cover failed login attempts
    And I should cover session management
    And I should cover password reset flows
    And I should cover multi-factor authentication if applicable

  Scenario: Generate BDD scenarios for task management features
    Given I have task management features in the todo list
    When I create BDD scenarios for task operations
    Then I should cover task creation workflows
    And I should cover task editing and updates
    And I should cover task status transitions
    And I should cover task assignment and reassignment
    And I should cover task filtering and searching

  Scenario: Generate BDD scenarios for validation pipeline features
    Given I have validation-related tasks in the todo list
    When I create BDD scenarios for validation workflows
    Then I should cover validation run initiation
    And I should cover validation stage execution
    And I should cover validation failure handling
    And I should cover validation reporting
    And I should cover validation configuration management

  Scenario: Generate BDD scenarios for analytics features
    Given I have analytics-related tasks in the todo list
    When I create BDD scenarios for analytics workflows
    Then I should cover data visualization
    And I should cover filtering and time range selection
    And I should cover metric calculations
    And I should cover report generation
    And I should cover dashboard interactivity

  Scenario: Generate BDD scenarios for worker management features
    Given I have worker-related tasks in the todo list
    When I create BDD scenarios for worker operations
    Then I should cover worker lifecycle management
    And I should cover worker monitoring and status tracking
    And I should cover worker log viewing
    And I should cover worker termination and cleanup
    And I should cover parallel worker execution

  Scenario: Link BDD scenarios to Playwright tests using Cucumber
    Given I have comprehensive BDD scenarios for all tasks
    When I link them to Playwright tests via Cucumber
    Then each scenario should have a corresponding test file
    And Cucumber step definitions should map to Playwright actions
    And test execution should be tracked in scenario history
    And test results should update scenario status

  Scenario: Validate scenario completeness
    When I review all generated BDD scenarios
    Then every user-facing task should have at least 3 scenarios (happy path, edge case, error case)
    And scenarios should cover all user interaction flows
    And scenarios should include accessibility considerations
    And scenarios should cover mobile responsiveness where applicable

  Scenario: Create scenario execution plan
    Given I have all BDD scenarios defined
    When I create the test execution plan
    Then I should prioritize scenarios by user impact
    And I should group scenarios by feature area for efficient execution
    And I should identify dependencies between scenarios
    And I should create a schedule for regular scenario execution

# ==============================================================================
# CODEGOAT-026: Decouple business logic from API routes
# ==============================================================================

Feature: Service Layer Architecture for API Routes
  As a developer
  I want business logic decoupled from API routes using service files
  So that code is more maintainable and testable

  Background:
    Given I have API routes with embedded business logic
    And I need to extract logic into service layer
    And I want to maintain current API functionality

  Scenario: Audit current routes for business logic
    When I examine all files in src/routes/
    Then I should identify routes with embedded business logic
    And I should see which routes have database operations
    And I should see which routes have complex calculations
    And I should see which routes have external API calls
    And I should create a refactoring plan

  Scenario: Create analytics service layer
    Given I have analytics.ts route with business logic
    When I create src/services/analytics.service.ts
    Then I should move validation run calculations to the service
    And I should move stage performance calculations to the service
    And I should move trend analysis logic to the service
    And the route should only handle HTTP concerns (request/response)

  Scenario: Create settings service layer
    Given I have settings.ts route with configuration logic
    When I create src/services/settings.service.ts
    Then I should move settings validation to the service
    And I should move settings transformation logic to the service
    And I should move default configuration handling to the service
    And the route should delegate to service methods

  Scenario: Create tasks service layer
    Given I have tasks.ts route with task management logic
    When I create src/services/tasks.service.ts
    Then I should move task CRUD operations to the service
    And I should move task status transition logic to the service
    And I should move task filtering and searching to the service
    And I should move BDD scenario management to the service

  Scenario: Create workers service layer
    Given I have claude-workers.ts route with worker logic
    When I create src/services/workers.service.ts
    Then I should move worker lifecycle management to the service
    And I should move log processing logic to the service
    And I should move worker status tracking to the service
    And I should move validation orchestration to the service

  Scenario: Implement consistent service interfaces
    When I create service interfaces
    Then each service should have clear, typed method signatures
    And services should return consistent result objects
    And services should handle errors appropriately
    And services should not depend on Express request/response objects

  Scenario: Update routes to use services
    Given I have created all service layers
    When I update the route files
    Then routes should only handle HTTP-specific logic
    And routes should delegate business operations to services
    And routes should transform service results to HTTP responses
    And routes should handle HTTP error mapping

  Scenario: Test service layer independently
    When I write unit tests for services
    Then services should be testable without HTTP layer
    And I should mock external dependencies (database, APIs)
    And I should test business logic edge cases
    And I should achieve high coverage on service methods

  Scenario: Validate API functionality remains unchanged
    Given I have refactored routes to use services
    When I run the existing API tests
    Then all API endpoints should work exactly as before
    And response formats should be identical
    And error handling should behave the same way
    And performance should not degrade

  Scenario: Implement service dependency injection
    When I set up service dependency management
    Then services should not directly instantiate dependencies
    And database connections should be injected
    And external API clients should be configurable
    And services should be easily mockable for testing

# ==============================================================================
# CODEGOAT-027: Add analytics for workers
# ==============================================================================

Feature: Worker Analytics and Performance Monitoring
  As a system administrator
  I want comprehensive analytics for Claude Code workers
  So that I can monitor performance and optimize resource utilization

  Background:
    Given I have Claude Code workers running tasks
    And I have worker execution data being collected
    And I am on the Workers Analytics page

  Scenario: View worker execution time analytics
    When I navigate to the Worker Analytics dashboard
    Then I should see average execution time per worker
    And I should see execution time trends over the last 30 days
    And I should see the longest running tasks by worker
    And I should see execution time percentiles (50th, 90th, 95th)

  Scenario: View blocked commands analytics
    When I look at the blocked commands section
    Then I should see total number of blocked commands per worker
    And I should see most frequently blocked command types
    And I should see which workers trigger the most security blocks
    And I should see trends in blocked command attempts over time

  Scenario: View validation run analytics per worker
    When I examine validation analytics
    Then I should see number of validation runs per worker
    And I should see validation success rates by worker
    And I should see average validation duration per worker
    And I should see which validation stages fail most often per worker

  Scenario: View worker resource utilization
    When I check resource utilization metrics
    Then I should see CPU usage patterns for each worker
    And I should see memory consumption over time
    And I should see disk I/O statistics
    And I should see network usage if applicable

  Scenario: View worker lifecycle analytics
    When I examine worker lifecycle data
    Then I should see worker start/stop frequency
    And I should see average worker session duration
    And I should see worker failure rates and crash patterns
    And I should see worker restart frequency

  Scenario: Compare worker performance
    Given I have multiple workers with execution history
    When I view the worker comparison dashboard
    Then I should see side-by-side performance metrics
    And I should see which workers are fastest/slowest
    And I should see which workers have highest success rates
    And I should identify underperforming workers

  Scenario: View worker error analytics
    When I examine worker error patterns
    Then I should see error frequency by worker
    And I should see most common error types per worker
    And I should see error trends over time
    And I should see which tasks cause the most worker failures

  Scenario: Set up worker performance alerts
    Given I am a system administrator
    When I configure worker monitoring alerts
    Then I should set thresholds for execution time
    And I should set alerts for high blocked command rates
    And I should set alerts for low validation success rates
    And I should receive notifications when thresholds are exceeded

  Scenario: Export worker analytics data
    When I click "Export Worker Data"
    Then I should get comprehensive worker metrics in CSV format
    And the export should include execution times, blocked commands, validations
    And I should be able to filter the export by time range
    And I should be able to select specific workers for export

  Scenario: View real-time worker monitoring
    When I access the real-time worker dashboard
    Then I should see currently running workers
    And I should see real-time execution progress
    And I should see live resource utilization
    And I should see real-time blocked command attempts
    And the dashboard should auto-refresh every 30 seconds

# ==============================================================================
# CODEGOAT-028: Analytics page performance investigation
# ==============================================================================

Feature: Analytics Page Performance Optimization
  As a user
  I want the analytics page to load quickly and respond smoothly
  So that I can efficiently analyze system data

  Background:
    Given I have a fully loaded analytics page with historical data
    And I need to identify performance bottlenecks
    And I want to improve user experience

  Scenario: Measure current analytics page load time
    When I navigate to the analytics page
    And I measure the page load performance
    Then I should record the total page load time
    And I should measure time to first meaningful paint
    And I should measure time to interactive
    And I should identify the slowest loading components

  Scenario: Analyze database query performance
    Given the analytics page loads data from the database
    When I examine database query performance
    Then I should identify slow-running queries
    And I should see queries that load large datasets
    And I should see queries without proper indexing
    And I should measure query execution times

  Scenario: Analyze API response times
    When I monitor API calls from the analytics page
    Then I should measure response times for each endpoint
    And I should identify endpoints with high latency
    And I should see which endpoints transfer large amounts of data
    And I should identify redundant API calls

  Scenario: Analyze frontend rendering performance
    When I profile the React component rendering
    Then I should identify components with expensive re-renders
    And I should see components that re-render unnecessarily
    And I should identify memory leaks in chart components
    And I should measure JavaScript execution time

  Scenario: Identify data processing bottlenecks
    Given the analytics page processes large datasets
    When I analyze data transformation performance
    Then I should identify expensive data calculations
    And I should see data transformations that block the UI
    And I should identify opportunities for data caching
    And I should measure client-side processing time

  Scenario: Implement database query optimizations
    Given I have identified slow database queries
    When I optimize the queries
    Then I should add proper database indexes
    And I should optimize query structure and joins
    And I should implement query result caching
    And I should reduce data transfer by fetching only needed fields

  Scenario: Implement API response optimization
    When I optimize API responses
    Then I should implement response compression
    And I should add pagination for large datasets
    And I should implement server-side filtering
    And I should add response caching headers

  Scenario: Implement frontend performance optimizations
    When I optimize React components
    Then I should implement React.memo for expensive components
    And I should use useMemo for expensive calculations
    And I should implement virtual scrolling for large lists
    And I should lazy load chart components

  Scenario: Implement progressive data loading
    When I implement progressive loading
    Then I should load summary data first
    And I should load detailed data on demand
    And I should show loading skeletons during data fetch
    And I should implement infinite scrolling where appropriate

  Scenario: Validate performance improvements
    Given I have implemented optimizations
    When I measure the analytics page performance again
    Then page load time should be reduced by at least 50%
    And API response times should be under 500ms
    And the page should remain responsive during data loading
    And memory usage should not continuously increase

  Scenario: Monitor performance over time
    When I implement performance monitoring
    Then I should track page load times continuously
    And I should alert when performance degrades
    And I should track performance metrics in the analytics dashboard
    And I should create performance budgets for future development