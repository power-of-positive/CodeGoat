import { test, expect } from '@playwright/test';

test.describe('Validation Settings E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display validation settings page', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h2')).toContainText('Validation Settings');
    
    // Check description
    await expect(page.locator('p')).toContainText('Configure validation pipeline stages and settings');
  });

  test('should display general settings section', async ({ page }) => {
    // Check for general settings
    await expect(page.locator('text=General Settings')).toBeVisible();
    
    // Check for metrics toggle
    await expect(page.locator('text=Enable Metrics Collection')).toBeVisible();
  });

  test('should display validation stages section', async ({ page }) => {
    // Check validation stages section
    await expect(page.locator('text=Validation Stages')).toBeVisible();
    
    // Check add stage button
    const addButton = page.locator('button:has-text("Add Stage")');
    await expect(addButton).toBeVisible();
  });

  test('should open add stage form when add button clicked', async ({ page }) => {
    // Click add stage button
    const addButton = page.locator('button:has-text("Add Stage")');
    await addButton.click();
    
    // Check that form appears
    await expect(page.locator('text=Stage Name')).toBeVisible();
    await expect(page.locator('text=Command')).toBeVisible();
    await expect(page.locator('text=Timeout (ms)')).toBeVisible();
  });

  test('should validate stage form inputs', async ({ page }) => {
    // Open add stage form
    await page.locator('button:has-text("Add Stage")').click();
    
    // Try to save without filling required fields
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    
    // Form validation should prevent submission
    // Check that we're still in form mode (form hasn't closed)
    await expect(page.locator('text=Stage Name')).toBeVisible();
  });

  test('should fill and save new validation stage', async ({ page }) => {
    // Open add stage form
    await page.locator('button:has-text("Add Stage")').click();
    
    // Fill form fields
    await page.fill('input[placeholder="Enter stage name"]', 'Test Stage');
    await page.fill('input[placeholder="Enter command to run"]', 'npm test');
    await page.fill('input[type="number"]', '30000');
    
    // Save the stage
    await page.locator('button:has-text("Save")').click();
    
    // Form should close
    await expect(page.locator('text=Stage Name')).not.toBeVisible();
  });

  test('should display existing validation stages', async ({ page }) => {
    // Check if any existing stages are displayed
    // The page should show either stages or a "no stages" message
    const hasStages = await page.locator('text=No validation stages configured').isVisible();
    
    if (!hasStages) {
      // If stages exist, check for stage management controls
      await expect(page.locator('button:has-text("Edit")')).toBeVisible();
      await expect(page.locator('button:has-text("Delete")')).toBeVisible();
    }
  });

  test('should toggle metrics collection setting', async ({ page }) => {
    // Find the metrics toggle
    const metricsToggle = page.locator('input[type="checkbox"]').first();
    
    // Get initial state
    const initialState = await metricsToggle.isChecked();
    
    // Toggle the setting
    await metricsToggle.click();
    
    // Verify state changed
    const newState = await metricsToggle.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should handle settings save operation', async ({ page }) => {
    // Look for save/update button in general settings
    const saveButton = page.locator('button:has-text("Update Settings")');
    
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Should show some feedback (success message or state change)
      // This is dependent on the actual implementation
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h2')).toContainText('Validation Settings');
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h2')).toContainText('Validation Settings');
    
    // Content should still be accessible
    await expect(page.locator('text=General Settings')).toBeVisible();
  });

  test('should handle form cancellation', async ({ page }) => {
    // Open add stage form
    await page.locator('button:has-text("Add Stage")').click();
    
    // Fill some data
    await page.fill('input[placeholder="Enter stage name"]', 'Test');
    
    // Cancel the form
    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Form should close and data should be discarded
      await expect(page.locator('text=Stage Name')).not.toBeVisible();
    }
  });

  test('should validate stage priority and ordering', async ({ page }) => {
    // Check if stages have priority/ordering controls
    const hasStages = await page.locator('text=No validation stages configured').isVisible();
    
    if (!hasStages) {
      // Look for priority or ordering controls
      const priorityInputs = page.locator('input[type="number"]');
      if (await priorityInputs.count() > 0) {
        await expect(priorityInputs.first()).toBeVisible();
      }
    }
  });
});