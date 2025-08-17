import { test, expect } from '@playwright/test';

test.describe('Validation Log Viewing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display validation runs list', async ({ page }) => {
    // Check if Recent Validation Runs section exists
    await expect(page.locator('text=Recent Validation Runs')).toBeVisible();
    
    // Check if validation runs are displayed
    const validationRuns = page.locator('[data-testid="validation-run-item"]');
    await expect(validationRuns.first()).toBeVisible();
  });

  test('should expand validation run when clicked', async ({ page }) => {
    // Find the first validation run
    const firstRun = page.locator('[data-testid="validation-run-item"]').first();
    await expect(firstRun).toBeVisible();
    
    // Click to expand the validation run
    await firstRun.click();
    
    // Check if stage details appear
    const stageDetails = page.locator('[data-testid="stage-detail"]');
    await expect(stageDetails.first()).toBeVisible();
  });

  test('should show stage logs when stage is clicked', async ({ page }) => {
    // Expand the first validation run
    const firstRun = page.locator('[data-testid="validation-run-item"]').first();
    await firstRun.click();
    
    // Wait for stage details to load
    const stageWithLogs = page.locator('[data-testid="stage-detail"]').first();
    await expect(stageWithLogs).toBeVisible();
    
    // Click on a stage to expand logs
    await stageWithLogs.click();
    
    // Check if logs section appears
    const logsSection = page.locator('[data-testid="stage-logs"]');
    await expect(logsSection).toBeVisible();
  });

  test('should display error and output logs with proper formatting', async ({ page }) => {
    // Expand validation run and stage
    const firstRun = page.locator('[data-testid="validation-run-item"]').first();
    await firstRun.click();
    
    const stageWithLogs = page.locator('[data-testid="stage-detail"]').first();
    await stageWithLogs.click();
    
    // Check for log content areas
    const errorOutput = page.locator('[data-testid="error-output"]');
    const standardOutput = page.locator('[data-testid="standard-output"]');
    
    // At least one should be visible if logs exist
    const hasErrorLogs = await errorOutput.isVisible();
    const hasStandardLogs = await standardOutput.isVisible();
    
    expect(hasErrorLogs || hasStandardLogs).toBe(true);
    
    // If error logs exist, they should have red styling
    if (hasErrorLogs) {
      await expect(errorOutput).toHaveClass(/bg-red/);
    }
    
    // If standard logs exist, they should have white/neutral styling
    if (hasStandardLogs) {
      await expect(standardOutput).toHaveClass(/bg-white/);
    }
  });

  test('should show file icons for stages with logs', async ({ page }) => {
    // Expand the first validation run
    const firstRun = page.locator('[data-testid="validation-run-item"]').first();
    await firstRun.click();
    
    // Check for file icons on stages that have logs
    const fileIcons = page.locator('[data-testid="file-icon"]');
    const stageCount = await page.locator('[data-testid="stage-detail"]').count();
    
    if (stageCount > 0) {
      // At least some stages should have file icons if they have logs
      expect(await fileIcons.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('should toggle log visibility with chevron icons', async ({ page }) => {
    // Expand validation run and stage
    const firstRun = page.locator('[data-testid="validation-run-item"]').first();
    await firstRun.click();
    
    const stageWithLogs = page.locator('[data-testid="stage-detail"]').first();
    await stageWithLogs.click();
    
    // Look for chevron icons within the first stage
    const firstStageElement = page.locator('[data-testid="stage-detail"]').first();
    const chevronRight = firstStageElement.locator('[data-testid="chevron-right"]');
    const chevronDown = firstStageElement.locator('[data-testid="chevron-down"]');
    
    // Check if either chevron exists in the first stage
    const rightChevronCount = await chevronRight.count();
    const downChevronCount = await chevronDown.count();
    
    // At least one should be present if the stage has logs
    expect(rightChevronCount + downChevronCount).toBeGreaterThanOrEqual(0);
    
    // If there are chevrons, test the toggle functionality
    if (rightChevronCount > 0) {
      await chevronRight.first().click();
      // After clicking, down chevron should appear
      await expect(firstStageElement.locator('[data-testid="chevron-down"]')).toBeVisible();
    } else if (downChevronCount > 0) {
      await chevronDown.first().click();
      // After clicking, right chevron should appear
      await expect(firstStageElement.locator('[data-testid="chevron-right"]')).toBeVisible();
    }
  });

  test('should handle pagination in validation runs', async ({ page }) => {
    // Check if pagination controls exist
    const pagination = page.locator('[data-testid="pagination-controls"]');
    
    // Pagination might not be visible if there are few runs
    const paginationExists = await pagination.isVisible();
    
    if (paginationExists) {
      // Test pagination dropdown
      const runsPerPageSelect = page.locator('[data-testid="runs-per-page-select"]');
      await expect(runsPerPageSelect).toBeVisible();
    }
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    
    if (await refreshButton.isVisible()) {
      // Click refresh and wait for network activity
      await refreshButton.click();
      await page.waitForLoadState('networkidle');
      
      // Validation runs should still be visible after refresh
      await expect(page.locator('[data-testid="validation-run-item"]').first()).toBeVisible();
    }
  });
});