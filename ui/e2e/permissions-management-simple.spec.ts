import { test, expect } from '@playwright/test';

test.describe('Permissions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the permissions page
    await page.goto('/');

    // Wait for the dashboard to load
    await page.waitForSelector('a:has-text("Permissions")', { timeout: 10000 });

    // Click on the Permissions tab
    await page.click('a:has-text("Permissions")');

    // Wait for permissions content to load
    await page.waitForSelector('h1:has-text("Permission Editor")', { timeout: 10000 });
  });

  test('should display permissions page', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Check description
    await expect(
      page.locator('p:has-text("Configure security permissions for the Claude executor")')
    ).toBeVisible();
  });

  test('should show global configuration section', async ({ page }) => {
    // Check global configuration section
    await expect(page.locator('h2:has-text("Global Configuration")')).toBeVisible();

    // Check for configuration checkboxes
    await expect(page.locator('label:has-text("Default Allow")')).toBeVisible();
    await expect(page.locator('label:has-text("Enable Logging")')).toBeVisible();
    await expect(page.locator('label:has-text("Strict Mode")')).toBeVisible();
  });

  test('should have functional buttons', async ({ page }) => {
    // Check add rule button
    const addRuleButton = page.locator('button:has-text("Add Rule")');
    await expect(addRuleButton).toBeVisible();
    await expect(addRuleButton).toBeEnabled();

    // Check test permission button
    const testButton = page.locator('button:has-text("Test Permission")');
    await expect(testButton).toBeVisible();
    await expect(testButton).toBeEnabled();
  });

  test('should toggle global configuration options', async ({ page }) => {
    // Find checkboxes
    const defaultAllowCheckbox = page.locator('#defaultAllow');
    const enableLoggingCheckbox = page.locator('#enableLogging');
    const strictModeCheckbox = page.locator('#strictMode');

    // Check if checkboxes are interactable
    if (await defaultAllowCheckbox.isVisible()) {
      const initialState = await defaultAllowCheckbox.isChecked();
      await defaultAllowCheckbox.click();
      const newState = await defaultAllowCheckbox.isChecked();
      expect(newState).not.toBe(initialState);
    }

    if (await enableLoggingCheckbox.isVisible()) {
      await expect(enableLoggingCheckbox).toBeEnabled();
    }

    if (await strictModeCheckbox.isVisible()) {
      await expect(strictModeCheckbox).toBeEnabled();
    }
  });

  test('should open add rule dialog when clicking Add Rule', async ({ page }) => {
    // Click add rule button
    await page.click('button:has-text("Add Rule")');

    // Check that a form or dialog appeared
    // This will depend on the actual implementation
    await page.waitForTimeout(1000); // Give time for dialog to appear

    // Look for common dialog/form indicators
    const dialogElements = await page.locator('[role="dialog"], .modal, form').count();
    expect(dialogElements).toBeGreaterThan(0);
  });

  test('should open test permission dialog when clicking Test Permission', async ({ page }) => {
    // Click test permission button
    await page.click('button:has-text("Test Permission")');

    // Check that a form or dialog appeared
    await page.waitForTimeout(1000); // Give time for dialog to appear

    // Look for common dialog/form indicators
    const dialogElements = await page.locator('[role="dialog"], .modal, form').count();
    expect(dialogElements).toBeGreaterThan(0);
  });

  test('should handle page loading states', async ({ page }) => {
    // Reload page to see loading state
    await page.reload();

    // Should eventually show the permission editor
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Main elements should still be visible
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Buttons should be accessible
    await expect(page.locator('button:has-text("Add Rule")')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should navigate properly via URL', async ({ page }) => {
    // Direct navigation to permissions
    await page.goto('/permissions');

    // Should load the permissions page
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/permissions');
  });

  test('should show consistent styling', async ({ page }) => {
    // Check that key UI elements have consistent styling
    const heading = page.locator('h1:has-text("Permission Editor")');
    await expect(heading).toHaveCSS('font-weight', '700'); // Bold heading

    // Check that buttons have consistent styling
    const addButton = page.locator('button:has-text("Add Rule")');
    await expect(addButton).toBeVisible();

    const testButton = page.locator('button:has-text("Test Permission")');
    await expect(testButton).toBeVisible();
  });
});
