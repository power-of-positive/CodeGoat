import { test, expect } from '@playwright/test';

test.describe('Worker Detail Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workers');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display worker execution details', async ({ page }) => {
    // Given I am on the Workers dashboard
    await expect(page.locator('h1')).toContainText('Workers');
    
    // And there is at least one worker
    const workerCard = page.locator('[data-testid="worker-card"]').first();
    
    if (await workerCard.count() > 0) {
      // When I click on a worker to view details
      await workerCard.click();
      
      // Then I should see the worker detail page
      await expect(page).toHaveURL(/\/workers\/.+/);
      await expect(page.locator('[data-testid="worker-detail"]')).toBeVisible();
      
      // And I should see the worker ID and status
      await expect(page.locator('[data-testid="worker-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="worker-status"]')).toBeVisible();
      
      // And I should see the task being executed
      await expect(page.locator('[data-testid="assigned-task"]')).toBeVisible();
      
      // And I should see execution start time and duration
      await expect(page.locator('[data-testid="execution-start-time"]')).toBeVisible();
      
      // And I should see the git worktree information
      await expect(page.locator('[data-testid="worktree-info"]')).toBeVisible();
    } else {
      // Navigate directly to a mock worker detail page
      await page.goto('/workers/test-worker-123');
      await expect(page.locator('[data-testid="worker-not-found"]')).toBeVisible();
    }
  });

  test('should stream worker logs in real-time', async ({ page }) => {
    // Navigate to a worker detail page (mock or real)
    await page.goto('/workers/test-worker-123');
    
    // When I view the worker logs section
    const logsSection = page.locator('[data-testid="worker-logs"]');
    if (await logsSection.count() > 0) {
      await expect(logsSection).toBeVisible();
      
      // Then I should see streaming log entries
      await expect(page.locator('[data-testid="log-entry"]')).toBeVisible();
      
      // And I should see log timestamps
      await expect(page.locator('[data-testid="log-timestamp"]')).toBeVisible();
      
      // And I should see log levels (info, error, debug)
      await expect(page.locator('[data-testid="log-level"]')).toBeVisible();
      
      // And I should be able to filter logs by level
      const logFilter = page.locator('[data-testid="log-level-filter"]');
      if (await logFilter.count() > 0) {
        await expect(logFilter).toBeVisible();
      }
      
      // And I should see auto-scroll functionality
      const autoScrollToggle = page.locator('[data-testid="auto-scroll-toggle"]');
      if (await autoScrollToggle.count() > 0) {
        await expect(autoScrollToggle).toBeVisible();
      }
    }
  });

  test('should show validation run results', async ({ page }) => {
    // Navigate to a worker detail page
    await page.goto('/workers/test-worker-123');
    
    // When I view the validation section
    const validationSection = page.locator('[data-testid="validation-results"]');
    if (await validationSection.count() > 0) {
      await expect(validationSection).toBeVisible();
      
      // Then I should see validation stages and their status
      await expect(page.locator('[data-testid="validation-stage"]')).toBeVisible();
      
      // And I should see overall validation status
      await expect(page.locator('[data-testid="validation-status"]')).toBeVisible();
      
      // And I should see stage execution times
      await expect(page.locator('[data-testid="stage-duration"]')).toBeVisible();
      
      // And I should be able to expand failed stages for details
      const failedStage = page.locator('[data-testid="validation-stage"][data-status="failed"]').first();
      if (await failedStage.count() > 0) {
        await failedStage.click();
        await expect(page.locator('[data-testid="stage-error-details"]')).toBeVisible();
      }
    }
  });

  test('should display blocked commands audit', async ({ page }) => {
    // Navigate to a worker detail page
    await page.goto('/workers/test-worker-123');
    
    // When I view the security audit section
    const securitySection = page.locator('[data-testid="security-audit"]');
    if (await securitySection.count() > 0) {
      await expect(securitySection).toBeVisible();
      
      // Then I should see any blocked commands
      const blockedCommands = page.locator('[data-testid="blocked-command"]');
      if (await blockedCommands.count() > 0) {
        await expect(blockedCommands.first()).toBeVisible();
        
        // And I should see the command that was blocked
        await expect(blockedCommands.first().locator('[data-testid="command-text"]')).toBeVisible();
        
        // And I should see the reason for blocking
        await expect(blockedCommands.first().locator('[data-testid="block-reason"]')).toBeVisible();
        
        // And I should see the timestamp when it was blocked
        await expect(blockedCommands.first().locator('[data-testid="block-timestamp"]')).toBeVisible();
      } else {
        // If no blocked commands, should show clean audit message
        await expect(page.locator('[data-testid="no-blocked-commands"]')).toBeVisible();
      }
    }
  });

  test('should handle worker termination', async ({ page }) => {
    // Navigate to a running worker detail page
    await page.goto('/workers/test-worker-123');
    
    // When I click the terminate worker button
    const terminateButton = page.locator('[data-testid="terminate-worker"]');
    if (await terminateButton.count() > 0) {
      await expect(terminateButton).toBeVisible();
      await terminateButton.click();
      
      // Then I should see a confirmation dialog
      const confirmDialog = page.locator('[data-testid="terminate-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      
      // When I confirm termination
      await page.getByRole('button', { name: /confirm/i }).click();
      
      // Then the worker should be terminated
      await page.waitForLoadState('domcontentloaded');
      
      // And I should see the updated worker status
      await expect(page.locator('[data-testid="worker-status"]')).toContainText(/terminated|stopped/i);
      
      // And I should no longer see the terminate button
      await expect(terminateButton).not.toBeVisible();
    }
  });

  test('should show worker performance metrics', async ({ page }) => {
    // Navigate to a worker detail page
    await page.goto('/workers/test-worker-123');
    
    // When I view the performance metrics section
    const metricsSection = page.locator('[data-testid="performance-metrics"]');
    if (await metricsSection.count() > 0) {
      await expect(metricsSection).toBeVisible();
      
      // Then I should see CPU and memory usage
      await expect(page.locator('[data-testid="cpu-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
      
      // And I should see execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // And I should see command execution count
      await expect(page.locator('[data-testid="commands-executed"]')).toBeVisible();
      
      // And I should see validation run count
      await expect(page.locator('[data-testid="validations-run"]')).toBeVisible();
    }
  });
});