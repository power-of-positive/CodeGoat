Feature: CodeGoat Comprehensive User Scenarios

  # ==================================================
  # TASK MANAGEMENT SCENARIOS  
  # ==================================================
  
  Scenario: User creates a new task
    Given I am on the Tasks page
    When I click the "Add Task" button
    And I fill in the task form with:
      | content     | Fix user authentication bug |
      | priority    | high                        |
      | status      | pending                     |
      | taskType    | task                        |
      | executorId  | claude_code                 |
    And I click the "Create" button
    Then I should see the new task in the pending column
    And the task should display priority badge "high"
    And the task should show executor "claude_code"

  Scenario: User edits an existing task
    Given I have a task "Implement login functionality" in pending status
    When I click the task menu button
    And I select "Edit" from the dropdown
    And I change the content to "Implement OAuth login functionality"
    And I change the priority to "medium"
    And I click the "Update" button
    Then I should see the updated task content
    And the task should display priority badge "medium"

  Scenario: User changes task status
    Given I have a task "Write API documentation" in pending status
    When I click the "Start" button on the task
    Then the task should move to the "In Progress" column
    And the task should display a start time
    When I click the "Complete" button on the task
    Then the task should move to the "Completed" column
    And the task should display completion duration

  Scenario: User deletes a task
    Given I have a task "Remove deprecated code" in pending status
    When I click the task menu button
    And I select "Delete" from the dropdown
    And I confirm the deletion in the dialog
    Then the task should be removed from the board
    And the task count should decrease by 1

  Scenario: User starts a Claude worker for a task
    Given I have a task "Refactor database queries" in pending status
    When I click the "Start Worker" button on the task
    And I confirm starting the worker
    Then I should see a success message with worker ID
    And I should be able to view the worker progress

  Scenario: User filters tasks by priority
    Given I have tasks with different priorities
    When I apply a "high" priority filter
    Then I should only see high priority tasks
    And the task counts should update accordingly

  Scenario: User views task details
    Given I have a task "Implement caching layer"
    When I click on the task title
    Then I should navigate to the task detail page
    And I should see complete task information
    And I should see task execution history

  # ==================================================
  # ANALYTICS AND VALIDATION SCENARIOS
  # ==================================================

  Scenario: User views validation analytics dashboard
    Given I am on the Analytics page
    Then I should see validation metrics charts
    And I should see success rate trends over time
    And I should see average duration trends
    And I should see recent validation runs list

  Scenario: User views detailed validation run
    Given I am on the Analytics page with recent runs
    When I click on a specific validation run
    Then I should see detailed validation run information
    And I should see individual stage results
    And I should see stage execution times
    And I should see success/failure status for each stage

  Scenario: User refreshes analytics data
    Given I am on the Analytics page
    When I click the refresh button
    Then the analytics data should update
    And I should see current validation metrics

  Scenario: User navigates validation run pagination
    Given I am on the Analytics page with many validation runs
    When I change the pagination size to 50
    Then I should see 50 validation runs per page
    When I navigate to page 2
    Then I should see the next set of runs

  # ==================================================
  # WORKER MANAGEMENT SCENARIOS
  # ==================================================

  Scenario: User views workers dashboard
    Given I am on the Workers page
    Then I should see active workers list
    And I should see worker status indicators
    And I should see worker execution progress

  Scenario: User views worker details
    Given I have an active worker
    When I click on the worker entry
    Then I should see detailed worker information
    And I should see real-time log streaming
    And I should see worker execution status

  Scenario: User stops a running worker
    Given I have a running worker
    When I navigate to the worker detail page
    And I click the "Stop Worker" button
    And I confirm stopping the worker
    Then the worker should be stopped
    And the worker status should update to "stopped"

  Scenario: User views worker execution logs
    Given I have a worker with execution logs
    When I view the worker detail page
    Then I should see structured log entries
    And I should see command executions
    And I should see file operations
    And I should see timestamps for each entry

  # ==================================================
  # SETTINGS AND CONFIGURATION SCENARIOS
  # ==================================================

  Scenario: User views validation settings
    Given I am on the Settings page
    Then I should see all validation stages
    And I should see stage configuration options
    And I should see enable/disable toggles
    And I should see stage priority ordering

  Scenario: User enables a validation stage
    Given I am on the Settings page
    And a validation stage is disabled
    When I toggle the stage to enabled
    And I click "Save Changes"
    Then the stage should be marked as enabled
    And the validation pipeline should include this stage

  Scenario: User reorders validation stages
    Given I am on the Settings page
    When I drag a validation stage to a new position
    And I save the changes
    Then the stages should be reordered
    And the validation pipeline should use the new order

  Scenario: User edits stage configuration
    Given I am on the Settings page
    When I click edit on a validation stage
    And I modify the stage command
    And I modify the timeout value
    And I save the changes
    Then the stage should use the new configuration
    And the validation pipeline should apply new settings

  # ==================================================
  # PERMISSIONS MANAGEMENT SCENARIOS
  # ==================================================

  Scenario: User views executor permissions
    Given I am on the Permissions page
    Then I should see current permission settings
    And I should see blocked commands list
    And I should see allowed operations

  Scenario: User blocks a dangerous command
    Given I am on the Permissions page
    When I add "rm -rf" to blocked commands
    And I save the permissions
    Then the command should be blocked in worker execution
    And workers should show security violations for this command

  Scenario: User views blocked command history
    Given I am on the Permissions page
    When I navigate to the audit log
    Then I should see all blocked command attempts
    And I should see timestamps and worker details
    And I should see security violation reasons

  # ==================================================
  # BDD TEST EXECUTION SCENARIOS
  # ==================================================

  Scenario: User views BDD test dashboard
    Given I am on the BDD Tests page
    Then I should see BDD scenario execution status
    And I should see test suite statistics
    And I should see recent test run history

  Scenario: User runs BDD test suite
    Given I am on the BDD Tests page
    When I click "Run BDD Tests"
    Then the test suite should execute
    And I should see real-time test progress
    And I should see pass/fail results for each scenario

  Scenario: User views BDD test results
    Given I have completed BDD test runs
    When I view the test results
    Then I should see scenario pass/fail status
    And I should see execution times
    And I should see failure details and stack traces

  # ==================================================
  # TASK ANALYTICS SCENARIOS
  # ==================================================

  Scenario: User views task completion analytics
    Given I am on the Task Analytics page
    Then I should see task completion trends
    And I should see average task duration
    And I should see task distribution by status
    And I should see task distribution by priority

  Scenario: User filters task analytics by date range
    Given I am on the Task Analytics page
    When I select a custom date range filter
    Then the analytics should update for that period
    And I should see filtered task completion data

  Scenario: User exports task analytics data
    Given I am on the Task Analytics page
    When I click "Export Data"
    Then I should get a downloadable analytics report
    And the report should contain task metrics and trends

  # ==================================================
  # INTEGRATION WORKFLOW SCENARIOS
  # ==================================================

  Scenario: Complete development workflow
    Given I start with a new feature request
    When I create a task for the feature
    And I start a Claude worker to implement it
    And the worker executes the implementation
    And validation stages run automatically
    And all validations pass
    Then the task should be marked as completed
    And the implementation should be committed
    And analytics should reflect the successful completion

  Scenario: Validation failure workflow
    Given I have a task being executed by a worker
    When the validation pipeline runs
    And one or more validation stages fail
    Then the task should remain in progress
    And I should see detailed failure information
    And I should be able to review and fix issues
    And retry the validation process

  Scenario: Multi-task project workflow
    Given I have a complex project with multiple tasks
    When I create several related tasks
    And I organize them by priority and dependencies
    And workers execute tasks in appropriate order
    And validation ensures quality at each step
    Then all tasks should complete successfully
    And the project should be delivered with high quality

  # ==================================================
  # ERROR HANDLING AND RECOVERY SCENARIOS
  # ==================================================

  Scenario: User handles worker failure
    Given I have a worker that encounters an error
    When the worker fails during execution
    Then I should see the failure notification
    And I should be able to view error details
    And I should be able to restart or reassign the task

  Scenario: User handles validation timeouts
    Given I have validation stages that might timeout
    When a validation stage exceeds its timeout
    Then I should see a timeout notification
    And I should be able to adjust timeout settings
    And I should be able to retry the validation

  Scenario: User handles network connectivity issues
    Given I am using the application
    When network connectivity is lost
    Then I should see appropriate error messages
    And the application should handle reconnection gracefully
    And data should not be lost during connection issues

  # ==================================================
  # ACCESSIBILITY AND USABILITY SCENARIOS
  # ==================================================

  Scenario: User navigates with keyboard only
    Given I am on any page of the application
    When I use only keyboard navigation
    Then I should be able to access all functionality
    And I should see clear focus indicators
    And I should be able to complete all workflows

  Scenario: User uses screen reader
    Given I am using a screen reader
    When I navigate through the application
    Then all content should be properly announced
    And all interactive elements should be accessible
    And the application structure should be clear

  Scenario: User accesses mobile interface
    Given I am using a mobile device
    When I access the application
    Then the interface should be responsive
    And all functionality should be available
    And the touch interface should be intuitive

  # ==================================================
  # DATA INTEGRITY SCENARIOS
  # ==================================================

  Scenario: User data persistence
    Given I have created tasks and configurations
    When I refresh the browser
    Then all my data should persist
    And the application state should be restored
    And no data should be lost

  Scenario: Concurrent user operations
    Given multiple users are using the system
    When users perform operations simultaneously
    Then data should remain consistent
    And operations should not conflict
    And each user should see accurate information

  Scenario: Database backup and recovery
    Given the system has been running with data
    When a database backup is created
    Then the backup should contain all current data
    And the backup should be restorable
    And restored data should match the original