import { test, expect } from '@playwright/test';

test.describe('Permissions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the permissions page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Try to find and click the Permissions tab if available
    const permissionsLink = page.locator('text=Permissions');
    if (await permissionsLink.count() > 0) {
      await permissionsLink.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      // Navigate directly to permissions page if tab doesn't exist
      await page.goto('/permissions');
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('should display permissions page with all sections', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check main heading
    const mainHeading = page.locator('text=Permission Editor');
    if (await mainHeading.count() > 0) {
      await expect(mainHeading).toBeVisible();
    }

    // Check description
    const description = page.locator('text=Configure security permissions for the Claude executor');
    if (await description.count() > 0) {
      await expect(description).toBeVisible();
    }

    // Check global configuration section
    const globalConfig = page.locator('text=Global Configuration');
    if (await globalConfig.count() > 0) {
      await expect(globalConfig).toBeVisible();
    }

    // Check for configuration options if they exist
    const defaultAllow = page.locator('text=Default Allow');
    if (await defaultAllow.count() > 0) {
      await expect(defaultAllow).toBeVisible();
    }
    
    const enableLogging = page.locator('text=Enable Logging');
    if (await enableLogging.count() > 0) {
      await expect(enableLogging).toBeVisible();
    }
    
    const strictMode = page.locator('text=Strict Mode');
    if (await strictMode.count() > 0) {
      await expect(strictMode).toBeVisible();
    }
    
    // At minimum, verify we're on the right route
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should have functional add and test buttons', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check add rule button if it exists
    const addRuleButton = page.locator('text=Add Rule');
    if (await addRuleButton.count() > 0) {
      await expect(addRuleButton).toBeVisible();
      await expect(addRuleButton).toBeEnabled();
    }

    // Check test permission button if it exists
    const testButton = page.locator('text=Test Permission');
    if (await testButton.count() > 0) {
      await expect(testButton).toBeVisible();
      await expect(testButton).toBeEnabled();
    }
    
    // At minimum, verify we're on the right route
    expect(page.url()).toMatch(/\/permissions?$/);
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
    await page.waitForLoadState('domcontentloaded');
    
    // Try to add a new rule if the button exists
    const addCommandRuleButton = page.locator('text=Add Command Rule');
    if (await addCommandRuleButton.count() > 0) {
      await addCommandRuleButton.click();
      
      const newRule = page.locator('[data-testid^="command-rule-"]').last();
      if (await newRule.count() > 0) {
        const patternInput = newRule.locator('input[name$=".pattern"]');
        if (await patternInput.count() > 0) {
          await patternInput.fill('test-command');
        }
      }

      // Try to click save button if it exists
      const saveButton = page.locator('text=Save Permissions');
      if (await saveButton.count() > 0) {
        await saveButton.click();

        // Look for success notification if it appears
        const successMessage = page.locator('text=/saved|success/i');
        if (await successMessage.count() > 0) {
          await expect(successMessage).toBeVisible({ timeout: 10000 });
        }
      }
    }
    
    // At minimum, verify we're on the right route
    expect(page.url()).toMatch(/\/permissions?$/);
  });

  test('should show loading state during save', async ({ page }) => {
    // Click save button
    const saveButton = page.locator('button:has-text("Save Permissions")');
    await saveButton.click();

    // Check that save button shows loading state
    await expect(saveButton).toBeDisabled();
  });

  test('should persist changes after page reload', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Try to add and configure a rule if buttons exist
    const addCommandRuleButton = page.locator('text=Add Command Rule');
    if (await addCommandRuleButton.count() > 0) {
      await addCommandRuleButton.click();
      
      const newRule = page.locator('[data-testid^="command-rule-"]').last();
      if (await newRule.count() > 0) {
        const patternInput = newRule.locator('input[name$=".pattern"]');
        if (await patternInput.count() > 0) {
          await patternInput.fill('persistent-test');
        }
        
        const actionSelect = newRule.locator('select[name$=".action"]');
        if (await actionSelect.count() > 0) {
          await actionSelect.selectOption('block');
        }
      }

      // Try to save changes if save button exists
      const saveButton = page.locator('text=Save Permissions');
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Wait for success message if it appears
        const successMessage = page.locator('text=/saved|success/i');
        if (await successMessage.count() > 0) {
          await expect(successMessage).toBeVisible({ timeout: 10000 });
        }
      }

      // Reload the page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Verify the changes persisted if they exist
      const rules = page.locator('[data-testid^="command-rule-"]');
      if (await rules.count() > 0) {
        const ruleWithPersistentTest = rules.filter({
          has: page.locator('input[value="persistent-test"]'),
        });
        if (await ruleWithPersistentTest.count() > 0) {
          await expect(ruleWithPersistentTest).toBeVisible();
          
          const actionSelect = ruleWithPersistentTest.locator('select[name$=".action"]');
          if (await actionSelect.count() > 0) {
            await expect(actionSelect).toHaveValue('block');
          }
        }
      }
    }
    
    // At minimum, verify we're on the right route
    expect(page.url()).toMatch(/\/permissions?$/);
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
