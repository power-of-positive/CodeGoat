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

  test('should display permissions page with all sections', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Check description
    await expect(
      page.locator('p:has-text("Configure security permissions for the Claude executor")')
    ).toBeVisible();

    // Check global configuration section
    await expect(page.locator('h2:has-text("Global Configuration")')).toBeVisible();

    // Check for configuration options
    await expect(page.locator('label:has-text("Default Allow")')).toBeVisible();
    await expect(page.locator('label:has-text("Enable Logging")')).toBeVisible();
    await expect(page.locator('label:has-text("Strict Mode")')).toBeVisible();
  });

  test('should have functional add and test buttons', async ({ page }) => {
    // Check add rule button
    const addRuleButton = page.locator('button:has-text("Add Rule")');
    await expect(addRuleButton).toBeVisible();
    await expect(addRuleButton).toBeEnabled();

    // Check test permission button
    const testButton = page.locator('button:has-text("Test Permission")');
    await expect(testButton).toBeVisible();
    await expect(testButton).toBeEnabled();
  });

  test('should add a new command permission rule', async ({ page }) => {
    // Count initial command rules
    const initialCount = await page.locator('[data-testid^="command-rule-"]').count();

    // Click add command rule button
    await page.click('button:has-text("Add Command Rule")');

    // Verify a new rule was added
    await expect(async () => {
      const currentCount = await page.locator('[data-testid^="command-rule-"]').count();
      expect(currentCount).toBe(initialCount + 1);
    }).toPass({ timeout: 5000 });

    // Check that the new rule has default values
    const newRule = page.locator('[data-testid^="command-rule-"]').last();
    await expect(newRule.locator('select[name$=".action"]')).toHaveValue('allow');
    await expect(newRule.locator('input[name$=".pattern"]')).toHaveValue('');
  });

  test('should add a new file permission rule', async ({ page }) => {
    // Count initial file rules
    const initialCount = await page.locator('[data-testid^="file-rule-"]').count();

    // Click add file rule button
    await page.click('button:has-text("Add File Rule")');

    // Verify a new rule was added
    await expect(async () => {
      const currentCount = await page.locator('[data-testid^="file-rule-"]').count();
      expect(currentCount).toBe(initialCount + 1);
    }).toPass({ timeout: 5000 });

    // Check that the new rule has default values
    const newRule = page.locator('[data-testid^="file-rule-"]').last();
    await expect(newRule.locator('select[name$=".action"]')).toHaveValue('allow');
    await expect(newRule.locator('input[name$=".path"]')).toHaveValue('');
  });

  test('should add a new API permission rule', async ({ page }) => {
    // Count initial API rules
    const initialCount = await page.locator('[data-testid^="api-rule-"]').count();

    // Click add API rule button
    await page.click('button:has-text("Add API Rule")');

    // Verify a new rule was added
    await expect(async () => {
      const currentCount = await page.locator('[data-testid^="api-rule-"]').count();
      expect(currentCount).toBe(initialCount + 1);
    }).toPass({ timeout: 5000 });

    // Check that the new rule has default values
    const newRule = page.locator('[data-testid^="api-rule-"]').last();
    await expect(newRule.locator('select[name$=".action"]')).toHaveValue('allow');
    await expect(newRule.locator('input[name$=".endpoint"]')).toHaveValue('');
  });

  test('should allow editing command rule values', async ({ page }) => {
    // Add a new command rule first
    await page.click('button:has-text("Add Command Rule")');

    // Wait for the new rule to appear
    await page.waitForSelector('[data-testid^="command-rule-"]');
    const newRule = page.locator('[data-testid^="command-rule-"]').last();

    // Edit the pattern field
    const patternInput = newRule.locator('input[name$=".pattern"]');
    await patternInput.fill('npm install');
    await expect(patternInput).toHaveValue('npm install');

    // Change the action to block
    const actionSelect = newRule.locator('select[name$=".action"]');
    await actionSelect.selectOption('block');
    await expect(actionSelect).toHaveValue('block');
  });

  test('should allow editing file rule values', async ({ page }) => {
    // Add a new file rule first
    await page.click('button:has-text("Add File Rule")');

    // Wait for the new rule to appear
    await page.waitForSelector('[data-testid^="file-rule-"]');
    const newRule = page.locator('[data-testid^="file-rule-"]').last();

    // Edit the path field
    const pathInput = newRule.locator('input[name$=".path"]');
    await pathInput.fill('/etc/**');
    await expect(pathInput).toHaveValue('/etc/**');

    // Change the action to block
    const actionSelect = newRule.locator('select[name$=".action"]');
    await actionSelect.selectOption('block');
    await expect(actionSelect).toHaveValue('block');
  });

  test('should allow editing API rule values', async ({ page }) => {
    // Add a new API rule first
    await page.click('button:has-text("Add API Rule")');

    // Wait for the new rule to appear
    await page.waitForSelector('[data-testid^="api-rule-"]');
    const newRule = page.locator('[data-testid^="api-rule-"]').last();

    // Edit the endpoint field
    const endpointInput = newRule.locator('input[name$=".endpoint"]');
    await endpointInput.fill('/api/dangerous');
    await expect(endpointInput).toHaveValue('/api/dangerous');

    // Change the action to block
    const actionSelect = newRule.locator('select[name$=".action"]');
    await actionSelect.selectOption('block');
    await expect(actionSelect).toHaveValue('block');
  });

  test('should remove permission rules', async ({ page }) => {
    // Add a new command rule first
    await page.click('button:has-text("Add Command Rule")');

    // Wait for the new rule to appear
    await page.waitForSelector('[data-testid^="command-rule-"]');
    const initialCount = await page.locator('[data-testid^="command-rule-"]').count();

    // Find and click the remove button for the last rule
    const lastRule = page.locator('[data-testid^="command-rule-"]').last();
    const removeButton = lastRule.locator('button:has([data-testid="trash-icon"])');
    await removeButton.click();

    // Verify the rule was removed
    await expect(async () => {
      const currentCount = await page.locator('[data-testid^="command-rule-"]').count();
      expect(currentCount).toBe(initialCount - 1);
    }).toPass({ timeout: 5000 });
  });

  test('should save permissions successfully', async ({ page }) => {
    // Add a new rule and modify it
    await page.click('button:has-text("Add Command Rule")');
    const newRule = page.locator('[data-testid^="command-rule-"]').last();
    await newRule.locator('input[name$=".pattern"]').fill('test-command');

    // Click save button
    const saveButton = page.locator('button:has-text("Save Permissions")');
    await saveButton.click();

    // Look for success notification or confirmation
    // This might be a toast notification or status indicator
    await expect(page.locator('text=/saved|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during save', async ({ page }) => {
    // Click save button
    const saveButton = page.locator('button:has-text("Save Permissions")');
    await saveButton.click();

    // Check that save button shows loading state
    await expect(saveButton).toBeDisabled();
  });

  test('should persist changes after page reload', async ({ page }) => {
    // Add and configure a rule
    await page.click('button:has-text("Add Command Rule")');
    const newRule = page.locator('[data-testid^="command-rule-"]').last();
    await newRule.locator('input[name$=".pattern"]').fill('persistent-test');
    await newRule.locator('select[name$=".action"]').selectOption('block');

    // Save changes
    await page.click('button:has-text("Save Permissions")');
    await page.waitForSelector('text=/saved|success/i', { timeout: 10000 });

    // Reload the page
    await page.reload();
    await page.waitForSelector('h1:has-text("Permission Editor")', { timeout: 10000 });

    // Verify the changes persisted
    const rules = page.locator('[data-testid^="command-rule-"]');
    const ruleWithPersistentTest = rules.filter({
      has: page.locator('input[value="persistent-test"]'),
    });
    await expect(ruleWithPersistentTest).toBeVisible();
    await expect(ruleWithPersistentTest.locator('select[name$=".action"]')).toHaveValue('block');
  });

  test('should handle form validation errors', async ({ page }) => {
    // Try to save with invalid data (empty required fields)
    await page.click('button:has-text("Add Command Rule")');
    const newRule = page.locator('[data-testid^="command-rule-"]').last();

    // Leave pattern empty and try to save
    await page.click('button:has-text("Save Permissions")');

    // Check for validation error
    await expect(page.locator('text=/error|invalid|required/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show permission rule count', async ({ page }) => {
    // Get initial counts
    const commandCount = await page.locator('[data-testid^="command-rule-"]').count();
    const fileCount = await page.locator('[data-testid^="file-rule-"]').count();
    const apiCount = await page.locator('[data-testid^="api-rule-"]').count();

    // Add rules and verify counts increase
    await page.click('button:has-text("Add Command Rule")');
    await expect(async () => {
      const newCount = await page.locator('[data-testid^="command-rule-"]').count();
      expect(newCount).toBe(commandCount + 1);
    }).toPass({ timeout: 5000 });
  });
});
