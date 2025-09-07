import { test, expect } from '@playwright/test';

test.describe('Permissions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to permissions page
    await page.goto('/permissions', { waitUntil: 'domcontentloaded' });
    // Give React time to mount
    await page.waitForTimeout(3000);
  });

  test('should display permissions page with all sections', async ({ page }) => {
    // Page should already be loaded from beforeEach

    // Wait for either loading state or content to appear
    await page.waitForSelector('h1, text=Loading', { timeout: 10000 });

    // Check if still loading - if so, wait for content
    const isLoading = await page
      .locator('text=Loading permissions configuration')
      .isVisible()
      .catch(() => false);
    if (isLoading) {
      // Wait for actual content with extended timeout
      await page.waitForSelector('h1:has-text("Permission Editor")', { timeout: 30000 });
    }

    // Check main heading
    const mainHeading = page.locator('h1:has-text("Permission Editor")');
    await expect(mainHeading).toBeVisible({ timeout: 15000 });

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
    // Wait for the page to be ready
    await page.waitForTimeout(1000);

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
    // Wait for checkboxes to be ready
    await page.waitForSelector('#defaultAllow', { timeout: 5000 });

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
    // Wait for the button to be ready
    await page.waitForSelector('button:has-text("Add Rule")', { timeout: 5000 });

    const addRuleButton = page.locator('button:has-text("Add Rule")');
    await addRuleButton.click();

    // The component might show a form or change state
    // Wait a bit for any UI changes
    await page.waitForTimeout(1000);

    // Just verify we're still on the permissions page
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should handle Test Permission button click', async ({ page }) => {
    // Wait for the button to be ready
    await page.waitForSelector('button:has-text("Test Permission")', { timeout: 5000 });

    const testButton = page.locator('button:has-text("Test Permission")');
    await testButton.click();

    // The component might show a test form or change state
    // Wait a bit for any UI changes
    await page.waitForTimeout(1000);

    // Just verify we're still on the permissions page
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should maintain responsive layout', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('h1, text=Loading', { timeout: 10000 });

    // Check if still loading
    const isLoading = await page
      .locator('text=Loading permissions configuration')
      .isVisible()
      .catch(() => false);
    if (isLoading) {
      // Wait for actual content
      await page.waitForSelector('h1:has-text("Permission Editor")', { timeout: 30000 });
    }

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Allow time for viewport change

    // Main elements should still be visible
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();
    await expect(page.locator('text=Global Configuration')).toBeVisible();

    // Buttons should be accessible
    await expect(page.locator('button:has-text("Add Rule")')).toBeVisible();
    await expect(page.locator('button:has-text("Test Permission")')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500); // Allow time for viewport change

    // Elements should still be visible
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();
  });

  test('should handle page reload gracefully', async ({ page }) => {
    // Initial page should be loaded from beforeEach

    // Reload page to test loading states
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Allow React to re-mount

    // Wait for either loading state or content
    await page.waitForSelector('h1, text=Loading', { timeout: 10000 });

    // Check if still loading
    const isLoading = await page
      .locator('text=Loading permissions configuration')
      .isVisible()
      .catch(() => false);
    if (isLoading) {
      // Wait for actual content with extended timeout
      await page.waitForSelector('h1:has-text("Permission Editor")', { timeout: 30000 });
    }

    // Should show the permission editor after reload
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible({ timeout: 15000 });

    // Core elements should be visible
    await expect(page.locator('text=Global Configuration')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Add Rule")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Test Permission")')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should navigate to permissions page directly', async ({ page }) => {
    // Test direct navigation (override beforeEach navigation)
    await page.goto('/permissions', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Allow React to mount

    // Wait for either loading state or content
    await page.waitForSelector('h1, text=Loading', { timeout: 10000 });

    // Check if still loading
    const isLoading = await page
      .locator('text=Loading permissions configuration')
      .isVisible()
      .catch(() => false);
    if (isLoading) {
      // Wait for actual content with extended timeout
      await page.waitForSelector('h1:has-text("Permission Editor")', { timeout: 30000 });
    }

    // Should load the permissions page
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible({ timeout: 15000 });

    // Verify URL
    await expect(page).toHaveURL('/permissions');
  });
});
