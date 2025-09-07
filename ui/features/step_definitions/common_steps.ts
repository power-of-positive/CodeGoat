import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Navigation steps
Given('I am on the {string} page', async function (this: CustomWorld, pageName: string) {
  const pageRoutes: { [key: string]: string } = {
    login: '/login',
    dashboard: '/',
    analytics: '/analytics',
    tasks: '/tasks',
    workers: '/workers',
    'bdd tests': '/bdd-tests',
    'bdd-tests': '/bdd-tests',
    settings: '/settings',
  };

  const route = pageRoutes[pageName.toLowerCase()] || `/${pageName.toLowerCase()}`;
  await this.navigateTo(route);
});

Given('I navigate to the {string} page', async function (this: CustomWorld, pageName: string) {
  const pageRoutes: { [key: string]: string } = {
    'BDD Tests Dashboard': '/bdd-tests',
    Analytics: '/analytics',
    'Workers Dashboard': '/workers',
    'Task Analytics': '/tasks',
  };

  const route = pageRoutes[pageName] || `/${pageName.toLowerCase().replace(/\s+/g, '-')}`;
  await this.navigateTo(route);
});

// UI Interaction steps
When('I click the {string} button', async function (this: CustomWorld, buttonText: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.getByRole('button', { name: buttonText }).click();
});

When('I click {string}', async function (this: CustomWorld, text: string) {
  if (!this.page) throw new Error('Page not initialized');
  // Try button first, then any clickable element
  const button = this.page.getByRole('button', { name: text });
  if (await button.isVisible()) {
    await button.click();
  } else {
    await this.page.getByText(text).click();
  }
});

When(
  'I select {string} from the {string} dropdown',
  async function (this: CustomWorld, optionText: string, dropdownLabel: string) {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.getByLabel(dropdownLabel).click();
    await this.page.getByText(optionText).click();
  }
);

When(
  'I enter {string} in the {string} field',
  async function (this: CustomWorld, text: string, fieldLabel: string) {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.getByLabel(fieldLabel).fill(text);
  }
);

When('I filter by {string}', async function (this: CustomWorld, filterValue: string) {
  if (!this.page) throw new Error('Page not initialized');
  // Look for filter dropdown or input
  const filterSelect = this.page.locator('select').first();
  if (await filterSelect.isVisible()) {
    await filterSelect.selectOption(filterValue);
  } else {
    // Try finding by placeholder or label
    const filterInput = this.page.getByPlaceholder(/filter|search/i);
    if (await filterInput.isVisible()) {
      await filterInput.fill(filterValue);
    }
  }
});

// Verification steps
Then('I should see {string}', async function (this: CustomWorld, text: string) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.getByText(text)).toBeVisible();
});

Then('I should see a {string}', async function (this: CustomWorld, elementDescription: string) {
  if (!this.page) throw new Error('Page not initialized');

  const elementSelectors: { [key: string]: string } = {
    'list of all BDD scenarios': '[data-testid="bdd-scenarios-list"], .scenario-list',
    'success message': '.success-message, .alert-success',
    'error message': '.error-message, .alert-error',
    'loading indicator': '.loading, .spinner, [data-testid="loading"]',
    'welcome message': '.welcome-message, [data-testid="welcome"]',
  };

  const selector = elementSelectors[elementDescription.toLowerCase()];
  if (selector) {
    await expect(this.page.locator(selector)).toBeVisible();
  } else {
    // Fallback to text search
    await expect(this.page.getByText(new RegExp(elementDescription, 'i'))).toBeVisible();
  }
});

Then('I should see the {string} section', async function (this: CustomWorld, sectionName: string) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator(`[data-testid="${sectionName.toLowerCase().replace(/\s+/g, '-')}-section"]`)
  ).toBeVisible();
});

// Tab navigation steps
When('I switch to the {string} tab', async function (this: CustomWorld, tabName: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.getByRole('tab', { name: tabName }).click();
});

When('I navigate to the {string} tab', async function (this: CustomWorld, tabName: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.getByRole('tab', { name: tabName }).click();
});

// Status and state verification
Then(
  'I should see their current status \\({string}\\)',
  async function (this: CustomWorld, statuses: string) {
    if (!this.page) throw new Error('Page not initialized');
    const statusList = statuses.split(', ');

    for (const status of statusList) {
      await expect(this.page.getByText(status.trim())).toBeVisible();
    }
  }
);

Then(
  'I should see which scenarios are linked to Playwright tests',
  async function (this: CustomWorld) {
    if (!this.page) throw new Error('Page not initialized');
    // Look for linked indicator
    await expect(this.page.locator('[data-testid*="linked"], .linked-indicator')).toBeVisible();
  }
);

Then('I should see which scenarios have no test coverage', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  // Look for unlinked indicator
  await expect(this.page.locator('[data-testid*="unlinked"], .unlinked-indicator')).toBeVisible();
});

// Form and input steps
When('I fill in the scenario details', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');

  await this.page.getByLabel(/title|name/i).fill('Test Scenario');
  await this.page.getByLabel(/description/i).fill('A test scenario for demonstration');
  await this.page.getByLabel(/feature/i).fill('Test Feature');
});

When('I enter the Gherkin content', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');

  const gherkinContent = `
Feature: Sample Feature
  As a user
  I want to test functionality
  So that I can verify it works

  Scenario: Sample scenario
    Given I am on the test page
    When I perform an action
    Then I should see the result
  `;

  await this.page.getByLabel(/gherkin|content/i).fill(gherkinContent);
});

// Wait steps
When('I wait for the page to load', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.waitForLoadState('networkidle');
});

Then('the page should load successfully', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page).toHaveTitle(/.+/); // Should have some title
});

// Analytics and metrics steps
Then('I should see the overall BDD coverage percentage', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="coverage-percentage"], .coverage-metric')
  ).toBeVisible();
});

Then('I should see total number of BDD scenarios', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="total-scenarios"], .scenarios-count')
  ).toBeVisible();
});

Then(
  'I should see number of scenarios with linked Playwright tests',
  async function (this: CustomWorld) {
    if (!this.page) throw new Error('Page not initialized');
    await expect(
      this.page.locator('[data-testid="linked-scenarios"], .linked-count')
    ).toBeVisible();
  }
);

Then('I should see number of scenarios without test coverage', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(
    this.page.locator('[data-testid="unlinked-scenarios"], .unlinked-count')
  ).toBeVisible();
});
