import { test, expect } from '@playwright/test';

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display settings page', async ({ page }) => {
    // Given I am logged into CODEGOAT
    // And I have admin access to settings
    
    // When I navigate to the Settings page
    // Then I should see the settings header
    await expect(page.locator('h1')).toContainText('Settings');
    
    // And I should see validation configuration section
    await expect(page.locator('[data-testid="validation-settings"]')).toBeVisible();
    
    // And I should see logging configuration section
    await expect(page.locator('[data-testid="logging-settings"]')).toBeVisible();
    
    // And I should see worker configuration section
    await expect(page.locator('[data-testid="worker-settings"]')).toBeVisible();
    
    // And I should see security settings section
    await expect(page.locator('[data-testid="security-settings"]')).toBeVisible();
  });

  test('should configure validation pipeline stages', async ({ page }) => {
    // Given I am on the Settings page
    await expect(page.locator('h1')).toContainText('Settings');
    
    // When I view the validation settings section
    const validationSection = page.locator('[data-testid="validation-settings"]');
    await expect(validationSection).toBeVisible();
    
    // Then I should see toggles for each validation stage
    await expect(page.locator('[data-testid="lint-stage-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="type-check-stage-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-tests-stage-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="e2e-tests-stage-toggle"]')).toBeVisible();
    
    // When I disable the unit tests stage
    const unitTestsToggle = page.locator('[data-testid="unit-tests-stage-toggle"]');
    if (await unitTestsToggle.isChecked()) {
      await unitTestsToggle.click();
    }
    
    // And I click "Save Settings"
    await page.getByRole('button', { name: /save.*settings/i }).click();
    
    // Then I should see a success message
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    
    // And the stage should be disabled in validation runs
    await page.waitForLoadState('domcontentloaded');
    await expect(unitTestsToggle).not.toBeChecked();
  });

  test('should configure logging levels', async ({ page }) => {
    // Given I am on the Settings page
    await expect(page.locator('h1')).toContainText('Settings');
    
    // When I view the logging settings section
    const loggingSection = page.locator('[data-testid="logging-settings"]');
    await expect(loggingSection).toBeVisible();
    
    // Then I should see log level selection
    const logLevelSelect = page.locator('[data-testid="log-level-select"]');
    await expect(logLevelSelect).toBeVisible();
    
    // When I change the log level to "DEBUG"
    await logLevelSelect.selectOption('DEBUG');
    
    // And I configure log retention days
    const retentionInput = page.locator('[data-testid="log-retention-days"]');
    await retentionInput.fill('30');
    
    // And I enable structured logging
    const structuredLoggingToggle = page.locator('[data-testid="structured-logging-toggle"]');
    if (!await structuredLoggingToggle.isChecked()) {
      await structuredLoggingToggle.click();
    }
    
    // And I click "Save Settings"
    await page.getByRole('button', { name: /save.*settings/i }).click();
    
    // Then the logging configuration should be updated
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('should configure worker execution limits', async ({ page }) => {
    // Given I am on the Settings page
    await expect(page.locator('h1')).toContainText('Settings');
    
    // When I view the worker settings section
    const workerSection = page.locator('[data-testid="worker-settings"]');
    await expect(workerSection).toBeVisible();
    
    // Then I should see concurrent worker limit setting
    const concurrentLimitInput = page.locator('[data-testid="concurrent-workers-limit"]');
    await expect(concurrentLimitInput).toBeVisible();
    
    // When I set the concurrent worker limit to 3
    await concurrentLimitInput.fill('3');
    
    // And I set the worker timeout to 30 minutes
    const timeoutInput = page.locator('[data-testid="worker-timeout-minutes"]');
    await timeoutInput.fill('30');
    
    // And I enable automatic cleanup of old worktrees
    const cleanupToggle = page.locator('[data-testid="auto-cleanup-toggle"]');
    if (!await cleanupToggle.isChecked()) {
      await cleanupToggle.click();
    }
    
    // And I click "Save Settings"
    await page.getByRole('button', { name: /save.*settings/i }).click();
    
    // Then the worker configuration should be updated
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('should configure security settings', async ({ page }) => {
    // Given I am on the Settings page
    await expect(page.locator('h1')).toContainText('Settings');
    
    // When I view the security settings section
    const securitySection = page.locator('[data-testid="security-settings"]');
    await expect(securitySection).toBeVisible();
    
    // Then I should see command blocking configuration
    await expect(page.locator('[data-testid="blocked-commands-config"]')).toBeVisible();
    
    // And I should see allowed directories configuration
    await expect(page.locator('[data-testid="allowed-directories-config"]')).toBeVisible();
    
    // When I add a new blocked command pattern
    const newBlockedCommand = page.locator('[data-testid="new-blocked-command"]');
    await newBlockedCommand.fill('rm -rf *');
    
    await page.getByRole('button', { name: /add blocked command/i }).click();
    
    // And I add an allowed directory
    const newAllowedDir = page.locator('[data-testid="new-allowed-directory"]');
    await newAllowedDir.fill('/safe/workspace');
    
    await page.getByRole('button', { name: /add allowed directory/i }).click();
    
    // And I enable strict security mode
    const strictModeToggle = page.locator('[data-testid="strict-security-mode"]');
    if (!await strictModeToggle.isChecked()) {
      await strictModeToggle.click();
    }
    
    // And I click "Save Settings"
    await page.getByRole('button', { name: /save.*settings/i }).click();
    
    // Then the security configuration should be updated
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    
    // And I should see the new blocked command in the list
    await expect(page.locator('[data-testid="blocked-commands-list"]')).toContainText('rm -rf *');
  });

  test('should reset settings to defaults', async ({ page }) => {
    // Given I am on the Settings page
    await expect(page.locator('h1')).toContainText('Settings');
    
    // When I click "Reset to Defaults"
    const resetButton = page.getByRole('button', { name: /reset.*defaults/i });
    if (await resetButton.count() > 0) {
      await resetButton.click();
      
      // Then I should see a confirmation dialog
      const confirmDialog = page.locator('[data-testid="reset-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      
      // When I confirm the reset
      await page.getByRole('button', { name: /confirm reset/i }).click();
      
      // Then all settings should be restored to defaults
      await expect(page.locator('[data-testid="settings-reset"]')).toBeVisible();
      
      // And validation stages should be enabled by default
      await expect(page.locator('[data-testid="lint-stage-toggle"]')).toBeChecked();
      await expect(page.locator('[data-testid="type-check-stage-toggle"]')).toBeChecked();
    }
  });

  test('should export and import settings', async ({ page }) => {
    // Given I am on the Settings page
    await expect(page.locator('h1')).toContainText('Settings');
    
    // When I click "Export Settings"
    const exportButton = page.getByRole('button', { name: /export.*settings/i });
    if (await exportButton.count() > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Then a settings file should be downloaded
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/settings.*\.json/);
    }
    
    // When I click "Import Settings"
    const importButton = page.getByRole('button', { name: /import.*settings/i });
    if (await importButton.count() > 0) {
      await importButton.click();
      
      // Then I should see a file upload dialog
      const fileInput = page.locator('[data-testid="settings-file-input"]');
      await expect(fileInput).toBeVisible();
    }
  });
});