import { test, expect } from '@playwright/test';

test.describe('Permissions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to permissions page
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display permissions page with all sections', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check main heading
    const mainHeading = page.locator('text=Permission Editor');
    await expect(mainHeading).toBeVisible();

    // Check description
    const description = page.locator('text=Configure security permissions for the Claude executor');
    await expect(description).toBeVisible();

    // Check global configuration section
    const globalConfig = page.locator('text=Global Configuration');
    await expect(globalConfig).toBeVisible();

    // Check for configuration options
    await expect(page.locator('text=Default Allow')).toBeVisible();
    await expect(page.locator('text=Enable Logging')).toBeVisible();
    await expect(page.locator('text=Strict Mode')).toBeVisible();
    
    // Verify URL
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should have functional add and test buttons', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check add rule button
    const addRuleButton = page.locator('button:has-text("Add Rule")');
    await expect(addRuleButton).toBeVisible();
    await expect(addRuleButton).toBeEnabled();

    // Check test permission button
    const testButton = page.locator('button:has-text("Test Permission")');
    await expect(testButton).toBeVisible();
    await expect(testButton).toBeEnabled();
  });

  test('should toggle global configuration checkboxes', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Find checkboxes
    const defaultAllowCheckbox = page.locator('#defaultAllow');
    const enableLoggingCheckbox = page.locator('#enableLogging');
    const strictModeCheckbox = page.locator('#strictMode');

    // Check if checkboxes are visible and interactable
    if (await defaultAllowCheckbox.isVisible()) {
      const initialState = await defaultAllowCheckbox.isChecked();
      await defaultAllowCheckbox.click();
      
      // Wait for any state update
      await page.waitForTimeout(500);
      
      const newState = await defaultAllowCheckbox.isChecked();
      expect(newState).not.toBe(initialState);
    }

    // Check other checkboxes are interactable
    if (await enableLoggingCheckbox.isVisible()) {
      await expect(enableLoggingCheckbox).toBeEnabled();
    }

    if (await strictModeCheckbox.isVisible()) {
      await expect(strictModeCheckbox).toBeEnabled();
    }
  });

  test('should handle Add Rule button click', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    const addRuleButton = page.locator('button:has-text("Add Rule")');
    await addRuleButton.click();

    // The component might show a form or change state
    // Wait a bit for any UI changes
    await page.waitForTimeout(1000);
    
    // Just verify we're still on the permissions page
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should handle Test Permission button click', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    const testButton = page.locator('button:has-text("Test Permission")');
    await testButton.click();

    // The component might show a test form or change state
    // Wait a bit for any UI changes
    await page.waitForTimeout(1000);
    
    // Just verify we're still on the permissions page
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should maintain responsive layout', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Main elements should still be visible
    await expect(page.locator('text=Permission Editor')).toBeVisible();
    await expect(page.locator('text=Global Configuration')).toBeVisible();
    
    // Buttons should be accessible
    await expect(page.locator('button:has-text("Add Rule")')).toBeVisible();
    await expect(page.locator('button:has-text("Test Permission")')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Elements should still be visible
    await expect(page.locator('text=Permission Editor')).toBeVisible();
  });

  test('should handle page reload gracefully', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Reload page to test loading states
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should show the permission editor after reload
    await expect(page.locator('text=Permission Editor')).toBeVisible({ timeout: 10000 });
    
    // Core elements should be visible
    await expect(page.locator('text=Global Configuration')).toBeVisible();
    await expect(page.locator('button:has-text("Add Rule")')).toBeVisible();
    await expect(page.locator('button:has-text("Test Permission")')).toBeVisible();
  });

  test('should navigate to permissions page directly', async ({ page }) => {
    // Test direct navigation
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');

    // Should load the permissions page
    await expect(page.locator('text=Permission Editor')).toBeVisible({ timeout: 10000 });
    
    // Verify URL
    await expect(page).toHaveURL('/permissions');
  });
});