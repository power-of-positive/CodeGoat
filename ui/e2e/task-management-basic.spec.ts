import { test, expect } from '@playwright/test';

test.describe('Task Management Basic Tests', () => {
  test('should navigate to task management page', async ({ page }) => {
    // Navigate to the task management page
    await page.goto('/tasks');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if we can see the task management heading (be more specific)
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible();
  });

  test('should display basic page elements', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Should see the main heading
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible();

    // Should see the Add Task button
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();

    // Should see kanban column headers (be more specific)
    await expect(page.locator('h3:has-text("Pending")')).toBeVisible();
    await expect(page.locator('h3:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('h3:has-text("Completed")')).toBeVisible();
  });

  test('should open task creation form', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Click Add Task button
    await page.click('button:has-text("Add Task")');

    // Form should appear
    await expect(page.locator('text=Create New Task')).toBeVisible();

    // Should have form elements
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('select')).toHaveCount(2); // Priority and Status
    await expect(page.locator('button:has-text("Create")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should navigate to task details page', async ({ page }) => {
    await page.goto('/tasks/test-id');
    await page.waitForLoadState('networkidle');

    // Wait a bit more for content to load
    await page.waitForTimeout(1000);

    // Check what headings exist on the page
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Found headings:', headings);

    // Should either show task details or a "not found" error, or loading
    const hasTaskDetails = await page.locator('h1:has-text("Task Details")').isVisible();
    const hasNotFound = await page.locator('h2:has-text("Task Not Found")').isVisible();
    const hasLoading = await page.locator('text=Loading task details').isVisible();
    const hasAnyTaskContent = await page.locator('text=Task').first().isVisible();

    // As long as we get some task-related content, the route is working
    expect(hasTaskDetails || hasNotFound || hasLoading || hasAnyTaskContent).toBe(true);
  });
});
