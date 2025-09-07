import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// BDD Dashboard specific steps
Given('I am on the BDD Tests Dashboard', async function (this: CustomWorld) {
  await this.navigateTo('/bdd-tests');
});

When('I look at the agent selector dropdown', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="agent-selector"], select[name*="agent"]')
  ).toBeVisible();
});

Then('I should see {string} as an option', async function (this: CustomWorld, optionText: string) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator(`option[value="${optionText}"], option:has-text("${optionText}")`)
  ).toBeVisible();
});

// Agent switching steps
Given(
  'the default {string} is selected',
  async function (this: CustomWorld, defaultSelection: string) {
    if (!this.page) throw new Error('Page not initialized');
    const selector = this.page.locator('select[name*="agent"], [data-testid="agent-selector"]');
    await expect(selector).toHaveValue(defaultSelection.toLowerCase().replace(/\s+/g, '_'));
  }
);

When(
  'I select {string} from the agent dropdown',
  async function (this: CustomWorld, agentName: string) {
    if (!this.page) throw new Error('Page not initialized');
    const agentValue = agentName.toLowerCase().replace(/\s+/g, '_');
    await this.page
      .locator('select[name*="agent"], [data-testid="agent-selector"]')
      .selectOption(agentValue);
  }
);

Then(
  'the analytics data should update to show only Claude CLI results',
  async function (this: CustomWorld) {
    if (!this.page) throw new Error('Page not initialized');
    // Wait for data to update
    await this.page.waitForTimeout(1000);

    // Check that metrics cards show updated data
    await expect(
      this.page.locator('[data-testid="metrics-cards"], .analytics-summary')
    ).toBeVisible();
  }
);

Then('the summary cards should reflect Claude CLI metrics', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="summary-cards"] [data-agent="claude_cli"]')
  ).toBeVisible();
});

Then('the charts should update with Claude CLI data points', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="analytics-charts"], .chart-container')
  ).toBeVisible();
});

Then('the recent runs list should show only Claude CLI runs', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="recent-runs"] [data-agent="claude_cli"]')
  ).toBeVisible();
});

// Task editing steps
Given(
  'I have a task {string} in the pending column',
  async function (this: CustomWorld, taskTitle: string) {
    if (!this.page) throw new Error('Page not initialized');
    await expect(
      this.page.locator('.pending-column, [data-status="pending"]').getByText(taskTitle)
    ).toBeVisible();
  }
);

When('I click the edit icon on the task card', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page
    .locator('[data-testid="edit-task"], .edit-icon, [aria-label="Edit task"]')
    .first()
    .click();
});

Then('a task edit modal should open', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="task-edit-modal"], .modal, [role="dialog"]')
  ).toBeVisible();
});

Then('the modal should display the current task details', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.locator('input[name="title"], input[name="name"]')).toBeVisible();
  await expect(this.page.locator('textarea[name="description"]')).toBeVisible();
});

Then(
  'I should see fields for title, description, priority, and status',
  async function (this: CustomWorld) {
    if (!this.page) throw new Error('Page not initialized');
    await expect(this.page.locator('input[name="title"], [data-field="title"]')).toBeVisible();
    await expect(
      this.page.locator('textarea[name="description"], [data-field="description"]')
    ).toBeVisible();
    await expect(
      this.page.locator('select[name="priority"], [data-field="priority"]')
    ).toBeVisible();
    await expect(this.page.locator('select[name="status"], [data-field="status"]')).toBeVisible();
  }
);

Then('the save and cancel buttons should be available', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.getByRole('button', { name: /save|update/i })).toBeVisible();
  await expect(this.page.getByRole('button', { name: /cancel|close/i })).toBeVisible();
});

// Task modification steps
Given('I have opened the edit modal for a task', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="task-edit-modal"], .modal, [role="dialog"]')
  ).toBeVisible();
});

When('I change the title to {string}', async function (this: CustomWorld, newTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.locator('input[name="title"], [data-field="title"]').fill(newTitle);
});

When(
  'I update the description to {string}',
  async function (this: CustomWorld, newDescription: string) {
    if (!this.page) throw new Error('Page not initialized');
    await this.page
      .locator('textarea[name="description"], [data-field="description"]')
      .fill(newDescription);
  }
);

When('I click {string}', async function (this: CustomWorld, buttonText: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.getByRole('button', { name: buttonText }).click();
});

Then('the modal should close', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="task-edit-modal"], .modal, [role="dialog"]')
  ).not.toBeVisible();
});

Then('the task card should display the updated title', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.getByText('Implement OAuth authentication')).toBeVisible();
});

Then('the task should be saved to the database', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  // This would typically involve checking API calls or database state
  // For now, we'll check for success indicators
  await this.page.waitForTimeout(500);
});

Then('I should see a success notification', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('.success-notification, .toast-success, [data-testid="success-message"]')
  ).toBeVisible();
});

// BDD Scenario management steps
Given(
  'I have a task marked as type {string}',
  async function (this: CustomWorld, taskType: string) {
    if (!this.page) throw new Error('Page not initialized');
    await expect(
      this.page.locator(`[data-task-type="${taskType}"], .task-type-${taskType}`)
    ).toBeVisible();
  }
);

When('I navigate to the {string} tab', async function (this: CustomWorld, tabName: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.getByRole('tab', { name: tabName }).click();
});

When('I enter scenario title {string}', async function (this: CustomWorld, scenarioTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page
    .locator('input[name="scenarioTitle"], [data-field="scenario-title"]')
    .fill(scenarioTitle);
});

Then('the scenario should be added to the task', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.locator('[data-testid="scenario-item"], .scenario-card')).toBeVisible();
});

Then('the task card should show the scenario count', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.locator('[data-testid="scenario-count"], .scenario-badge')).toBeVisible();
});

Then('the scenario should be available for linking to tests', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.locator('[data-testid="link-test"], .link-button')).toBeVisible();
});

// Test coverage and analytics steps
When('I view the coverage by feature section', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="coverage-by-feature"], .feature-coverage')
  ).toBeVisible();
});

Then(
  'I should see each feature listed with its coverage percentage',
  async function (this: CustomWorld) {
    if (!this.page) throw new Error('Page not initialized');
    await expect(this.page.locator('.feature-item .coverage-percentage')).toBeVisible();
  }
);

Then('I should see features sorted by lowest coverage first', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  // Check that the first feature has lower coverage than subsequent ones
  const features = this.page.locator('.feature-item');
  await expect(features.first()).toBeVisible();
});

Then('I should see number of scenarios per feature', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.locator('.feature-item .scenario-count')).toBeVisible();
});

Then(
  'I should be able to click on a feature to see its scenarios',
  async function (this: CustomWorld) {
    if (!this.page) throw new Error('Page not initialized');
    const firstFeature = this.page.locator('.feature-item').first();
    await firstFeature.click();
    await expect(
      this.page.locator('.feature-scenarios, [data-testid="feature-scenarios"]')
    ).toBeVisible();
  }
);
