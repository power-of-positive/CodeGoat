Feature: Agent Analytics Data Filtering
  As a developer
  I want to switch between different agents in the analytics page
  So that I can view agent-specific analytics data

  Background:
    Given I am on the analytics page
    And I wait for the page to load

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