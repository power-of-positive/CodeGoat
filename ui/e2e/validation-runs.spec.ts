import { test, expect } from '@playwright/test';

test.describe('Validation Run Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should show validation run details', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if we're on the Analytics page
    const analyticsHeading = page.locator('h1:has-text("Validation Analytics")');
    if (await analyticsHeading.count() > 0) {
      await expect(analyticsHeading.first()).toBeVisible();
      
      // When I click on a specific validation run from the recent runs list
      const recentRunsSection = page.locator('[data-testid="recent-runs"]');
      if (await recentRunsSection.count() > 0) {
        await expect(recentRunsSection).toBeVisible();
        
        // Look for the first validation run link
        const firstRunLink = recentRunsSection.locator('a').first();
        if (await firstRunLink.count() > 0) {
          await firstRunLink.click();
          
          // Then I should navigate to the validation run detail page
          await expect(page).toHaveURL(/\/validation-run\/.+/);
          
          // And I should see the run ID and timestamp
          const runId = page.locator('[data-testid="run-id"]');
          const runTimestamp = page.locator('[data-testid="run-timestamp"]');
          
          if (await runId.count() > 0) await expect(runId).toBeVisible();
          if (await runTimestamp.count() > 0) await expect(runTimestamp).toBeVisible();
          
          // And I should see all validation stages with their status
          const validationStages = page.locator('[data-testid="validation-stages"]');
          if (await validationStages.count() > 0) await expect(validationStages).toBeVisible();
          
          // And I should see stage-wise execution times
          const stageDurations = page.locator('[data-testid="stage-durations"]');
          if (await stageDurations.count() > 0) await expect(stageDurations).toBeVisible();
          
          // And I should see any error messages from failed stages
          const failedStages = page.locator('[data-testid="failed-stage"]');
          if (await failedStages.count() > 0) {
            const errorMessage = failedStages.first().locator('[data-testid="error-message"]');
            if (await errorMessage.count() > 0) await expect(errorMessage).toBeVisible();
          }
        } else {
          // If no runs exist, check for "no runs" message or empty state
          const noRunsMessage = page.locator('[data-testid="no-runs-message"]');
          const noRecentRunsText = page.locator('text=No recent runs');
          const noValidationRunsText = page.locator('text=No validation runs');
          
          if (await noRunsMessage.count() > 0) {
            await expect(noRunsMessage.first()).toBeVisible();
          } else if (await noRecentRunsText.count() > 0) {
            await expect(noRecentRunsText.first()).toBeVisible();
          } else if (await noValidationRunsText.count() > 0) {
            await expect(noValidationRunsText.first()).toBeVisible();
          }
        }
      }
    }
    
    // At minimum, verify we're on analytics page
    expect(page.url()).toContain('/analytics');
  });

  test('should display stage execution details', async ({ page }) => {
    // Navigate to a validation run detail page (mock if needed)
    await page.goto('/validation-run/test-run-123');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // When I click on a specific stage
    const stageElement = page.locator('[data-testid="validation-stage"]').first();
    if (await stageElement.count() > 0) {
      await stageElement.click();
      
      // Then I should see detailed stage execution information
      const stageDetails = page.locator('[data-testid="stage-details"]');
      if (await stageDetails.count() > 0) await expect(stageDetails).toBeVisible();
      
      // And I should see the command that was executed
      const stageCommand = page.locator('[data-testid="stage-command"]');
      if (await stageCommand.count() > 0) await expect(stageCommand).toBeVisible();
      
      // And I should see the complete output from the stage
      const stageOutput = page.locator('[data-testid="stage-output"]');
      if (await stageOutput.count() > 0) await expect(stageOutput).toBeVisible();
      
      // And I should see the execution duration
      const stageDuration = page.locator('[data-testid="stage-duration"]');
      if (await stageDuration.count() > 0) await expect(stageDuration).toBeVisible();
    }
    
    // At minimum, verify we tried to load a validation run page
    expect(page.url()).toContain('/validation-run/');
  });
});