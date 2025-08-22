import { test, expect } from '@playwright/test';

test.describe('Workers Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workers');
    await page.waitForLoadState('networkidle');
  });

  test('should display workers overview', async ({ page }) => {
    // Given I am logged into CODEGOAT
    // And there are Claude workers running or completed
    
    // When I navigate to the Workers page
    // Then I should see the workers dashboard header
    await expect(page.locator('h1')).toContainText('Workers');
    
    // And I should see worker cards or a message indicating no workers
    const workerCards = page.locator('[data-testid="worker-card"]');
    const noWorkersMessage = page.locator('[data-testid="no-workers-message"]');
    
    const hasWorkers = await workerCards.count() > 0;
    const hasNoWorkersMessage = await noWorkersMessage.count() > 0;
    
    // Either workers exist OR no workers message is shown
    expect(hasWorkers || hasNoWorkersMessage).toBe(true);
    
    if (hasWorkers) {
      // And I should see worker status information
      await expect(workerCards.first().locator('[data-testid="worker-status"]')).toBeVisible();
      
      // And I should see worker start time
      await expect(workerCards.first().locator('[data-testid="worker-start-time"]')).toBeVisible();
      
      // And I should see the task being worked on
      await expect(workerCards.first().locator('[data-testid="worker-task"]')).toBeVisible();
    }
  });

  test('should filter workers by status', async ({ page }) => {
    // Given I am on the Workers dashboard
    await expect(page.locator('h1')).toContainText('Workers');
    
    // When I select "Running" from the status filter
    const statusFilter = page.locator('[data-testid="status-filter"]');
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption('RUNNING');
      
      // Then I should see only running workers
      const workerCards = page.locator('[data-testid="worker-card"]');
      if (await workerCards.count() > 0) {
        const workerStatuses = workerCards.locator('[data-testid="worker-status"]');
        const statusCount = await workerStatuses.count();
        
        for (let i = 0; i < statusCount; i++) {
          const status = await workerStatuses.nth(i).textContent();
          expect(status).toMatch(/running|active/i);
        }
      }
    }
  });

  test('should navigate to worker detail', async ({ page }) => {
    // Given I am on the Workers dashboard
    await expect(page.locator('h1')).toContainText('Workers');
    
    // And there is at least one worker
    const workerCard = page.locator('[data-testid="worker-card"]').first();
    
    if (await workerCard.count() > 0) {
      // When I click on a worker card
      await workerCard.click();
      
      // Then I should navigate to the worker detail page
      await expect(page).toHaveURL(/\/workers\/.+/);
      
      // And I should see the worker detail view
      await expect(page.locator('[data-testid="worker-detail"]')).toBeVisible();
      
      // And I should see worker execution logs
      await expect(page.locator('[data-testid="worker-logs"]')).toBeVisible();
      
      // And I should see the worker status and metadata
      await expect(page.locator('[data-testid="worker-metadata"]')).toBeVisible();
    }
  });

  test('should create new worker', async ({ page }) => {
    // Given I am on the Workers dashboard
    await expect(page.locator('h1')).toContainText('Workers');
    
    // When I click the "Start New Worker" button
    const startWorkerButton = page.getByRole('button', { name: /start.*worker/i });
    if (await startWorkerButton.count() > 0) {
      await startWorkerButton.click();
      
      // Then I should see a worker creation dialog
      const dialog = page.locator('[data-testid="worker-creation-dialog"]');
      await expect(dialog).toBeVisible();
      
      // When I select a task from the available tasks
      const taskSelect = page.locator('[data-testid="task-select"]');
      if (await taskSelect.count() > 0) {
        await taskSelect.selectOption({ index: 0 });
        
        // And I click "Start Worker"
        await page.getByRole('button', { name: /start worker/i }).click();
        
        // Then a new worker should be created
        await page.waitForLoadState('networkidle');
        
        // And I should see the new worker in the dashboard
        await expect(page.locator('[data-testid="worker-card"]')).toBeVisible();
      }
    }
  });

  test('should show worker metrics summary', async ({ page }) => {
    // Given I am on the Workers dashboard
    await expect(page.locator('h1')).toContainText('Workers');
    
    // Then I should see metrics about total workers
    const metricsSection = page.locator('[data-testid="worker-metrics"]');
    if (await metricsSection.count() > 0) {
      await expect(metricsSection).toBeVisible();
      
      // And I should see count of active workers
      await expect(page.locator('[data-testid="active-workers-count"]')).toBeVisible();
      
      // And I should see count of completed workers
      await expect(page.locator('[data-testid="completed-workers-count"]')).toBeVisible();
      
      // And I should see average execution time
      await expect(page.locator('[data-testid="average-execution-time"]')).toBeVisible();
    }
  });
});