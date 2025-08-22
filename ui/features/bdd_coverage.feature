Feature: BDD Test Coverage Analysis
  As a QA lead
  I want to track what percentage of BDD scenarios have associated Playwright tests
  So that I can ensure complete test automation coverage

  Background:
    Given I am on the BDD Tests Dashboard
    And I navigate to the "Test Coverage" tab

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