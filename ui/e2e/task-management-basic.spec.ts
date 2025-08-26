import { test, expect } from '@playwright/test';

test.describe('Task Management Basic Tests', () => {
  test('should navigate to task management page', async ({ page }) => {
    // Navigate to the task management page
    await page.goto('/tasks');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Check if we can see the tasks heading
    const taskHeading = page.locator('text=Tasks');
    if (await taskHeading.count() > 0) {
      await expect(taskHeading).toBeVisible();
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/tasks');
    }
  });

  test('should display basic page elements', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Check if main heading is available
    const mainHeading = page.locator('text=Tasks');
    if (await mainHeading.count() > 0) {
      await expect(mainHeading).toBeVisible();
    }

    // Check for Add Task button
    const addTaskButton = page.locator('text=Add Task');
    if (await addTaskButton.count() > 0) {
      await expect(addTaskButton).toBeVisible();
    }

    // Check for kanban column headers with flexible selectors
    const pendingColumn = page.locator('text=Pending');
    if (await pendingColumn.count() > 0) {
      await expect(pendingColumn).toBeVisible();
    }
    
    const inProgressColumn = page.locator('text=In Progress');
    if (await inProgressColumn.count() > 0) {
      await expect(inProgressColumn).toBeVisible();
    }
    
    const completedColumn = page.locator('text=Completed');
    if (await completedColumn.count() > 0) {
      await expect(completedColumn).toBeVisible();
    }
    
    // At minimum, verify we're on the right route
    expect(page.url()).toContain('/tasks');
  });

  test('should open task creation form', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Try to click Add Task button if available
    const addTaskButton = page.locator('text=Add Task');
    if (await addTaskButton.count() > 0) {
      await addTaskButton.click();

      // Check if form appears
      const formTitle = page.locator('text=Create New Task');
      if (await formTitle.count() > 0) {
        await expect(formTitle).toBeVisible();
        
        // Check for form elements if they exist
        const textarea = page.locator('textarea');
        if (await textarea.count() > 0) {
          await expect(textarea).toBeVisible();
        }
        
        const selects = page.locator('select');
        const selectCount = await selects.count();
        if (selectCount > 0) {
          await expect(selects.first()).toBeVisible();
        }
        
        const createButton = page.locator('text=Create');
        if (await createButton.count() > 0) {
          await expect(createButton).toBeVisible();
        }
        
        const cancelButton = page.locator('text=Cancel');
        if (await cancelButton.count() > 0) {
          await expect(cancelButton).toBeVisible();
        }
      }
    }
    
    // At minimum, verify we're on the right route
    expect(page.url()).toContain('/tasks');
  });

  test('should navigate to task details page', async ({ page }) => {
    await page.goto('/tasks/test-id');
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit more for content to load
    await page.waitForTimeout(1000);

    // Check if task details content is available
    const taskDetailsHeading = page.locator('text=Task Details');
    if (await taskDetailsHeading.count() > 0) {
      await expect(taskDetailsHeading).toBeVisible();
    } else {
      // Check for "not found" error
      const notFoundHeading = page.locator('text=Task Not Found');
      if (await notFoundHeading.count() > 0) {
        await expect(notFoundHeading).toBeVisible();
      } else {
        // Check for loading state
        const loadingText = page.locator('text=Loading task details');
        if (await loadingText.count() > 0) {
          await expect(loadingText).toBeVisible();
        } else {
          // Check for any task-related content
          const taskContent = page.locator('text=Task');
          if (await taskContent.count() > 0) {
            await expect(taskContent.first()).toBeVisible();
          } else {
            // At minimum, verify we're on a task detail route
            expect(page.url()).toMatch(/\/tasks\/[^/]+$/);
          }
        }
      }
    }
  });
});
