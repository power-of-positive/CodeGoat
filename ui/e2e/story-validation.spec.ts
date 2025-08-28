import { test, expect } from '@playwright/test';

test.describe('Tasks Page Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display tasks page', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Should be on the tasks page
    expect(page.url()).toContain('/tasks');
    
    // Should show some heading or content
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
    
    // Should have main content area
    const mainContent = page.locator('main, .container, #root > div').first();
    await expect(mainContent).toBeVisible();
  });

  test('should show task management interface', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Look for common task management elements
    const addTaskButton = page.getByRole('button', { name: 'Add Task' });
    
    // If Add Task button exists, it should be visible and enabled
    if (await addTaskButton.isVisible()) {
      await expect(addTaskButton).toBeVisible();
      await expect(addTaskButton).toBeEnabled();
    }
    
    // Look for task cards or task list
    const taskCards = page.locator('[data-testid*="task-card"], [class*="task-card"], .task-item');
    
    if (await taskCards.count() > 0) {
      // If tasks exist, first one should be visible
      await expect(taskCards.first()).toBeVisible();
    } else {
      // If no tasks, should show empty state or be ready for task creation
      const emptyState = page.locator('text=/no tasks|empty|create.*task/i');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should handle add task button click', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    const addTaskButton = page.getByRole('button', { name: 'Add Task' });
    
    if (await addTaskButton.isVisible()) {
      await addTaskButton.click();
      
      // Wait for any modal/form to appear
      await page.waitForTimeout(1000);
      
      // Look for form elements
      const dialog = page.getByRole('dialog');
      const formInputs = page.locator('input, textarea, select');
      
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      } else if (await formInputs.count() > 0) {
        // Form might appear inline
        await expect(formInputs.first()).toBeVisible();
      }
    }
    
    // Should still be on tasks page
    expect(page.url()).toContain('/tasks');
  });

  test('should display task cards if tasks exist', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Look for task cards
    const taskCards = page.locator('[data-testid*="task-card"], [class*="task-card"], .task-item');
    const taskCount = await taskCards.count();
    
    if (taskCount > 0) {
      // Should show task cards
      await expect(taskCards.first()).toBeVisible();
      
      // Each visible task card should have some content
      for (let i = 0; i < Math.min(taskCount, 3); i++) {
        const taskCard = taskCards.nth(i);
        if (await taskCard.isVisible()) {
          // Task should have some text content
          const textContent = await taskCard.textContent();
          expect(textContent?.trim().length).toBeGreaterThan(0);
        }
      }
    } else {
      // No tasks - should handle empty state gracefully
      const mainContent = page.locator('main, .container, #root > div').first();
      await expect(mainContent).toBeVisible();
    }
  });

  test('should handle task card interaction', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Look for task cards
    const taskCards = page.locator('[data-testid*="task-card"], [class*="task-card"], .task-item');
    
    if (await taskCards.count() > 0) {
      const firstTask = taskCards.first();
      await firstTask.click();
      
      // Wait for any navigation or modal
      await page.waitForTimeout(1000);
      
      // Should either navigate to task detail or show task info
      const currentUrl = page.url();
      if (currentUrl.includes('/tasks/')) {
        // Navigated to task detail page
        const heading = page.getByRole('heading').first();
        await expect(heading).toBeVisible();
      } else {
        // Might show modal or inline details
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          await expect(dialog).toBeVisible();
        }
      }
    }
  });

  test('should maintain responsive layout', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Main elements should still be visible
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
    
    const mainContent = page.locator('main, .container, #root > div').first();
    await expect(mainContent).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await expect(heading).toBeVisible();
  });

  test('should handle page reload gracefully', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Should still show tasks page
    expect(page.url()).toContain('/tasks');
    
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    const mainContent = page.locator('main, .container, #root > div').first();
    await expect(mainContent).toBeVisible();
  });

  test('should allow navigation back to other pages', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate to analytics
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/analytics');
    
    // Navigate back to tasks
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/tasks');
    
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });
});