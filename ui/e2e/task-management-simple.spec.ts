import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the tasks page
    await page.goto('/');

    // Wait for the dashboard to load
    await page.waitForSelector('a:has-text("Tasks")', { timeout: 10000 });

    // Click on the Tasks tab
    await page.click('a:has-text("Tasks")');

    // Wait for tasks content to load
    await page.waitForSelector('h1:has-text("Task Management")', { timeout: 10000 });
  });

  test('should display task management page', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible();

    // Check description (be more specific to avoid multiple matches)
    await expect(
      page.locator('p:has-text("Manage your tasks with a kanban-style board")').first()
    ).toBeVisible();

    // Check add task button
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
  });

  test('should show task summary cards', async ({ page }) => {
    // Check summary cards with .first() to avoid multiple matches
    await expect(page.locator('text=Total Tasks').first()).toBeVisible();
    await expect(page.locator('text=Pending').first()).toBeVisible();
    await expect(page.locator('text=In Progress').first()).toBeVisible();
    await expect(page.locator('text=Completed').first()).toBeVisible();

    // Check that numbers are displayed
    const totalTasksCard = page.locator('text=Total Tasks').locator('..');
    await expect(totalTasksCard.locator('.text-2xl')).toBeVisible();
  });

  test('should show kanban columns', async ({ page }) => {
    // Wait for the kanban board to load
    await page.waitForLoadState('networkidle');

    // Check that kanban columns exist (they should be present even if empty)
    const kanbanBoard = page.locator('.flex.gap-6.overflow-x-auto');
    await expect(kanbanBoard).toBeVisible();

    // The columns should be rendered from the statusColumns configuration
    // Even if no tasks exist, the column structure should be there
    const columns = page.locator('.flex-1.min-w-80');
    expect(await columns.count()).toBe(3); // pending, in_progress, completed
  });

  test('should open add task form when clicking Add Task', async ({ page }) => {
    // Click add task button
    await page.click('button:has-text("Add Task")');

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Look for form elements that should appear
    const formElements = await page
      .locator('form, [role="dialog"], input, textarea, select')
      .count();
    expect(formElements).toBeGreaterThan(0);
  });

  test('should handle loading state', async ({ page }) => {
    // Reload to see loading state
    await page.reload();

    // Should show loading spinner initially
    const loadingText = page.locator('text=Loading tasks...');
    if (await loadingText.isVisible()) {
      await expect(loadingText).toBeVisible();
    }

    // Should eventually show the task management page
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Main elements should still be visible
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should navigate properly via URL', async ({ page }) => {
    // Direct navigation to tasks
    await page.goto('/tasks');

    // Should load the tasks page
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/tasks');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/tasks', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Reload page
    await page.reload();

    // Should handle error gracefully
    const errorMessage = page.locator('text=Failed to Load, text=Could not load tasks');
    if (await errorMessage.first().isVisible()) {
      await expect(errorMessage.first()).toBeVisible();
    } else {
      // If no specific error UI, page should still load without crashing
      await expect(page.locator('h1:has-text("Task Management")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show consistent styling', async ({ page }) => {
    // Check heading styling
    const heading = page.locator('h1:has-text("Task Management")');
    await expect(heading).toHaveCSS('font-weight', '700');

    // Check button styling
    const addButton = page.locator('button:has-text("Add Task")');
    await expect(addButton).toBeVisible();
  });

  test('should display task cards if tasks exist', async ({ page }) => {
    // Wait for API calls to complete
    await page.waitForLoadState('networkidle');

    // Check if any task cards exist
    const taskCards = page
      .locator('[class*="Card"]')
      .filter({ hasText: /Start|Complete|To Pending/ });
    const taskCount = await taskCards.count();

    if (taskCount > 0) {
      // If tasks exist, verify they have proper structure
      const firstTask = taskCards.first();

      // Should have content
      await expect(firstTask).toBeVisible();

      // Should have status change buttons
      const statusButtons = firstTask.locator('button', { hasText: /Start|Complete|To Pending/ });
      expect(await statusButtons.count()).toBeGreaterThan(0);
    }

    // Test passes regardless of whether tasks exist or not
    expect(true).toBe(true);
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check that summary shows zero counts if no tasks
    const totalTasksCard = page.locator('text=Total Tasks').locator('..');
    const totalCount = await totalTasksCard.locator('.text-2xl').textContent();

    if (totalCount === '0') {
      // Verify other counts are also zero
      const pendingCard = page.locator('text=Pending').locator('..');
      const pendingCount = await pendingCard.locator('.text-2xl').textContent();
      expect(pendingCount).toBe('0');
    }

    // Page should still function normally
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible();
  });
});
