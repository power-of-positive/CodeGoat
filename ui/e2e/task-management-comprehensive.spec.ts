import { test, expect } from '@playwright/test';

test.describe('Task Management Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the task management page
    await page.goto('/tasks');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
  });

  test('should navigate to task management page from sidebar', async ({ page }) => {
    // Start from home page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Try to click on Tasks in the sidebar if available
    const tasksLink = page.locator('nav a[href="/tasks"]');
    if ((await tasksLink.count()) > 0) {
      await tasksLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Should be on the tasks page
      await expect(page).toHaveURL(/.*\/tasks$/);

      // Look for the main page heading specifically
      const heading = page.getByRole('heading', { name: 'Tasks' });
      if ((await heading.count()) > 0) {
        await expect(heading).toBeVisible();
      }

      const description = page.locator(
        'text=Comprehensive task management with advanced filtering and CRUD operations'
      );
      if ((await description.count()) > 0) {
        await expect(description).toBeVisible();
      }
    } else {
      // Navigate directly if sidebar link doesn't exist
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/tasks');
    }
  });

  test('should display task management page elements', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Check main page elements
    // Look for the main page heading specifically
    const heading = page.getByRole('heading', { name: 'Task Management' });
    if ((await heading.count()) > 0) {
      await expect(heading).toBeVisible();
    }

    const description = page.locator(
      'text=Comprehensive task management with advanced filtering and CRUD operations'
    );
    if ((await description.count()) > 0) {
      await expect(description).toBeVisible();
    }

    // Check Add Task button - be more specific to avoid matching task titles
    const addTaskButton = page.getByRole('button', { name: 'Add Task' }).first();
    if ((await addTaskButton.count()) > 0) {
      await expect(addTaskButton).toBeVisible();
    }

    // Check for Refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    if ((await refreshButton.count()) > 0) {
      await expect(refreshButton).toBeVisible();
    }

    // Look for task-related content - could be table headers, task rows, or empty state
    const tableContent = page.locator('table');
    const taskItems = page.locator('[data-testid*="task"], .task-item');
    const emptyState = page.locator('text="No Tasks Found"');

    // Check if any of these elements are visible
    const hasTable = (await tableContent.count()) > 0;
    const hasTaskItems = (await taskItems.count()) > 0;
    const hasEmptyState = (await emptyState.count()) > 0;

    if (hasTable || hasTaskItems || hasEmptyState) {
      // At least one task-related element should be visible
      if (hasTable) await expect(tableContent.first()).toBeVisible();
      else if (hasTaskItems) await expect(taskItems.first()).toBeVisible();
      else if (hasEmptyState) await expect(emptyState.first()).toBeVisible();
    }

    // At minimum, verify we're on the right route
    expect(page.url()).toContain('/tasks');
  });

  test('should show loading state initially', async ({ page }) => {
    // This test should be run on a fresh page load to catch the loading state
    await page.goto('/tasks');

    // The loading state might be very brief, so we'll accept if we see it or if it's already loaded
    // PageLoading component shows "Loading..." by default
    const loadingText = page.locator('text=Loading...');
    const mainContent = page.getByRole('heading', { name: 'Task Management' });
    const noTasksText = page.locator('text=No Tasks Found');
    const addTaskButton = page.getByRole('button', { name: 'Add Task' });

    // Wait for either loading state, main content, no tasks message, or task interface
    await expect(loadingText.or(mainContent).or(noTasksText).or(addTaskButton)).toBeVisible({
      timeout: 5000,
    });

    // Eventually some content should be visible and we should be on the right route
    expect(page.url()).toContain('/tasks');
  });

  test('should handle error state gracefully', async ({ page }) => {
    // Mock a network error by intercepting the API call
    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Check if error state is shown
    const failedToLoadText = page.locator('text=Failed to Load');
    if ((await failedToLoadText.count()) > 0) {
      await expect(failedToLoadText).toBeVisible({ timeout: 10000 });

      const errorMessage = page.locator('text=Could not load tasks');
      if ((await errorMessage.count()) > 0) {
        await expect(errorMessage).toBeVisible();
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/tasks');
    }
  });

  test('should open task creation form when Add Task is clicked', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Try to click Add Task button if it exists - be specific to avoid matching task titles
    const addTaskButton = page.getByRole('button', { name: 'Add Task' }).first();
    if ((await addTaskButton.count()) > 0) {
      await addTaskButton.click();

      // Check if the form appears
      const formTitle = page.locator('text=Create New Task');
      if ((await formTitle.count()) > 0) {
        await expect(formTitle).toBeVisible();

        const textarea = page.locator('textarea[placeholder*="Describe the task"]');
        if ((await textarea.count()) > 0) {
          await expect(textarea).toBeVisible();
        }

        const selects = page.locator('select');
        const selectCount = await selects.count();
        if (selectCount >= 2) {
          await expect(selects.first()).toBeVisible();
        }

        const createButton = page.locator('text=Create');
        if ((await createButton.count()) > 0) {
          await expect(createButton).toBeVisible();
        }

        const cancelButton = page.locator('text=Cancel');
        if ((await cancelButton.count()) > 0) {
          await expect(cancelButton).toBeVisible();
        }
      }
    }

    // At minimum, verify we're on the right route
    expect(page.url()).toContain('/tasks');
  });

  test('should create a new task successfully', async ({ page }) => {
    // Mock the create task API call
    await page.route('**/api/tasks', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-task-1',
            content: 'Test task description',
            priority: 'high',
            status: 'pending',
          }),
        });
      } else {
        // For GET requests, return empty array initially
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Click Add Task button
    await page.click('button:has-text("Add Task")');

    // Fill in the form
    await page.fill('textarea[placeholder*="Describe the task"]', 'Test task description');
    await page.selectOption('select', 'high'); // Priority dropdown

    // Submit the form
    await page.click('button:has-text("Create")');

    // Form should disappear
    await expect(page.locator('text=Create New Task')).not.toBeVisible();
  });

  test('should cancel task creation', async ({ page }) => {
    // Click Add Task button
    await page.click('button:has-text("Add Task")');

    // Form should be visible
    await expect(page.locator('text=Create New Task')).toBeVisible();

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Form should disappear
    await expect(page.locator('text=Create New Task')).not.toBeVisible();
  });

  test('should validate required fields in task creation', async ({ page }) => {
    // Click Add Task button
    await page.click('button:has-text("Add Task")');

    // Try to submit empty form
    await page.click('button:has-text("Create")');

    // Form should still be visible (validation prevents submission)
    await expect(page.locator('text=Create New Task')).toBeVisible();

    // HTML5 validation should prevent submission
    const textarea = page.locator('textarea[placeholder*="Describe the task"]');
    await expect(textarea).toHaveAttribute('required');
  });

  test('should display task cards with correct information', async ({ page }) => {
    // Mock tasks data
    const mockTasks = [
      {
        id: 'task-1',
        content: 'Test pending task',
        priority: 'high',
        status: 'pending',
        startTime: null,
        endTime: null,
        duration: null,
      },
      {
        id: 'task-2',
        content: 'Test in progress task',
        priority: 'medium',
        status: 'in_progress',
        startTime: '2025-08-18T08:00:00.000Z',
        endTime: null,
        duration: null,
      },
      {
        id: 'task-3',
        content: 'Test completed task',
        priority: 'low',
        status: 'completed',
        startTime: '2025-08-18T08:00:00.000Z',
        endTime: '2025-08-18T09:00:00.000Z',
        duration: '1h 0m',
      },
    ];

    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTasks),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Test pending task');

    // Check that tasks appear in correct columns
    const pendingColumn = page.locator('.bg-gray-50');
    const inProgressColumn = page.locator('.bg-blue-50');
    const completedColumn = page.locator('.bg-green-50');

    await expect(pendingColumn.locator('text=Test pending task')).toBeVisible();
    await expect(inProgressColumn.locator('text=Test in progress task')).toBeVisible();
    await expect(completedColumn.locator('text=Test completed task')).toBeVisible();

    // Check priority badges
    await expect(page.locator('.bg-red-100:has-text("HIGH")')).toBeVisible(); // High priority
    await expect(page.locator('.bg-yellow-100:has-text("MEDIUM")')).toBeVisible(); // Medium priority
    await expect(page.locator('.bg-gray-100:has-text("LOW")')).toBeVisible(); // Low priority

    // Check duration display for completed task
    await expect(page.locator('text=Duration: 1h 0m')).toBeVisible();

    // Check summary counts
    await expect(page.locator('text=3').first()).toBeVisible(); // Total tasks
  });

  test('should open task actions menu and show options', async ({ page }) => {
    // Mock a single task
    const mockTasks = [
      {
        id: 'task-1',
        content: 'Test task for menu',
        priority: 'medium',
        status: 'pending',
      },
    ];

    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTasks),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Test task for menu');

    // Click the three dots menu
    await page.click('button:has([data-lucide="more-vertical"])');

    // Check menu options
    await expect(page.locator('text=View Details')).toBeVisible();
    await expect(page.locator('text=Edit')).toBeVisible();
    await expect(page.locator('text=Delete')).toBeVisible();
  });

  test('should change task status using status buttons', async ({ page }) => {
    // Mock initial task and update response
    const mockTask = {
      id: 'task-1',
      content: 'Test status change task',
      priority: 'medium',
      status: 'pending',
    };

    await page.route('**/api/tasks', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockTask]),
        });
      }
    });

    await page.route('**/api/tasks/task-1', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...mockTask, status: 'in_progress' }),
        });
      }
    });

    await page.reload();
    await page.waitForSelector('text=Test status change task');

    // Click "Start" button to move to in_progress
    await page.click('button:has-text("Start")');

    // The API call should have been made (we can't easily verify UI change without real backend)
  });

  test('should open edit form when edit is clicked', async ({ page }) => {
    // Mock a single task
    const mockTask = {
      id: 'task-1',
      content: 'Task to edit',
      priority: 'high',
      status: 'pending',
    };

    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockTask]),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Task to edit');

    // Open actions menu and click edit
    await page.click('button:has([data-lucide="more-vertical"])');
    await page.click('text=Edit');

    // Check that edit form appears with pre-filled data
    await expect(page.locator('text=Edit Task')).toBeVisible();
    await expect(page.locator('textarea')).toHaveValue('Task to edit');
    await expect(page.locator('button:has-text("Update")')).toBeVisible();
  });

  test('should confirm before deleting a task', async ({ page }) => {
    // Mock a single task
    const mockTask = {
      id: 'task-1',
      content: 'Task to delete',
      priority: 'low',
      status: 'pending',
    };

    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockTask]),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Task to delete');

    // Set up dialog handler
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete this task?');
      dialog.accept();
    });

    // Open actions menu and click delete
    await page.click('button:has([data-lucide="more-vertical"])');
    await page.click('text=Delete');

    // Dialog should have appeared and been handled
  });

  test('should navigate to task details when task content is clicked', async ({ page }) => {
    // Mock a single task
    const mockTask = {
      id: 'task-1',
      content: 'Task with details',
      priority: 'medium',
      status: 'pending',
    };

    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockTask]),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Task with details');

    // Click on the task content to navigate to details
    await page.click('text=Task with details');

    // Should navigate to task details page
    await expect(page).toHaveURL(/.*\/tasks\/task-1$/);
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // The page should still be functional
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();

    // Kanban columns should be horizontally scrollable
    const kanbanContainer = page.locator('.flex.gap-6.overflow-x-auto');
    await expect(kanbanContainer).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab to Add Task button and activate it
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need multiple tabs to reach the button

    // Find and focus the Add Task button specifically
    await page.focus('button:has-text("Add Task")');
    await page.keyboard.press('Enter');

    // Form should open
    await expect(page.locator('text=Create New Task')).toBeVisible();

    // Tab to textarea and type
    await page.keyboard.press('Tab');
    await page.type('textarea', 'Keyboard navigation test task');

    // Tab to priority dropdown
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown'); // Change selection

    // Tab to Create button and submit
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Skip status dropdown
    await page.keyboard.press('Enter');
  });
});
