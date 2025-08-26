import { test, expect } from '@playwright/test';

test.describe('Validation Run Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should show validation run details', async ({ page }) => {
    // Given I am on the Analytics page
    await expect(page.locator('h1')).toContainText('Analytics');
    
    // When I click on a specific validation run from the recent runs list
    const recentRunsSection = page.locator('[data-testid="recent-runs"]');
    await expect(recentRunsSection).toBeVisible();
    
    // Look for the first validation run link
    const firstRunLink = recentRunsSection.locator('a').first();
    if (await firstRunLink.count() > 0) {
      await firstRunLink.click();
      
      // Then I should navigate to the validation run detail page
      await expect(page).toHaveURL(/\/validation-run\/.+/);
      
      // And I should see the run ID and timestamp
      await expect(page.locator('[data-testid="run-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="run-timestamp"]')).toBeVisible();
      
      // And I should see all validation stages with their status
      await expect(page.locator('[data-testid="validation-stages"]')).toBeVisible();
      
      // And I should see stage-wise execution times
      await expect(page.locator('[data-testid="stage-durations"]')).toBeVisible();
      
      // And I should see any error messages from failed stages
      const failedStages = page.locator('[data-testid="failed-stage"]');
      if (await failedStages.count() > 0) {
        await expect(failedStages.first().locator('[data-testid="error-message"]')).toBeVisible();
      }
    } else {
      // If no runs exist, just verify the page structure
      await expect(page.locator('[data-testid="no-runs-message"]')).toBeVisible();
    }
  });

  test('should display stage execution details', async ({ page }) => {
    // Navigate to a validation run detail page (mock if needed)
    await page.goto('/validation-run/test-run-123');
    
    // When I click on a specific stage
    const stageElement = page.locator('[data-testid="validation-stage"]').first();
    if (await stageElement.count() > 0) {
      await stageElement.click();
      
      // Then I should see detailed stage execution information
      await expect(page.locator('[data-testid="stage-details"]')).toBeVisible();
      
      // And I should see the command that was executed
      await expect(page.locator('[data-testid="stage-command"]')).toBeVisible();
      
      // And I should see the complete output from the stage
      await expect(page.locator('[data-testid="stage-output"]')).toBeVisible();
      
      // And I should see the execution duration
      await expect(page.locator('[data-testid="stage-duration"]')).toBeVisible();
    }
  });
});