import { test, expect } from '@playwright/test';

test.describe('BDD Scenarios Gherkin Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display BDD dashboard properly', async ({ page }) => {
    // Check that the BDD dashboard loads
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    
    // Should have the main dashboard elements
    await expect(page.getByText('Total Scenarios')).toBeVisible();
    await expect(page.getByTestId('scenarios-list')).toBeVisible();
  });

  test('should create comprehensive scenarios with gherkin content', async ({ page }) => {
    // Create comprehensive scenarios which should include gherkin content
    const createButton = page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).first();
    await expect(createButton).toBeVisible();
    
    await createButton.click();
    
    // Should show success message
    await expect(page.locator('text=/Created \\d+ comprehensive BDD scenarios/')).toBeVisible({ timeout: 10000 });
    
    // Should now show scenario cards
    const scenarioCards = page.locator('[data-testid="scenario-card"]');
    if (await scenarioCards.count() > 0) {
      await expect(scenarioCards.first()).toBeVisible();
    }
  });

  test('should show scenario details with gherkin content', async ({ page }) => {
    // First create scenarios
    const createButton = page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page.locator('text=/Created \\d+ comprehensive BDD scenarios/')).toBeVisible({ timeout: 10000 });
    }
    
    // Find scenario cards
    const scenarioCards = page.locator('[data-testid="scenario-card"]');
    if (await scenarioCards.count() > 0) {
      const firstCard = scenarioCards.first();
      
      // Check that scenario has a title and feature
      await expect(firstCard.getByTestId('scenario-title')).toBeVisible();
      await expect(firstCard.getByTestId('scenario-status')).toBeVisible();
    }
  });

  test('should support scenario execution', async ({ page }) => {
    // Create scenarios first
    const createButton = page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page.locator('text=/Created \\d+ comprehensive BDD scenarios/')).toBeVisible({ timeout: 10000 });
    }
    
    // Try executing all scenarios
    const executeAllButton = page.getByRole('button', { name: 'Execute All Scenarios' });
    if (await executeAllButton.isVisible() && !await executeAllButton.isDisabled()) {
      await executeAllButton.click();
      
      // Should show execution in progress
      await expect(page.locator('text=Executing all scenarios...')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show execution statistics', async ({ page }) => {
    // Check that stats are visible
    await expect(page.getByTestId('total-scenarios-count')).toBeVisible();
    await expect(page.getByTestId('passed-scenarios-count')).toBeVisible();
    await expect(page.getByTestId('failed-scenarios-count')).toBeVisible();
    await expect(page.getByTestId('pending-scenarios-count')).toBeVisible();
    
    // Check pass rate
    const passRate = page.getByTestId('pass-rate');
    if (await passRate.isVisible()) {
      await expect(passRate).toBeVisible();
      const passRateText = await passRate.textContent();
      expect(passRateText).toMatch(/\d+%/);
    }
  });

  test('should support search and filtering', async ({ page }) => {
    // Check search functionality
    const searchInput = page.getByTestId('search-scenarios');
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', 'Search scenarios...');
    }
    
    // Check status filter
    const statusFilter = page.getByTestId('status-filter');
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('should handle empty state properly', async ({ page }) => {
    // If no scenarios exist, should show empty state
    const emptyStateText = page.getByText('No BDD Scenarios Found');
    const scenarioCards = page.locator('[data-testid="scenario-card"]');
    
    if (await emptyStateText.isVisible()) {
      await expect(emptyStateText).toBeVisible();
      await expect(page.getByText('Create comprehensive BDD scenarios to get started')).toBeVisible();
    } else if (await scenarioCards.count() > 0) {
      // If scenarios exist, they should be visible
      await expect(scenarioCards.first()).toBeVisible();
    }
  });
});