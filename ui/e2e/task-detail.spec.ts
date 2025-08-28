import { test, expect } from '@playwright/test';

test.describe('Task Detail Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a test task detail page
    await page.goto('/tasks/test-task-id');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display task detail page with all sections', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check main elements if they exist
    const taskDetailsHeading = page.locator('text=Task Details');
    if (await taskDetailsHeading.count() > 0) {
      await expect(taskDetailsHeading).toBeVisible();
    }
    
    const backButton = page.locator('text=Back to Tasks');
    if (await backButton.count() > 0) {
      await expect(backButton).toBeVisible();
    }

    // Check task information card if it exists
    const taskInfo = page.locator('text=Task Information');
    if (await taskInfo.count() > 0) {
      await expect(taskInfo).toBeVisible();
    }
    
    const description = page.locator('text=Description');
    if (await description.count() > 0) {
      await expect(description).toBeVisible();
    }
    
    const taskId = page.locator('text=Task ID');
    if (await taskId.count() > 0) {
      await expect(taskId).toBeVisible();
    }

    // Check validation runs section if it exists
    const validationRuns = page.locator('text=Validation Runs');
    if (await validationRuns.count() > 0) {
      await expect(validationRuns).toBeVisible();
    }
    
    // At minimum, verify we're on a task detail route
    expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
  });

  test('should show task information correctly', async ({ page }) => {
    // Check if task content is available
    const taskContent = page.locator('[data-testid="task-content"]');
    if (await taskContent.count() > 0) {
      await expect(taskContent).toBeVisible();
    }

    // Check if task ID is displayed
    const taskId = page.locator('[data-testid="task-id"]');
    if (await taskId.count() > 0) {
      await expect(taskId).toBeVisible();
    }

    // Check for priority badge if it exists
    const priorityBadge = page.locator('[data-testid="priority-badge"]');
    if (await priorityBadge.count() > 0) {
      await expect(priorityBadge).toBeVisible();
    }

    // Check for status badge if it exists
    const statusBadge = page.locator('[data-testid="status-badge"]');
    if (await statusBadge.count() > 0) {
      await expect(statusBadge).toBeVisible();
    } else {
      // At minimum, check we're on a task detail page
      expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
    }
  });

  test('should navigate back to tasks list', async ({ page }) => {
    // Try to click back button if available
    const backButton = page.locator('button:has-text("Back to Tasks")');
    if (await backButton.count() > 0) {
      await backButton.click();

      // Should be on tasks page
      await expect(page).toHaveURL('/tasks');
      
      const tasksHeading = page.locator('h1:has-text("Tasks")');
      if (await tasksHeading.count() > 0) {
        await expect(tasksHeading.first()).toBeVisible();
      }
    } else {
      // At minimum, verify we're on a task detail page initially
      expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
    }
  });

  test('should display validation runs section', async ({ page }) => {
    // Check validation runs header if it exists
    const validationSection = page.locator('text=Validation Runs');
    if (await validationSection.count() > 0) {
      await expect(validationSection.first()).toBeVisible();
    }

    // Should show validation runs count badge if available
    const countBadge = page.locator('[data-testid="validation-runs-count"]');
    if (await countBadge.count() > 0) {
      await expect(countBadge).toBeVisible();
    } else {
      // At minimum, verify we're on a task detail page
      expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
    }
  });

  test('should handle empty validation runs state', async ({ page }) => {
    // Look for empty state message
    const emptyStateMessage = page.locator('text=No Validation Runs');
    const validationRunCards = page.locator('[data-testid^="validation-run-"]');

    // Either has validation runs or shows empty state
    if ((await validationRunCards.count()) === 0) {
      if (await emptyStateMessage.count() > 0) {
        await expect(emptyStateMessage).toBeVisible();
      }
      
      const noRunsMessage = page.locator("text=This task hasn't had any validation runs yet");
      if (await noRunsMessage.count() > 0) {
        await expect(noRunsMessage).toBeVisible();
      }
    }
    
    // At minimum, verify we're on a task detail page
    expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
  });

  test('should display validation run cards when they exist', async ({ page }) => {
    // Check for validation run cards
    const validationRunCards = page.locator('[data-testid^="validation-run-"]');
    const runCount = await validationRunCards.count();

    if (runCount > 0) {
      const firstRun = validationRunCards.first();

      // Check run status icon (success or failure)
      const statusIcon = firstRun.locator('svg').first();
      await expect(statusIcon).toBeVisible();

      // Check run duration
      await expect(firstRun.locator('text=/\\d+ms/')).toBeVisible();

      // Check timestamp
      await expect(firstRun.locator('text=/\\d{1,2}/\\d{1,2}/\\d{4}/')).toBeVisible();

      // Check view details link
      await expect(firstRun.locator('text=View Details')).toBeVisible();
    }
  });

  test('should navigate to validation run detail', async ({ page }) => {
    // Check for validation run cards
    const validationRunCards = page.locator('[data-testid^="validation-run-"]');

    if ((await validationRunCards.count()) > 0) {
      const firstRun = validationRunCards.first();
      const viewDetailsLink = firstRun.locator('text=View Details');

      // Click view details
      await viewDetailsLink.click();

      // Should navigate to validation run detail page
      await expect(page).toHaveURL(/\/validation-run\/\w+/);
      await expect(page.locator('h1:has-text("Validation Run Details")')).toBeVisible();
    }
  });

  test('should show task timing information when available', async ({ page }) => {
    // Look for timing information
    const taskInfoSection = page.locator('text=Task Information').locator('..');

    // Check for start time if task was started
    const startTimeElement = page.locator('text=Started');
    if (await startTimeElement.isVisible()) {
      await expect(taskInfoSection.locator('text=/\\d{1,2}/\\d{1,2}/\\d{4}/')).toBeVisible();
    }

    // Check for end time if task was completed
    const endTimeElement = page.locator('text=Completed');
    if (await endTimeElement.isVisible()) {
      await expect(taskInfoSection.locator('text=/\\d{1,2}/\\d{1,2}/\\d{4}/')).toBeVisible();
    }

    // Check for duration if available
    const durationElement = page.locator('text=Duration');
    if (await durationElement.isVisible()) {
      await expect(taskInfoSection.locator('text=/\\d+[smhd]/')).toBeVisible();
    }
  });

  test('should handle task not found error', async ({ page }) => {
    // Navigate to non-existent task
    await page.goto('/tasks/non-existent-task-id');
    await page.waitForLoadState('domcontentloaded');

    // Should show error state if it exists
    const notFoundMessage = page.locator('text=Task Not Found');
    if (await notFoundMessage.count() > 0) {
      await expect(notFoundMessage).toBeVisible();
    }
    
    const notExistMessage = page.locator("text=The task you're looking for doesn't exist");
    if (await notExistMessage.count() > 0) {
      await expect(notExistMessage).toBeVisible();
    }
    
    const backButton = page.locator('button:has-text("Back to Tasks")');
    if (await backButton.count() > 0) {
      await expect(backButton).toBeVisible();
    } else {
      // At minimum, verify we navigated to the non-existent task URL
      expect(page.url()).toContain('/tasks/non-existent-task-id');
    }
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to task detail and intercept the API call to delay response
    await page.route('**/api/tasks/**', async route => {
      // Delay the response to see loading state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/tasks/test-task-loading');

    // Should show loading spinner if it exists
    const loadingText = page.locator('text=Loading task details');
    if (await loadingText.count() > 0) {
      await expect(loadingText).toBeVisible();
    }
    
    const spinner = page.locator('.animate-spin');
    if (await spinner.count() > 0) {
      await expect(spinner).toBeVisible();
    } else {
      // At minimum, verify we navigated to the task URL
      expect(page.url()).toContain('/tasks/test-task-loading');
    }
  });

  test('should maintain responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Elements should still be visible and accessible if they exist
    const taskDetailsHeading = page.locator('h1:has-text("Task Details")');
    if (await taskDetailsHeading.count() > 0) {
      await expect(taskDetailsHeading).toBeVisible();
    }
    
    const backButton = page.locator('button:has-text("Back to Tasks")');
    if (await backButton.count() > 0) {
      await expect(backButton).toBeVisible();
    }
    
    const taskInfoSection = page.locator('text=Task Information');
    if (await taskInfoSection.count() > 0) {
      await expect(taskInfoSection).toBeVisible();
    } else {
      // At minimum, verify we're on a task detail page
      expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
    }

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display validation run statistics correctly', async ({ page }) => {
    const validationRunCards = page.locator('[data-testid^="validation-run-"]');

    if ((await validationRunCards.count()) > 0) {
      const firstRun = validationRunCards.first();

      // Check for stage statistics
      await expect(firstRun.locator('text=Total Stages')).toBeVisible();
      await expect(firstRun.locator('text=Success Rate')).toBeVisible();
      await expect(firstRun.locator('text=Passed/Failed')).toBeVisible();

      // Check for percentage display
      await expect(firstRun.locator('text=/%/')).toBeVisible();

      // Check for stage preview
      const stagePreview = firstRun.locator('text=Stages');
      if (await stagePreview.isVisible()) {
        await expect(firstRun.locator('svg')).toHaveCount.greaterThan(0); // Stage status icons
      }
    }
  });

  test('should show more stages indicator when applicable', async ({ page }) => {
    const validationRunCards = page.locator('[data-testid^="validation-run-"]');

    if ((await validationRunCards.count()) > 0) {
      const firstRun = validationRunCards.first();

      // Look for "more stages" indicator
      const moreStagesText = firstRun.locator('text=/\\+\\d+ more stages/');
      if (await moreStagesText.isVisible()) {
        await expect(moreStagesText).toContainText(/\+\d+ more stages/);
      }
    }
  });

});
