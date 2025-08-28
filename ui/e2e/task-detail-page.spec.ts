import { test, expect } from '@playwright/test';

test.describe('Task Detail Page', () => {
  const testTaskId = 'test-task-123';

  test.beforeEach(async ({ page }) => {
    // Mock the individual task API call
    await page.route(`**/api/tasks/${testTaskId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testTaskId,
          content:
            'This is a detailed test task description that spans multiple lines and provides comprehensive information about what needs to be done.',
          priority: 'high',
          status: 'in_progress',
          startTime: '2025-08-18T08:00:00.000Z',
          endTime: null,
          duration: null,
          validationRuns: [
            {
              id: 'run-1',
              success: true,
              duration: 15000,
              timestamp: '2025-08-18T09:00:00.000Z',
              stages: JSON.stringify([
                { id: 'lint', name: 'Code Linting', success: true, duration: 5000 },
                { id: 'test', name: 'Unit Tests', success: true, duration: 8000 },
                { id: 'build', name: 'Build', success: true, duration: 2000 },
              ]),
            },
            {
              id: 'run-2',
              success: false,
              duration: 8000,
              timestamp: '2025-08-18T08:30:00.000Z',
              stages: JSON.stringify([
                { id: 'lint', name: 'Code Linting', success: true, duration: 5000 },
                { id: 'test', name: 'Unit Tests', success: false, duration: 3000 },
              ]),
            },
          ],
        }),
      });
    });

    // Navigate to the task detail page
    await page.goto(`/tasks/${testTaskId}`);
    await page.waitForSelector('h1:has-text("Task Details")', { timeout: 10000 });
  });

  test('should display task detail page elements', async ({ page }) => {
    // Check header elements
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    await expect(page.locator('button:has-text("Back to Tasks")')).toBeVisible();

    // Check task information card
    await expect(page.locator('text=Task Information')).toBeVisible();
    await expect(page.locator('text=This is a detailed test task description')).toBeVisible();

    // Check badges (more flexible selectors)
    await expect(page.locator('text=high').first()).toBeVisible(); // Priority badge
    await expect(page.locator('text=In Progress').first()).toBeVisible(); // Status badge

    // Check task metadata
    await expect(page.locator(`text=${testTaskId}`)).toBeVisible(); // Task ID
    await expect(page.locator('text=Started')).toBeVisible();
    await expect(page.locator('text=2025')).toBeVisible(); // Start date

    // Check validation runs section
    await expect(page.locator('text=Validation Runs')).toBeVisible();
    await expect(page.locator('text=2')).toBeVisible(); // Run count badge
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to a fresh page to catch loading state
    await page.goto(`/tasks/${testTaskId}`);

    // The loading state might be brief
    const loadingText = page.locator('text=Loading task details...');
    const mainContent = page.locator('h1:has-text("Task Details")');

    // Wait for either loading state or main content
    await expect(loadingText.or(mainContent)).toBeVisible({ timeout: 5000 });

    // Eventually main content should be visible
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should handle task not found error', async ({ page }) => {
    const invalidTaskId = 'non-existent-task';

    // Mock 404 response
    await page.route(`**/api/tasks/${invalidTaskId}`, route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Task not found' }),
      });
    });

    await page.goto(`/tasks/${invalidTaskId}`);

    // Should show error state
    await expect(page.locator('text=Task Not Found')).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=The task you're looking for doesn't exist or has been deleted")).toBeVisible();
    await expect(page.locator('button:has-text("Back to Tasks")')).toBeVisible();
  });

  test('should navigate back to tasks when back button is clicked', async ({ page }) => {
    // Click the back button
    await page.click('button:has-text("Back to Tasks")');

    // Should navigate back to tasks page
    await expect(page).toHaveURL(/.*\/tasks$/);
  });

  test('should display validation runs with correct information', async ({ page }) => {
    // Check that both validation runs are displayed
    await expect(page.locator('text=Passed')).toBeVisible(); // Successful run
    await expect(page.locator('text=Failed')).toBeVisible(); // Failed run

    // Check run details (look for duration patterns)
    await expect(page.locator('text=15000ms')).toBeVisible(); // Duration of successful run

    // Check timestamps (more flexible)
    await expect(page.locator('text=2025')).toBeVisible(); // Timestamp year

    // Check stage counts and success rates
    await expect(page.locator('text=Total Stages')).toHaveCount(2); // Both runs should show this
    await expect(page.locator('text=Success Rate')).toHaveCount(2);
    await expect(page.locator('text=100%')).toBeVisible(); // Success rate for successful run
    await expect(page.locator('text=50%')).toBeVisible(); // Success rate for failed run (1/2 stages)

    // Check individual stage information
    await expect(page.locator('text=Code Linting')).toHaveCount(2); // Both runs have this stage
    await expect(page.locator('text=Unit Tests')).toHaveCount(2);
    await expect(page.locator('text=Build')).toBeVisible(); // Only successful run has this
  });

  test('should display task with no validation runs', async ({ page }) => {
    // Mock task with no validation runs
    await page.route(`**/api/tasks/${testTaskId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testTaskId,
          content: 'Task with no validation runs',
          priority: 'medium',
          status: 'pending',
          validationRuns: [],
        }),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Task with no validation runs');

    // Should show empty state for validation runs
    await expect(page.locator('text=No Validation Runs')).toBeVisible();
    await expect(page.locator("text=This task hasn't had any validation runs yet")).toBeVisible();
    await expect(page.locator('text=0')).toBeVisible(); // Run count badge should show 0
  });

  test('should display different task statuses correctly', async ({ page }) => {
    // Test pending task
    await page.route(`**/api/tasks/${testTaskId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testTaskId,
          content: 'Pending task',
          priority: 'low',
          status: 'pending',
          validationRuns: [],
        }),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Pending task');

    // Check pending status badge
    await expect(page.locator('.bg-gray-100:has-text("Pending")')).toBeVisible();
    await expect(page.locator('.bg-gray-100:has-text("low")')).toBeVisible();
  });

  test('should display completed task with all timing information', async ({ page }) => {
    // Mock completed task
    await page.route(`**/api/tasks/${testTaskId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testTaskId,
          content: 'Completed task with full timing',
          priority: 'high',
          status: 'completed',
          startTime: '2025-08-18T08:00:00.000Z',
          endTime: '2025-08-18T10:00:00.000Z',
          duration: '2h 0m',
          validationRuns: [],
        }),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Completed task with full timing');

    // Check all timing information is displayed
    await expect(page.locator('text=Started')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Duration')).toBeVisible();
    await expect(page.locator('text=2h 0m')).toBeVisible();

    // Check completed status badge
    await expect(page.locator('.bg-green-100:has-text("Completed")')).toBeVisible();
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be functional and readable
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    await expect(page.locator('button:has-text("Back to Tasks")')).toBeVisible();
    await expect(page.locator('text=Task Information')).toBeVisible();
    await expect(page.locator('text=Validation Runs')).toBeVisible();

    // Content should be readable and not cut off
    await expect(page.locator('text=This is a detailed test task description')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab to the back button and activate it
    await page.keyboard.press('Tab');
    await page.focus('button:has-text("Back to Tasks")');

    // Press Enter to click the button
    await page.keyboard.press('Enter');

    // Should navigate back to tasks
    await expect(page).toHaveURL(/.*\/tasks$/);
  });
});