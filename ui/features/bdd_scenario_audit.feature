Feature: BDD Scenario Audit and Linking
  As a QA engineer
  I want to audit existing BDD scenarios and link them to Playwright tests via Cucumber
  So that I can ensure complete test coverage and traceability

  Background:
    Given I am on the BDD Tests Dashboard
    And I wait for the page to load

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