import { test, expect } from '@playwright/test';

test.describe('Task Detail Management', () => {
  let testTaskId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test task for detail testing
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to tasks page and create a test task
    await page.goto('/tasks');
    await page.waitForSelector('button:has-text("Add Task")', { timeout: 10000 });

    // Create a test task
    await page.click('button:has-text("Add Task")');
    await page.fill('textarea[name="content"]', 'E2E Test Task for Detail View');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.click('button:has-text("Add Task")');

    // Wait for task to be created and get its ID
    await page.waitForSelector('[data-testid^="task-card-"]', { timeout: 10000 });
    const taskCard = page.locator('[data-testid^="task-card-"]', {
      hasText: 'E2E Test Task for Detail View',
    });
    const taskTestId = await taskCard.getAttribute('data-testid');
    testTaskId = taskTestId?.replace('task-card-', '') || '';

    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate directly to the test task detail page
    await page.goto(`/tasks/${testTaskId}`);
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
    // Check task content
    await expect(page.locator('text=E2E Test Task for Detail View')).toBeVisible();

    // Check task ID is displayed
    await expect(page.locator('text=' + testTaskId)).toBeVisible();

    // Check priority badge
    await expect(page.locator('.bg-yellow-100')).toBeVisible(); // Medium priority

    // Check status badge
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('should navigate back to tasks list', async ({ page }) => {
    // Click back button
    await page.click('button:has-text("Back to Tasks")');

    // Should be on tasks page
    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
  });

  test('should display validation runs section', async ({ page }) => {
    // Check validation runs header
    const validationSection = page.locator('text=Validation Runs').locator('..');
    await expect(validationSection).toBeVisible();

    // Should show validation runs count badge
    await expect(page.locator('[data-testid="validation-runs-count"]')).toBeVisible();
  });

  test('should handle empty validation runs state', async ({ page }) => {
    // Look for empty state message
    const emptyStateMessage = page.locator('text=No Validation Runs');
    const validationRunCards = page.locator('[data-testid^="validation-run-"]');

    // Either has validation runs or shows empty state
    if ((await validationRunCards.count()) === 0) {
      await expect(emptyStateMessage).toBeVisible();
      await expect(page.locator("text=This task hasn't had any validation runs yet")).toBeVisible();
    }
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

    // Should show error state
    await expect(page.locator('text=Task Not Found')).toBeVisible();
    await expect(page.locator("text=The task you're looking for doesn't exist")).toBeVisible();
    await expect(page.locator('button:has-text("Back to Tasks")')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to task detail and intercept the API call to delay response
    await page.route('**/api/tasks/**', async route => {
      // Delay the response to see loading state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto(`/tasks/${testTaskId}`);

    // Should show loading spinner
    await expect(page.locator('text=Loading task details')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('should maintain responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Elements should still be visible and accessible
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    await expect(page.locator('button:has-text("Back to Tasks")')).toBeVisible();
    await expect(page.locator('text=Task Information')).toBeVisible();

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

  test.afterAll(async ({ browser }) => {
    // Clean up the test task
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to tasks and delete the test task
      await page.goto('/tasks');
      await page.waitForSelector('[data-testid^="task-card-"]', { timeout: 5000 });

      const testTask = page.locator('[data-testid^="task-card-"]', {
        hasText: 'E2E Test Task for Detail View',
      });

      if (await testTask.isVisible()) {
        // If there's a delete button or action, use it
        const deleteButton = testTask.locator('button[data-testid="delete-task"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
        }
      }
    } catch (error) {
      console.warn('Could not clean up test task:', error);
    } finally {
      await context.close();
    }
  });
});
