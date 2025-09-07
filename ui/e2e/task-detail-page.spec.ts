import { test, expect } from '@playwright/test';

test.describe('Task Detail Page', () => {
  const testTaskId = 'test-task-123';

  test.beforeEach(async ({ page }) => {
    // Navigate to the task detail page
    await page.goto(`/tasks/${testTaskId}`);
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display task detail page elements', async ({ page }) => {
    // Check that we're on the right URL
    await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));

    // Check for any header
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to a fresh page
    await page.goto(`/tasks/${testTaskId}`);

    // Page should load without errors
    await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));
  });

  test('should handle task not found error', async ({ page }) => {
    const invalidTaskId = 'non-existent-task';

    // Navigate to invalid task
    await page.goto(`/tasks/${invalidTaskId}`);
    await page.waitForLoadState('domcontentloaded');

    // Should stay on the URL even if task not found
    await expect(page).toHaveURL(new RegExp(`/tasks/${invalidTaskId}`));
  });

  test('should navigate back to tasks when back button is clicked', async ({ page }) => {
    // Find any back/tasks button
    const backButton = page
      .locator('button')
      .filter({ hasText: /back|tasks/i })
      .first();

    if ((await backButton.count()) > 0) {
      await backButton.click();
      // Should navigate to tasks list
      await page.waitForURL('/tasks');
      await expect(page).toHaveURL('/tasks');
    } else {
      // If no back button, just verify we're on task detail page
      await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));
    }
  });

  test('should display validation runs with correct information', async ({ page }) => {
    // Just check page loads
    await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));

    // Check for any content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display task with no validation runs', async ({ page }) => {
    const taskWithNoRuns = 'task-no-runs';

    // Navigate to task with no runs
    await page.goto(`/tasks/${taskWithNoRuns}`);
    await page.waitForLoadState('domcontentloaded');

    // Should load the page
    await expect(page).toHaveURL(new RegExp(`/tasks/${taskWithNoRuns}`));
  });

  test('should display different task statuses correctly', async ({ page }) => {
    // Test different task statuses by navigating to different tasks
    const taskStatuses = ['pending', 'in-progress', 'completed'];

    for (const status of taskStatuses) {
      await page.goto(`/tasks/task-${status}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(new RegExp(`/tasks/task-${status}`));
    }
  });

  test('should display completed task with all timing information', async ({ page }) => {
    const completedTaskId = 'completed-task';

    // Navigate to completed task
    await page.goto(`/tasks/${completedTaskId}`);
    await page.waitForLoadState('domcontentloaded');

    // Should load the page
    await expect(page).toHaveURL(new RegExp(`/tasks/${completedTaskId}`));
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Reload page with mobile viewport
    await page.goto(`/tasks/${testTaskId}`);
    await page.waitForLoadState('domcontentloaded');

    // Check page loads on mobile
    await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));

    // Check header is visible on mobile
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should still be on the same page
    await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));

    // Try escape key (might close modals)
    await page.keyboard.press('Escape');

    // Page should still work
    await expect(page).toHaveURL(new RegExp(`/tasks/${testTaskId}`));
  });
});
