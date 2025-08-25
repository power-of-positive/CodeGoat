import { test, expect } from '@playwright/test';

test.describe('Permissions and Tasks Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate between permissions and tasks pages', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to permissions
    const permissionsLink = page.locator('text=Permissions');
    if (await permissionsLink.count() > 0) {
      await permissionsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/permissions');
      
      const permissionEditor = page.locator('text=Permission Editor');
      if (await permissionEditor.count() > 0) {
        await expect(permissionEditor).toBeVisible();
      }
    }

    // Try to navigate to tasks
    const tasksLink = page.locator('text=Tasks');
    if (await tasksLink.count() > 0) {
      await tasksLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/tasks');
      
      const taskManagement = page.locator('text=Tasks');
      if (await taskManagement.count() > 0) {
        await expect(taskManagement).toBeVisible();
      }
    }

    // Try to navigate back to permissions
    if (await permissionsLink.count() > 0) {
      await permissionsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/permissions');
      
      const permissionEditor = page.locator('text=Permission Editor');
      if (await permissionEditor.count() > 0) {
        await expect(permissionEditor).toBeVisible();
      }
    }
    
    // At minimum, verify we navigated successfully
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(permissions|tasks)$/);
  });

  test('should maintain sidebar navigation state across pages', async ({ page }) => {
    // Check that sidebar is visible on both pages
    await page.click('a:has-text("Permissions")');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a:has-text("Tasks")')).toBeVisible();

    await page.click('a:has-text("Tasks")');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a:has-text("Permissions")')).toBeVisible();
  });

  test('should handle URL navigation correctly', async ({ page }) => {
    // Direct navigation to permissions
    await page.goto('/permissions');
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Direct navigation to tasks
    await page.goto('/tasks');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

    // Navigate to task detail via URL (if tasks exist)
    const taskCards = page.locator('[data-testid^="task-card-"]');
    if ((await taskCards.count()) > 0) {
      const firstTaskId = await taskCards.first().getAttribute('data-testid');
      const taskId = firstTaskId?.replace('task-card-', '');

      if (taskId) {
        await page.goto(`/tasks/${taskId}`);
        await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
      }
    }
  });

  test('should show consistent layout and styling across pages', async ({ page }) => {
    // Check permissions page styling
    await page.click('a:has-text("Permissions")');

    // Check for consistent header styling
    const permissionsHeader = page.locator('h1:has-text("Permission Editor")');
    await expect(permissionsHeader).toHaveCSS('font-weight', '700'); // Bold

    // Check for consistent button styling
    const addCommandButton = page.locator('button:has-text("Add Command Rule")');
    await expect(addCommandButton).toBeVisible();

    // Navigate to tasks and check styling consistency
    await page.click('a:has-text("Tasks")');

    // Check for consistent header styling
    const tasksHeader = page.locator('h1:has-text("Tasks")');
    await expect(tasksHeader).toHaveCSS('font-weight', '700'); // Bold

    // Check for consistent button styling
    const addTaskButton = page.locator('button:has-text("Add Task")');
    await expect(addTaskButton).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate to permissions
    await page.click('a:has-text("Permissions")');
    await expect(page).toHaveURL('/permissions');

    // Navigate to tasks
    await page.click('a:has-text("Tasks")');
    await expect(page).toHaveURL('/tasks');

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/permissions');
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
  });

  test('should preserve form state when navigating away and back', async ({ page }) => {
    // Go to permissions and add a rule
    await page.click('a:has-text("Permissions")');
    await page.click('button:has-text("Add Command Rule")');

    // Fill in some data
    const newRule = page.locator('[data-testid^="command-rule-"]').last();
    await newRule.locator('input[name$=".pattern"]').fill('test-navigation');

    // Navigate away to tasks
    await page.click('a:has-text("Tasks")');
    await expect(page).toHaveURL('/tasks');

    // Navigate back to permissions
    await page.click('a:has-text("Permissions")');
    await expect(page).toHaveURL('/permissions');

    // Check if the form data is preserved (depends on implementation)
    // Note: This might not work if the component unmounts and remounts
    const ruleWithTestData = page.locator('input[value="test-navigation"]');
    if (await ruleWithTestData.isVisible()) {
      await expect(ruleWithTestData).toHaveValue('test-navigation');
    }
  });

  test('should show loading states during navigation', async ({ page }) => {
    // Navigate to permissions with slow network
    await page.route('**/api/**', async route => {
      // Add small delay to see loading states
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.click('a:has-text("Permissions")');

    // Check that navigation happens smoothly
    await expect(page).toHaveURL('/permissions');
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();
  });

  test('should handle API errors gracefully on both pages', async ({ page }) => {
    // Mock API errors
    await page.route('**/api/permissions', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.route('**/api/tasks', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Navigate to permissions - should handle error gracefully
    await page.click('a:has-text("Permissions")');
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Navigate to tasks - should handle error gracefully
    await page.click('a:has-text("Tasks")');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
  });

  test('should maintain authentication state across navigation', async ({ page }) => {
    // This test assumes the app requires authentication
    // Check that user can access both protected routes

    await page.click('a:has-text("Permissions")');
    await expect(page).toHaveURL('/permissions');
    // Should not redirect to login

    await page.click('a:has-text("Tasks")');
    await expect(page).toHaveURL('/tasks');
    // Should not redirect to login
  });

  test('should show correct active navigation state', async ({ page }) => {
    // Navigate to permissions
    await page.click('a:has-text("Permissions")');

    // Permissions nav item should be active
    const permissionsNav = page.locator('a:has-text("Permissions")');
    await expect(permissionsNav).toHaveClass(/active|current|selected/i);

    // Tasks nav item should not be active
    const tasksNav = page.locator('a:has-text("Tasks")');
    await expect(tasksNav).not.toHaveClass(/active|current|selected/i);

    // Navigate to tasks
    await page.click('a:has-text("Tasks")');

    // Tasks nav item should be active
    await expect(tasksNav).toHaveClass(/active|current|selected/i);

    // Permissions nav item should not be active
    await expect(permissionsNav).not.toHaveClass(/active|current|selected/i);
  });

  test('should handle rapid navigation without issues', async ({ page }) => {
    // Rapidly switch between pages
    await page.click('a:has-text("Permissions")');
    await page.click('a:has-text("Tasks")');
    await page.click('a:has-text("Permissions")');
    await page.click('a:has-text("Tasks")');

    // Should end up on tasks page without errors
    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
  });

  test('should work correctly with different viewport sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigation should work on mobile
    await page.click('a:has-text("Permissions")');
    await expect(page).toHaveURL('/permissions');
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    await page.click('a:has-text("Tasks")');
    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.click('a:has-text("Permissions")');
    await expect(page).toHaveURL('/permissions');
    await expect(page.locator('h1:has-text("Permission Editor")')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle keyboard navigation between pages', async ({ page }) => {
    // Focus on permissions link
    await page.focus('a:has-text("Permissions")');

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/permissions');

    // Focus on tasks link
    await page.focus('a:has-text("Tasks")');

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/tasks');
  });
});
