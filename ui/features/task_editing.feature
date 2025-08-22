Feature: Task Editing on Tasks Board
  As a project manager
  I want to edit tasks directly on the tasks board
  So that I can quickly update task details without navigating away

  Background:
    Given I am on the tasks page
    And I wait for the page to load

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