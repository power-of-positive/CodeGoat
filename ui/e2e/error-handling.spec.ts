import { test, expect } from '@playwright/test';

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Given I am using CODEGOAT
    await page.goto('/analytics');
    await expect(page.locator('h1')).toContainText('Analytics');
    
    // When network connectivity is lost (simulate offline)
    await page.context().setOffline(true);
    
    // And I try to refresh data
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      
      // Then I should see a network error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-error"]')).toContainText(/network|connection|offline/i);
      
      // And I should see a retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    }
    
    // When connectivity is restored
    await page.context().setOffline(false);
    
    // And I click retry
    const retryButton = page.locator('[data-testid="retry-button"]');
    if (await retryButton.count() > 0) {
      await retryButton.click();
      
      // Then the data should load successfully
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="metrics-summary"]')).toBeVisible();
    }
  });

  test('should handle API server errors gracefully', async ({ page }) => {
    // Given I am on a page that depends on API data
    await page.goto('/workers');
    
    // When the API returns an error (we'll intercept and mock this)
    await page.route('**/api/claude-workers', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // And I refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Then I should see an appropriate error message
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-error"]')).toContainText(/server error|failed to load/i);
    
    // And I should see options to retry or report the issue
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // When I click retry
    await page.unroute('**/api/claude-workers');
    await page.locator('[data-testid="retry-button"]').click();
    
    // Then the page should recover
    await page.waitForLoadState('networkidle');
  });

  test('should handle validation failures with clear feedback', async ({ page }) => {
    // Given I am creating a new task
    await page.goto('/tasks');
    await page.getByRole('button', { name: /add task/i }).click();
    
    const dialog = page.locator('[data-testid="task-creation-dialog"]');
    await expect(dialog).toBeVisible();
    
    // When I submit an invalid task (empty content)
    await page.locator('[data-testid="task-content-input"]').fill('');
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Then I should see validation error messages
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/required|cannot be empty/i);
    
    // And the form should remain open for correction
    await expect(dialog).toBeVisible();
    
    // When I provide valid input
    await page.locator('[data-testid="task-content-input"]').fill('Valid task content');
    await page.locator('[data-testid="priority-select"]').selectOption('MEDIUM');
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Then the task should be created successfully
    await expect(page.locator('[data-testid="pending-column"]')).toContainText('Valid task content');
  });

  test('should handle worker execution failures', async ({ page }) => {
    // Given I have a worker that encounters an execution error
    await page.goto('/workers');
    
    // Navigate to a worker detail page (mock scenario)
    await page.goto('/workers/failed-worker-123');
    
    // Mock a worker with failed status
    await page.route('**/api/claude-workers/failed-worker-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'failed-worker-123',
          status: 'FAILED',
          error: 'Command execution failed: npm test returned exit code 1',
          task: { id: 'task-123', content: 'Run failing tests' },
          logs: [
            { level: 'ERROR', message: 'Test suite failed', timestamp: new Date().toISOString() }
          ]
        })
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Then I should see the failure status clearly
    await expect(page.locator('[data-testid="worker-status"]')).toContainText(/failed|error/i);
    
    // And I should see the error details
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-details"]')).toContainText('Command execution failed');
    
    // And I should see error logs
    await expect(page.locator('[data-testid="worker-logs"]')).toContainText('Test suite failed');
    
    // And I should see recovery options
    await expect(page.locator('[data-testid="retry-execution"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-logs"]')).toBeVisible();
  });

  test('should handle resource exhaustion scenarios', async ({ page }) => {
    // Given the system is under resource pressure
    await page.goto('/workers');
    
    // When I try to start too many workers simultaneously
    await page.route('**/api/claude-workers', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Resource limit exceeded: Maximum concurrent workers reached',
            retryAfter: 60
          })
        });
      } else {
        await route.continue();
      }
    });
    
    const startWorkerButton = page.getByRole('button', { name: /start.*worker/i });
    if (await startWorkerButton.count() > 0) {
      await startWorkerButton.click();
      
      const dialog = page.locator('[data-testid="worker-creation-dialog"]');
      if (await dialog.count() > 0) {
        await expect(dialog).toBeVisible();
        
        const taskSelect = page.locator('[data-testid="task-select"]');
        if (await taskSelect.count() > 0 && await taskSelect.locator('option').count() > 1) {
          await taskSelect.selectOption({ index: 0 });
          await page.getByRole('button', { name: /start worker/i }).click();
          
          // Then I should see a resource limit error
          await expect(page.locator('[data-testid="resource-limit-error"]')).toBeVisible();
          await expect(page.locator('[data-testid="resource-limit-error"]')).toContainText(/resource limit|maximum.*workers/i);
          
          // And I should see when I can retry
          await expect(page.locator('[data-testid="retry-after"]')).toBeVisible();
        }
      }
    }
    
    await page.unroute('**/api/claude-workers');
  });

  test('should handle permission denied scenarios', async ({ page }) => {
    // Given I don't have sufficient permissions
    await page.route('**/api/settings/**', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Insufficient permissions' })
      });
    });
    
    // When I try to access settings
    await page.goto('/settings');
    
    // Then I should see a permission denied message
    await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="permission-denied"]')).toContainText(/permission.*denied|not authorized/i);
    
    // And I should see guidance on how to get access
    await expect(page.locator('[data-testid="access-guidance"]')).toBeVisible();
    
    // And I should see a link to contact admin
    await expect(page.locator('[data-testid="contact-admin"]')).toBeVisible();
    
    await page.unroute('**/api/settings/**');
  });

  test('should handle browser compatibility issues', async ({ page }) => {
    // Given I am using a browser with limited capabilities
    
    // When features that require modern browser APIs are used
    await page.goto('/workers');
    
    // Check if WebSocket support is available (mock unavailable)
    await page.addInitScript(() => {
      // Mock WebSocket as undefined
      Object.defineProperty(window, 'WebSocket', {
        value: undefined,
        writable: false
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Then I should see a fallback or warning message
    const compatibilityWarning = page.locator('[data-testid="compatibility-warning"]');
    if (await compatibilityWarning.count() > 0) {
      await expect(compatibilityWarning).toBeVisible();
      await expect(compatibilityWarning).toContainText(/browser.*support|real-time.*features/i);
    }
    
    // And basic functionality should still work
    await expect(page.locator('h1')).toContainText('Workers');
  });

  test('should handle data corruption recovery', async ({ page }) => {
    // Given there is corrupted data in the system
    await page.route('**/api/analytics/metrics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response {'
      });
    });
    
    // When I navigate to analytics
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    // Then I should see a data error message
    await expect(page.locator('[data-testid="data-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-error"]')).toContainText(/data.*corrupted|invalid.*response/i);
    
    // And I should see options to refresh or report the issue
    await expect(page.locator('[data-testid="refresh-data"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-issue"]')).toBeVisible();
    
    // When I click refresh data
    await page.unroute('**/api/analytics/metrics');
    await page.locator('[data-testid="refresh-data"]').click();
    
    // Then the page should recover with valid data
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="metrics-summary"]')).toBeVisible();
  });

  test('should provide user-friendly error messages', async ({ page }) => {
    // Given various error scenarios occur
    
    // Test 1: File not found error
    await page.goto('/validation-run/non-existent-id');
    
    // Should see friendly 404 message
    await expect(page.locator('[data-testid="not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="not-found"]')).toContainText(/not found|does not exist/i);
    await expect(page.locator('[data-testid="back-to-dashboard"]')).toBeVisible();
    
    // Test 2: Timeout error
    await page.route('**/api/**', async route => {
      // Simulate timeout by not responding
      await new Promise(resolve => setTimeout(resolve, 10000));
    }, { timeout: 5000 });
    
    await page.goto('/tasks');
    
    // Should see timeout message
    const timeoutError = page.locator('[data-testid="timeout-error"]');
    if (await timeoutError.count() > 0) {
      await expect(timeoutError).toBeVisible();
      await expect(timeoutError).toContainText(/timeout|taking too long/i);
    }
    
    await page.unroute('**/api/**');
  });
});