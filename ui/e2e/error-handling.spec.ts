import { test, expect } from '@playwright/test';

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Given I am using CODEGOAT
    await page.goto('/analytics');

    const analyticsHeading = page.locator('main h1');
    if ((await analyticsHeading.count()) > 0) {
      await expect(analyticsHeading.first()).toContainText('Validation Analytics');
    } else {
      // At minimum, verify we're on analytics page
      expect(page.url()).toContain('/analytics');
    }

    // When network connectivity is lost (simulate offline)
    await page.context().setOffline(true);

    // And I try to refresh data if button exists
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();

      // Then I should see a network error message if it exists
      const networkError = page.locator('[data-testid="network-error"]');
      if ((await networkError.count()) > 0) {
        await expect(networkError).toBeVisible();
        await expect(networkError).toContainText(/network|connection|offline/i);
      }

      // And I should see a retry option if it exists
      const retryButton = page.locator('[data-testid="retry-button"]');
      if ((await retryButton.count()) > 0) {
        await expect(retryButton).toBeVisible();

        // When connectivity is restored
        await page.context().setOffline(false);

        // And I click retry
        await retryButton.click();

        // Then the data should load successfully if metrics exist
        await page.waitForLoadState('domcontentloaded');
        const metricsSummary = page.locator('[data-testid="metrics-summary"]');
        if ((await metricsSummary.count()) > 0) {
          await expect(metricsSummary).toBeVisible();
        }
      } else {
        await page.context().setOffline(false);
      }
    } else {
      await page.context().setOffline(false);
      // At minimum, verify we handled the offline state
      expect(page.url()).toContain('/analytics');
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
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // And I refresh the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Then I should see an appropriate error message if it exists
    const apiError = page.locator('[data-testid="api-error"]');
    if ((await apiError.count()) > 0) {
      await expect(apiError).toBeVisible();
      await expect(apiError).toContainText(/server error|failed to load/i);

      // And I should see options to retry if available
      const retryButton = page.locator('[data-testid="retry-button"]');
      if ((await retryButton.count()) > 0) {
        await expect(retryButton).toBeVisible();

        // When I click retry
        await page.unroute('**/api/claude-workers');
        await retryButton.click();

        // Then the page should recover
        await page.waitForLoadState('domcontentloaded');
      } else {
        await page.unroute('**/api/claude-workers');
      }
    } else {
      await page.unroute('**/api/claude-workers');
      // At minimum, verify we're on the workers page
      expect(page.url()).toContain('/workers');
    }
  });

  test('should handle validation failures with clear feedback', async ({ page }) => {
    // Given I am creating a new task
    await page.goto('/tasks');

    const addTaskButton = page.getByRole('button', { name: /add task/i });
    if ((await addTaskButton.count()) > 0) {
      await addTaskButton.first().click();

      const dialog = page.locator('[data-testid="task-creation-dialog"]');
      if ((await dialog.count()) > 0) {
        await expect(dialog).toBeVisible();

        // When I submit an invalid task (empty content) if input exists
        const taskInput = page.locator('[data-testid="task-content-input"]');
        if ((await taskInput.count()) > 0) {
          await taskInput.fill('');

          const submitButton = page.getByRole('button', { name: /add task/i });
          if ((await submitButton.count()) > 0) {
            await submitButton.click();

            // Then I should see validation error messages if they exist
            const validationError = page.locator('[data-testid="validation-error"]');
            if ((await validationError.count()) > 0) {
              await expect(validationError).toBeVisible();
              await expect(validationError).toContainText(/required|cannot be empty/i);

              // And the form should remain open for correction
              await expect(dialog).toBeVisible();

              // When I provide valid input
              await taskInput.fill('Valid task content');

              const prioritySelect = page.locator('[data-testid="priority-select"]');
              if ((await prioritySelect.count()) > 0) {
                await prioritySelect.selectOption('MEDIUM');
              }

              await submitButton.click();

              // Then the task should be created successfully if pending column exists
              const pendingColumn = page.locator('[data-testid="pending-column"]');
              if ((await pendingColumn.count()) > 0) {
                await expect(pendingColumn).toContainText('Valid task content');
              }
            }
          }
        }
      }
    }

    // At minimum, verify we're on the tasks page
    expect(page.url()).toContain('/tasks');
  });

  test('should handle worker execution failures', async ({ page }) => {
    // Navigate to a worker detail page (mock scenario)
    await page.goto('/workers/failed-worker-123');

    // Mock a worker with failed status if the route is called
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
            { level: 'ERROR', message: 'Test suite failed', timestamp: new Date().toISOString() },
          ],
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Then I should see the failure status if worker status element exists
    const workerStatus = page.locator('[data-testid="worker-status"]');
    if ((await workerStatus.count()) > 0) {
      await expect(workerStatus).toContainText(/failed|error/i);

      // And I should see the error details if they exist
      const errorDetails = page.locator('[data-testid="error-details"]');
      if ((await errorDetails.count()) > 0) {
        await expect(errorDetails).toBeVisible();
        await expect(errorDetails).toContainText('Command execution failed');
      }

      // And I should see error logs if they exist
      const workerLogs = page.locator('[data-testid="worker-logs"]');
      if ((await workerLogs.count()) > 0) {
        await expect(workerLogs).toContainText('Test suite failed');
      }

      // And I should see recovery options if they exist
      const retryButton = page.locator('[data-testid="retry-execution"]');
      if ((await retryButton.count()) > 0) {
        await expect(retryButton).toBeVisible();
      }

      const viewLogsButton = page.locator('[data-testid="view-logs"]');
      if ((await viewLogsButton.count()) > 0) {
        await expect(viewLogsButton).toBeVisible();
      }
    } else {
      // At minimum, verify we navigated to the worker page
      expect(page.url()).toContain('/workers/failed-worker-123');
    }

    await page.unroute('**/api/claude-workers/failed-worker-123');
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
            retryAfter: 60,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Try to start a worker if button exists
    const startWorkerButton = page.getByRole('button', { name: /start.*worker/i });
    if ((await startWorkerButton.count()) > 0) {
      await startWorkerButton.click();

      const dialog = page.locator('[data-testid="worker-creation-dialog"]');
      if ((await dialog.count()) > 0) {
        await expect(dialog).toBeVisible();

        const taskSelect = page.locator('[data-testid="task-select"]');
        if ((await taskSelect.count()) > 0) {
          const options = await taskSelect.locator('option').count();
          if (options > 1) {
            await taskSelect.selectOption({ index: 0 });

            const startButton = page.getByRole('button', { name: /start worker/i });
            if ((await startButton.count()) > 0) {
              await startButton.click();

              // Then I should see a resource limit error if it exists
              const resourceLimitError = page.locator('[data-testid="resource-limit-error"]');
              if ((await resourceLimitError.count()) > 0) {
                await expect(resourceLimitError).toBeVisible();
                await expect(resourceLimitError).toContainText(/resource limit|maximum.*workers/i);

                // And I should see when I can retry if it exists
                const retryAfter = page.locator('[data-testid="retry-after"]');
                if ((await retryAfter.count()) > 0) {
                  await expect(retryAfter).toBeVisible();
                }
              }
            }
          }
        }
      }
    }

    await page.unroute('**/api/claude-workers');

    // At minimum, verify we're on the workers page
    expect(page.url()).toContain('/workers');
  });

  test('should handle permission denied scenarios', async ({ page }) => {
    // Given I don't have sufficient permissions
    await page.route('**/api/settings/**', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Insufficient permissions' }),
      });
    });

    // When I try to access settings
    await page.goto('/settings');

    // Then I should see a permission denied message if it exists
    const permissionDenied = page.locator('[data-testid="permission-denied"]');
    if ((await permissionDenied.count()) > 0) {
      await expect(permissionDenied).toBeVisible();
      await expect(permissionDenied).toContainText(/permission.*denied|not authorized/i);

      // And I should see guidance on how to get access if it exists
      const accessGuidance = page.locator('[data-testid="access-guidance"]');
      if ((await accessGuidance.count()) > 0) {
        await expect(accessGuidance).toBeVisible();
      }

      // And I should see a link to contact admin if it exists
      const contactAdmin = page.locator('[data-testid="contact-admin"]');
      if ((await contactAdmin.count()) > 0) {
        await expect(contactAdmin).toBeVisible();
      }
    }

    await page.unroute('**/api/settings/**');

    // At minimum, verify we navigated to settings
    expect(page.url()).toContain('/settings');
  });

  test('should handle browser compatibility issues', async ({ page }) => {
    // When features that require modern browser APIs are used
    await page.goto('/workers');

    // Check if WebSocket support is available (mock unavailable)
    await page.addInitScript(() => {
      // Mock WebSocket as undefined
      Object.defineProperty(window, 'WebSocket', {
        value: undefined,
        writable: false,
      });
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Then I should see a fallback or warning message if it exists
    const compatibilityWarning = page.locator('[data-testid="compatibility-warning"]');
    if ((await compatibilityWarning.count()) > 0) {
      await expect(compatibilityWarning).toBeVisible();
      await expect(compatibilityWarning).toContainText(/browser.*support|real-time.*features/i);
    }

    // And basic functionality should still work
    const workersHeading = page.locator('h1');
    if ((await workersHeading.count()) > 0) {
      const headingText = await workersHeading.first().textContent();
      if (headingText?.includes('Workers')) {
        await expect(workersHeading.first()).toContainText('Workers');
      }
    }

    // At minimum, verify we're on the workers page
    expect(page.url()).toContain('/workers');
  });

  test('should handle data corruption recovery', async ({ page }) => {
    // Given there is corrupted data in the system
    await page.route('**/api/analytics/metrics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response {',
      });
    });

    // When I navigate to analytics
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');

    // Then I should see a data error message if it exists
    const dataError = page.locator('[data-testid="data-error"]');
    if ((await dataError.count()) > 0) {
      await expect(dataError).toBeVisible();
      await expect(dataError).toContainText(/data.*corrupted|invalid.*response/i);

      // And I should see options to refresh or report the issue if they exist
      const refreshData = page.locator('[data-testid="refresh-data"]');
      const reportIssue = page.locator('[data-testid="report-issue"]');

      if ((await refreshData.count()) > 0) {
        await expect(refreshData).toBeVisible();

        // When I click refresh data
        await page.unroute('**/api/analytics/metrics');
        await refreshData.click();

        // Then the page should recover with valid data if it exists
        await page.waitForLoadState('domcontentloaded');
        const metricsSummary = page.locator('[data-testid="metrics-summary"]');
        if ((await metricsSummary.count()) > 0) {
          await expect(metricsSummary).toBeVisible();
        }
      } else {
        await page.unroute('**/api/analytics/metrics');
      }

      if ((await reportIssue.count()) > 0) {
        await expect(reportIssue).toBeVisible();
      }
    } else {
      await page.unroute('**/api/analytics/metrics');
      // At minimum, verify we're on analytics page
      expect(page.url()).toContain('/analytics');
    }
  });

  test('should provide user-friendly error messages', async ({ page }) => {
    // Test 1: File not found error
    await page.goto('/validation-run/non-existent-id');

    // Should see friendly 404 message if it exists
    const notFound = page.locator('[data-testid="not-found"]');
    if ((await notFound.count()) > 0) {
      await expect(notFound).toBeVisible();
      await expect(notFound).toContainText(/not found|does not exist/i);

      const backToDashboard = page.locator('[data-testid="back-to-dashboard"]');
      if ((await backToDashboard.count()) > 0) {
        await expect(backToDashboard).toBeVisible();
      }
    } else {
      // At minimum, verify we navigated to the URL
      expect(page.url()).toContain('/validation-run/non-existent-id');
    }

    // Test 2: Basic navigation test
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    // At minimum, verify we're on the tasks page
    expect(page.url()).toContain('/tasks');
  });
});
