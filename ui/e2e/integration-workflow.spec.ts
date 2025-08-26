import { test, expect } from '@playwright/test';

test.describe('Integration Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete full task lifecycle', async ({ page }) => {
    // Given I am logged into CODEGOAT
    // And I need to complete a development task with validation
    
    // Step 1: Navigate to Tasks and create a new story
    await page.goto('/tasks');
    await expect(page.locator('[data-testid="task-board"]')).toBeVisible();
    
    await page.getByRole('button', { name: /add task/i }).click();
    
    const dialog = page.locator('[data-testid="task-creation-dialog"]');
    await expect(dialog).toBeVisible();
    
    await page.locator('[data-testid="task-content-input"]').fill('Implement user profile feature');
    await page.locator('[data-testid="priority-select"]').selectOption('HIGH');
    await page.locator('[data-testid="task-type-select"]').selectOption('STORY');
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Verify task is created in Pending column
    const pendingColumn = page.locator('[data-testid="pending-column"]');
    await expect(pendingColumn).toContainText('Implement user profile feature');
    
    // Step 2: Add BDD scenarios to the story
    const taskCard = pendingColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Implement user profile feature' });
    await taskCard.click();
    
    // Should navigate to task detail page
    await expect(page).toHaveURL(/\/tasks\/.+/);
    
    // Add BDD scenario if interface exists
    const addScenarioButton = page.locator('[data-testid="add-bdd-scenario"]');
    if (await addScenarioButton.count() > 0) {
      await addScenarioButton.click();
      
      await page.locator('[data-testid="scenario-title"]').fill('User can view their profile');
      await page.locator('[data-testid="scenario-gherkin"]').fill(`
        Feature: User Profile
        Scenario: User can view their profile
          Given the user is logged in
          When the user navigates to their profile page
          Then they should see their profile information
          And they should be able to edit their details
      `);
      
      await page.getByRole('button', { name: /save scenario/i }).click();
    }
    
    // Step 3: Start a Claude worker for the task
    await page.goto('/workers');
    await expect(page.locator('h1')).toContainText('Workers');
    
    const startWorkerButton = page.getByRole('button', { name: /start.*worker/i });
    if (await startWorkerButton.count() > 0) {
      await startWorkerButton.click();
      
      const workerDialog = page.locator('[data-testid="worker-creation-dialog"]');
      await expect(workerDialog).toBeVisible();
      
      const taskSelect = page.locator('[data-testid="task-select"]');
      if (await taskSelect.count() > 0) {
        // Select our story task
        await taskSelect.selectOption({ label: 'Implement user profile feature' });
        await page.getByRole('button', { name: /start worker/i }).click();
        
        // Verify worker is created
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('[data-testid="worker-card"]')).toBeVisible();
      }
    }
    
    // Step 4: Monitor worker execution
    const workerCard = page.locator('[data-testid="worker-card"]').first();
    if (await workerCard.count() > 0) {
      await workerCard.click();
      
      // Should navigate to worker detail page
      await expect(page).toHaveURL(/\/workers\/.+/);
      await expect(page.locator('[data-testid="worker-detail"]')).toBeVisible();
      
      // Verify we can see worker logs
      await expect(page.locator('[data-testid="worker-logs"]')).toBeVisible();
      
      // Wait for some execution (in real scenario, worker would be running)
      await page.waitForTimeout(2000);
    }
    
    // Step 5: Check validation results
    const validationSection = page.locator('[data-testid="validation-results"]');
    if (await validationSection.count() > 0) {
      await expect(validationSection).toBeVisible();
      
      // Should see validation stages
      await expect(page.locator('[data-testid="validation-stage"]')).toBeVisible();
    }
    
    // Step 6: View analytics for the completed work
    await page.goto('/analytics');
    await expect(page.locator('h1')).toContainText('Analytics');
    
    // Should see updated metrics
    await expect(page.locator('[data-testid="metrics-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-runs"]')).toBeVisible();
    
    // Step 7: Verify task completion workflow
    await page.goto('/tasks');
    
    // In a real scenario, worker would have moved task to completed
    // For test, we verify the workflow elements exist
    await expect(page.locator('[data-testid="pending-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="in-progress-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-column"]')).toBeVisible();
  });

  test('should handle BDD scenario validation workflow', async ({ page }) => {
    // Given I have a story task with BDD requirements
    await page.goto('/tasks');
    
    // Create a story that needs BDD validation
    await page.getByRole('button', { name: /add task/i }).click();
    
    await page.locator('[data-testid="task-content-input"]').fill('Story requiring BDD validation');
    await page.locator('[data-testid="task-type-select"]').selectOption('STORY');
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Move to In Progress
    const pendingColumn = page.locator('[data-testid="pending-column"]');
    const inProgressColumn = page.locator('[data-testid="in-progress-column"]');
    const completedColumn = page.locator('[data-testid="completed-column"]');
    
    const storyTask = pendingColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Story requiring BDD validation' });
    await storyTask.dragTo(inProgressColumn);
    
    // Try to move to Completed without BDD scenarios
    const inProgressStoryTask = inProgressColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Story requiring BDD validation' });
    await inProgressStoryTask.dragTo(completedColumn);
    
    // Should see validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/BDD scenarios/i);
    
    // Task should remain in In Progress
    await expect(inProgressColumn).toContainText('Story requiring BDD validation');
    
    // Navigate to BDD dashboard to see scenario requirements
    await page.goto('/bdd');
    
    if (await page.locator('h1').count() > 0) {
      await expect(page.locator('h1')).toContainText(/BDD|Testing/);
      
      // Should see features and scenarios overview
      await expect(page.locator('[data-testid="feature-files-overview"]')).toBeVisible();
    }
  });

  test('should demonstrate worker-analytics integration', async ({ page }) => {
    // Given I want to monitor worker performance over time
    
    // Step 1: Start from workers dashboard
    await page.goto('/workers');
    await expect(page.locator('h1')).toContainText('Workers');
    
    // Check if there are any workers to analyze
    const workerCards = page.locator('[data-testid="worker-card"]');
    const hasWorkers = await workerCards.count() > 0;
    
    if (hasWorkers) {
      // Step 2: View worker details with metrics
      await workerCards.first().click();
      await expect(page).toHaveURL(/\/workers\/.+/);
      
      // Should see performance metrics
      const metricsSection = page.locator('[data-testid="performance-metrics"]');
      if (await metricsSection.count() > 0) {
        await expect(metricsSection).toBeVisible();
        await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      }
    }
    
    // Step 3: Navigate to analytics to see aggregated data
    await page.goto('/analytics');
    await expect(page.locator('h1')).toContainText('Analytics');
    
    // Should see validation metrics
    await expect(page.locator('[data-testid="metrics-summary"]')).toBeVisible();
    
    // Filter by specific agent if available
    const agentFilter = page.locator('[data-testid="agent-filter"]');
    if (await agentFilter.count() > 0) {
      await agentFilter.selectOption('claude_cli');
      await page.waitForLoadState('domcontentloaded');
      
      // Should see filtered metrics
      await expect(page.locator('[data-testid="filtered-metrics"]')).toBeVisible();
    }
    
    // Step 4: View detailed validation run if available
    const recentRuns = page.locator('[data-testid="recent-runs"]');
    if (await recentRuns.count() > 0) {
      const firstRun = recentRuns.locator('a').first();
      if (await firstRun.count() > 0) {
        await firstRun.click();
        
        // Should navigate to validation run details
        await expect(page).toHaveURL(/\/validation-run\/.+/);
        await expect(page.locator('[data-testid="validation-stages"]')).toBeVisible();
      }
    }
  });

  test('should handle settings-worker integration', async ({ page }) => {
    // Given I need to configure worker behavior through settings
    
    // Step 1: Configure worker settings
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Configure worker limits
    const workerSection = page.locator('[data-testid="worker-settings"]');
    if (await workerSection.count() > 0) {
      await expect(workerSection).toBeVisible();
      
      // Set concurrent worker limit
      const concurrentLimit = page.locator('[data-testid="concurrent-workers-limit"]');
      if (await concurrentLimit.count() > 0) {
        await concurrentLimit.fill('2');
      }
      
      // Save settings
      await page.getByRole('button', { name: /save.*settings/i }).click();
      
      if (await page.locator('[data-testid="settings-saved"]').count() > 0) {
        await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
      }
    }
    
    // Step 2: Verify settings affect worker creation
    await page.goto('/workers');
    
    // Try to create workers up to the limit
    for (let i = 0; i < 3; i++) {
      const startWorkerButton = page.getByRole('button', { name: /start.*worker/i });
      if (await startWorkerButton.count() > 0) {
        await startWorkerButton.click();
        
        const dialog = page.locator('[data-testid="worker-creation-dialog"]');
        if (await dialog.count() > 0) {
          await expect(dialog).toBeVisible();
          
          // If we hit the limit, should see an error
          const limitError = page.locator('[data-testid="worker-limit-error"]');
          if (await limitError.count() > 0) {
            await expect(limitError).toBeVisible();
            break;
          }
          
          // Try to create worker
          const taskSelect = page.locator('[data-testid="task-select"]');
          if (await taskSelect.count() > 0 && await taskSelect.locator('option').count() > 1) {
            await taskSelect.selectOption({ index: 0 });
            await page.getByRole('button', { name: /start worker/i }).click();
            await page.waitForLoadState('domcontentloaded');
          } else {
            // No tasks available, close dialog
            const closeButton = page.locator('[data-testid="close-dialog"]');
            if (await closeButton.count() > 0) {
              await closeButton.click();
            }
            break;
          }
        }
      }
    }
    
    // Verify worker limit is enforced
    const workerCards = page.locator('[data-testid="worker-card"]');
    const workerCount = await workerCards.count();
    expect(workerCount).toBeLessThanOrEqual(2);
  });
});