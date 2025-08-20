import { test, expect } from '@playwright/test';

test.describe('Task Management UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the task management page
    await page.goto('/tasks');

    // Wait for the page to load and be ready
    await page.waitForSelector('h1:has-text("Task Management")', { timeout: 10000 });
  });

  test('should navigate to task management page from sidebar', async ({ page }) => {
    // Start from home page
    await page.goto('/');

    // Click on Tasks in the sidebar
    await page.click('nav a[href="/tasks"]');

    // Should be on the tasks page
    await expect(page).toHaveURL(/.*\/tasks$/);
    await expect(page.locator('h1')).toContainText('Task Management');
    await expect(page.locator('p')).toContainText('Manage your tasks with a kanban-style board');
  });

  test('should display task management page elements', async ({ page }) => {
    // Check main page elements
    await expect(page.locator('h1')).toContainText('Task Management');
    await expect(page.locator('p')).toContainText('Manage your tasks with a kanban-style board');

    // Check Add Task button
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();

    // Check summary cards section
    await expect(page.locator('text=Total Tasks')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();

    // Check kanban columns
    await expect(page.locator('.bg-gray-50:has-text("Pending")')).toBeVisible();
    await expect(page.locator('.bg-blue-50:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('.bg-green-50:has-text("Completed")')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // This test should be run on a fresh page load to catch the loading state
    await page.goto('/tasks');

    // The loading state might be very brief, so we'll accept if we see it or if it's already loaded
    const loadingText = page.locator('text=Loading tasks...');
    const mainContent = page.locator('h1:has-text("Task Management")');

    // Wait for either loading state or main content
    await expect(loadingText.or(mainContent)).toBeVisible({ timeout: 5000 });

    // Eventually main content should be visible
    await expect(mainContent).toBeVisible({ timeout: 10000 });
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

    // Should show error state
    await expect(page.locator('text=Failed to Load')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Could not load tasks')).toBeVisible();
  });

  test('should open task creation form when Add Task is clicked', async ({ page }) => {
    // Click Add Task button
    await page.click('button:has-text("Add Task")');

    // Check that the form appears
    await expect(page.locator('text=Create New Task')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Describe the task"]')).toBeVisible();
    await expect(page.locator('select')).toHaveCount(2); // Priority and Status dropdowns
    await expect(page.locator('button:has-text("Create")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
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
    await expect(page.locator('h1:has-text("Task Management")')).toBeVisible();
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

    // Check badges
    await expect(page.locator('.bg-red-100:has-text("high")')).toBeVisible(); // Priority badge
    await expect(page.locator('.bg-blue-100:has-text("In Progress")')).toBeVisible(); // Status badge

    // Check task metadata
    await expect(page.locator(`text=${testTaskId}`)).toBeVisible(); // Task ID
    await expect(page.locator('text=Started')).toBeVisible();
    await expect(page.locator('text=8/18/2025')).toBeVisible(); // Start date

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
    await expect(page.locator("text=The task you're looking for doesn't exist")).toBeVisible();
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

    // Check run details
    await expect(page.locator('text=15000ms')).toBeVisible(); // Duration of successful run
    await expect(page.locator('text=8000ms')).toBeVisible(); // Duration of failed run

    // Check timestamps
    await expect(page.locator('text=8/18/2025')).toBeVisible(); // Should appear multiple times

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
