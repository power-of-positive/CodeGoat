import { test, expect } from '@playwright/test';

test.describe('Task Details Viewing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to projects page first
    await page.goto('/projects');
    
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });
    
    // Click on the first project to navigate to tasks
    const firstCard = page.locator('.grid > div').first();
    await firstCard.click();
    
    // Wait for navigation to project tasks page
    await page.waitForURL('**/projects/*/tasks', { timeout: 10000 });
    
    // Wait for kanban board to be visible
    await expect(page.locator('text="To Do"')).toBeVisible();
  });

  test('should open task details panel when clicking on a task card', async ({ page }) => {
    // Wait for task cards to be visible
    await page.waitForSelector('[data-rfd-draggable-id]', { timeout: 10000 });
    
    // Get the first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    
    // Verify task card is visible
    await expect(firstTaskCard).toBeVisible();
    
    // Get task title for verification
    const taskTitle = await firstTaskCard.locator('h4').textContent();
    expect(taskTitle).toBeTruthy();
    
    // Click on the task card
    await firstTaskCard.click();
    
    // Wait for task details panel to open
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    
    // Verify task details panel is visible
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    await expect(taskDetailsPanel).toBeVisible();
    
    // Verify task title appears in the details panel
    await expect(taskDetailsPanel.locator(`text="${taskTitle}"`)).toBeVisible();
  });

  test('should display task details header with title and actions', async ({ page }) => {
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    const taskTitle = await firstTaskCard.locator('h4').textContent();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Check for header elements
    await expect(taskDetailsPanel.locator(`h2:has-text("${taskTitle}")`)).toBeVisible();
    
    // Check for action buttons (close, edit, delete)
    const closeButton = taskDetailsPanel.locator('button[aria-label="Close"], button:has(svg[class*="X"])');
    await expect(closeButton).toBeVisible();
    
    // Check for dropdown menu with edit/delete options
    const menuTrigger = taskDetailsPanel.locator('button[aria-haspopup="menu"], button:has(svg[class*="MoreHorizontal"])');
    await expect(menuTrigger).toBeVisible();
  });

  test('should display task details tabs (logs, diffs, processes)', async ({ page }) => {
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Check for tab navigation
    const tabList = taskDetailsPanel.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
    
    // Check for specific tabs
    await expect(tabList.locator('button[role="tab"]:has-text("Logs")')).toBeVisible();
    await expect(tabList.locator('button[role="tab"]:has-text("Diffs")')).toBeVisible();
    await expect(tabList.locator('button[role="tab"]:has-text("Processes")')).toBeVisible();
    
    // Verify logs tab is active by default
    const logsTab = tabList.locator('button[role="tab"]:has-text("Logs")');
    await expect(logsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should switch between tabs in task details', async ({ page }) => {
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Get tab buttons
    const tabList = taskDetailsPanel.locator('[role="tablist"]');
    const logsTab = tabList.locator('button[role="tab"]:has-text("Logs")');
    const diffsTab = tabList.locator('button[role="tab"]:has-text("Diffs")');
    const processesTab = tabList.locator('button[role="tab"]:has-text("Processes")');
    
    // Click on Diffs tab
    await diffsTab.click();
    await expect(diffsTab).toHaveAttribute('aria-selected', 'true');
    await expect(logsTab).toHaveAttribute('aria-selected', 'false');
    
    // Click on Processes tab
    await processesTab.click();
    await expect(processesTab).toHaveAttribute('aria-selected', 'true');
    await expect(diffsTab).toHaveAttribute('aria-selected', 'false');
    
    // Click back to Logs tab
    await logsTab.click();
    await expect(logsTab).toHaveAttribute('aria-selected', 'true');
    await expect(processesTab).toHaveAttribute('aria-selected', 'false');
  });

  test('should close task details panel using close button', async ({ page }) => {
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Find and click close button
    const closeButton = taskDetailsPanel.locator('button[aria-label="Close"], button:has(svg[class*="X"])');
    await closeButton.click();
    
    // Verify panel is closed
    await expect(taskDetailsPanel).not.toBeVisible();
  });

  test('should close task details panel using ESC key', async ({ page }) => {
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Press ESC key
    await page.keyboard.press('Escape');
    
    // Verify panel is closed
    await expect(taskDetailsPanel).not.toBeVisible();
  });

  test('should display task description in details panel', async ({ page }) => {
    // Find a task card with description
    const taskCards = page.locator('[data-rfd-draggable-id]');
    const taskCount = await taskCards.count();
    
    let taskWithDescription = null;
    let taskTitle = '';
    let taskDescription = '';
    
    // Look for a task with description
    for (let i = 0; i < taskCount; i++) {
      const card = taskCards.nth(i);
      const descElement = card.locator('.text-muted-foreground');
      if (await descElement.isVisible()) {
        taskWithDescription = card;
        taskTitle = await card.locator('h4').textContent() || '';
        taskDescription = await descElement.textContent() || '';
        break;
      }
    }
    
    // If no task with description found, create one or skip test
    if (!taskWithDescription) {
      test.skip();
      return;
    }
    
    // Click on the task with description
    await taskWithDescription.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Verify task title and description appear in details
    await expect(taskDetailsPanel.locator(`text="${taskTitle}"`)).toBeVisible();
    
    // Description might be truncated in card but full in details
    const descriptionPart = taskDescription.substring(0, 50);
    await expect(taskDetailsPanel.locator(`text*="${descriptionPart}"`)).toBeVisible();
  });

  test('should handle task details panel on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // On mobile, panel should overlay the entire screen
    await expect(taskDetailsPanel).toBeVisible();
    
    // Check for backdrop on mobile
    const backdrop = page.locator('.fixed.inset-0.bg-black');
    await expect(backdrop).toBeVisible();
    
    // Click backdrop to close
    await backdrop.click({ position: { x: 10, y: 10 } });
    
    // Verify panel is closed
    await expect(taskDetailsPanel).not.toBeVisible();
  });

  test('should persist selected task when switching tabs', async ({ page }) => {
    // Click on first task card
    const firstTaskCard = page.locator('[data-rfd-draggable-id]').first();
    const taskTitle = await firstTaskCard.locator('h4').textContent();
    await firstTaskCard.click();
    
    // Wait for task details panel
    await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
    const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
    
    // Switch to Diffs tab
    const diffsTab = taskDetailsPanel.locator('button[role="tab"]:has-text("Diffs")');
    await diffsTab.click();
    
    // Verify task title is still visible
    await expect(taskDetailsPanel.locator(`h2:has-text("${taskTitle}")`)).toBeVisible();
    
    // Switch to Processes tab
    const processesTab = taskDetailsPanel.locator('button[role="tab"]:has-text("Processes")');
    await processesTab.click();
    
    // Verify task title is still visible
    await expect(taskDetailsPanel.locator(`h2:has-text("${taskTitle}")`)).toBeVisible();
  });

  test('should show task status indicators in details panel', async ({ page }) => {
    // Look for tasks with different status indicators
    const taskCards = page.locator('[data-rfd-draggable-id]');
    
    // Find a task with status indicator (spinner, check, or X)
    const taskWithIndicator = taskCards.locator(':has(svg.animate-spin), :has(svg.text-green-500), :has(svg.text-red-500)').first();
    
    if (await taskWithIndicator.isVisible()) {
      // Get the task title
      const taskTitle = await taskWithIndicator.locator('h4').textContent();
      
      // Check which indicator it has
      const hasSpinner = await taskWithIndicator.locator('svg.animate-spin').isVisible();
      const hasCheck = await taskWithIndicator.locator('svg.text-green-500').isVisible();
      const hasX = await taskWithIndicator.locator('svg.text-red-500').isVisible();
      
      // Click on the task
      await taskWithIndicator.click();
      
      // Wait for task details panel
      await page.waitForSelector('[role="dialog"], .fixed.right-0, .absolute.right-0', { timeout: 10000 });
      const taskDetailsPanel = page.locator('[role="dialog"], .fixed.right-0, .absolute.right-0').first();
      
      // Verify the same indicators appear in the details panel
      if (hasSpinner) {
        await expect(taskDetailsPanel.locator('svg.animate-spin')).toBeVisible();
      }
      if (hasCheck) {
        await expect(taskDetailsPanel.locator('svg.text-green-500')).toBeVisible();
      }
      if (hasX) {
        await expect(taskDetailsPanel.locator('svg.text-red-500')).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});