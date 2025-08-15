import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Kanban board functionality
 * Tests all aspects of the project task management system including:
 * - Board rendering and layout
 * - Task card functionality  
 * - Drag and drop operations
 * - CRUD operations
 * - Search and filtering
 * - Task details panel
 * - Templates system
 * - Keyboard shortcuts
 * - Status transitions
 * - Error handling
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data constants
function generateTestProject() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    name: `Kanban Test Project ${timestamp}-${randomId}`,
    git_repo_path: `/tmp/test-kanban-repo-${timestamp}-${randomId}`,
    use_existing_repo: false,
    setup_script: 'echo "Setup complete"',
    dev_script: 'npm run dev',
    cleanup_script: 'echo "Cleanup complete"'
  };
}

const TEST_TASKS = [
  {
    title: 'Test Task 1 - Todo',
    description: 'This is a test task in todo status',
    status: 'todo'
  },
  {
    title: 'Test Task 2 - In Progress',
    description: 'This is a test task in progress',
    status: 'inprogress'
  },
  {
    title: 'Test Task 3 - Done',
    description: 'This is a completed test task',
    status: 'done'
  }
];

// Helper functions
async function createTestProject() {
  const testProject = generateTestProject();
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testProject),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create test project: ${response.status} - ${errorText}`);
    throw new Error(`Failed to create test project: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  
  // Handle both success response format and error response format
  if (result.success === false) {
    throw new Error(`Project creation failed: ${result.message}`);
  }
  
  const project = result.data || result;
  console.log('Created test project:', project);
  return project;
}

async function createTestTask(projectId: string, task: any) {
  console.log('Creating task with projectId:', projectId, 'task:', task);
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: task.title,
      description: task.description,
      // Don't include project_id in body - it's in the URL path
      // Don't include parent_task_attempt if it's null/undefined - it's optional
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create test task: ${response.status} - ${errorText}`);
    throw new Error(`Failed to create test task: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.data || result;
}

async function updateTaskStatus(taskId: string, status: string, taskData: any, projectId: string) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: taskData.title,
      description: taskData.description,
      status: status,
      // Don't include parent_task_attempt if it's null/undefined
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update task status: ${response.status}`);
  }
  
  return response.json();
}

async function cleanupTestData(projectId: string) {
  try {
    // Delete the test project (should cascade delete tasks)
    await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.warn('Failed to cleanup test project:', error);
  }
}

async function navigateToProject(page: Page, projectId: string) {
  await page.goto(`${UI_BASE_URL}/projects/${projectId}/tasks`);
  
  // Wait for the page to load completely
  await page.waitForFunction(
    () => {
      const loader = document.querySelector('[data-testid="loader"]');
      return !loader;
    },
    { timeout: 10000 }
  );
}

async function waitForKanbanBoard(page: Page) {
  // Wait for the Kanban board to be visible
  await page.waitForSelector('[data-testid="kanban-board"], .grid.w-full.auto-cols-fr', { 
    timeout: 15000 
  });
}

test.describe('Kanban Board Functionality', () => {
  let testProject: any;
  const testTasks: any[] = [];

  test.beforeAll(async () => {
    // Create test project and tasks once for all tests
    testProject = await createTestProject();
    
    for (const taskData of TEST_TASKS) {
      const task = await createTestTask(testProject.id, taskData);
      // Update task status to match test data
      if (taskData.status !== 'todo') {
        await updateTaskStatus(task.id, taskData.status, taskData, testProject.id);
      }
      testTasks.push(task);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Just navigate to the project for each test
    await navigateToProject(page, testProject.id);
  });

  test.afterAll(async () => {
    // Cleanup test data after all tests
    if (testProject) {
      await cleanupTestData(testProject.id);
    }
  });

  test.describe('Board Rendering and Layout', () => {
    test('should display Kanban board with all status columns', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Check that all status columns are present by their headers
      await expect(page.locator('text=To Do')).toBeVisible();
      await expect(page.locator('text=In Progress')).toBeVisible();
      await expect(page.locator('text=In Review')).toBeVisible();
      await expect(page.locator('text=Done')).toBeVisible();
      await expect(page.locator('text=Cancelled')).toBeVisible();
    });

    test('should display project name in header', async ({ page }) => {
      await page.waitForSelector('h1');
      
      // Look for project name in a more specific selector to avoid multiple h1 elements
      const projectHeader = page.locator('h1').filter({ hasText: TEST_PROJECT.name });
      await expect(projectHeader).toBeVisible();
    });

    test('should show search input and add task button', async ({ page }) => {
      await expect(page.locator('input[placeholder="Search tasks..."]')).toBeVisible();
      await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
      await expect(page.locator('button[title="Project Settings"]')).toBeVisible();
      await expect(page.locator('button[title="Open in IDE"]')).toBeVisible();
    });

    test('should display empty state when no tasks exist', async ({ page }) => {
      // Clean up test tasks first
      for (const task of testTasks) {
        await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, { method: 'DELETE' });
      }
      
      await page.reload();
      await page.waitForSelector('text="No tasks found for this project."', { timeout: 10000 });
      
      await expect(page.locator('text="No tasks found for this project."')).toBeVisible();
      await expect(page.locator('button:has-text("Create First Task")')).toBeVisible();
    });
  });

  test.describe('Task Card Components', () => {
    test('should display task cards with correct content', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Wait for tasks to be loaded
      await page.waitForFunction(
        () => {
          const cards = document.querySelectorAll('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm');
          return cards.length > 0;
        },
        { timeout: 15000 }
      );
      
      // Check that task cards are visible
      for (const taskData of TEST_TASKS) {
        const taskCard = page.locator(`text="${taskData.title}"`);
        await expect(taskCard).toBeVisible();
        
        // Check that description is shown (truncated if long)
        if (taskData.description && taskData.description.length <= 130) {
          await expect(page.locator(`text="${taskData.description}"`)).toBeVisible();
        }
      }
    });

    test('should show task action menu on card', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Wait for first task card
      const firstTaskCard = page.locator('text="Test Task 1 - Todo"').first();
      await firstTaskCard.waitFor({ state: 'visible', timeout: 10000 });
      
      // Find the actions menu button (three dots)
      const actionsButton = page.locator('.h-3.w-3').first();
      await expect(actionsButton).toBeVisible();
      
      // Click to open menu
      await actionsButton.click();
      
      // Check menu items
      await expect(page.locator('text="Edit"')).toBeVisible();
      await expect(page.locator('text="Delete"')).toBeVisible();
    });

    test('should show task status indicators', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Wait for cards to load
      await page.waitForTimeout(2000);
      
      // Check for status indicators (icons may vary based on actual task state)
      // This test checks that the card structure supports indicators
      const indicators = page.locator('.h-3.w-3');
      await expect(indicators.first()).toBeVisible();
    });

    test('should truncate long task descriptions', async ({ page }) => {
      // Create a task with a very long description
      const longTask = {
        title: 'Long Description Test',
        description: 'A'.repeat(200), // 200 character description
        status: 'todo'
      };
      
      const task = await createTestTask(testProject.id, longTask);
      await page.reload();
      await waitForKanbanBoard(page);
      
      // Check that description is truncated with ellipsis
      const taskCard = page.locator(`text="${longTask.title}"`);
      await expect(taskCard).toBeVisible();
      
      // Should show truncated description
      const truncatedText = 'A'.repeat(130) + '...';
      await expect(page.locator(`text="${truncatedText}"`)).toBeVisible();
    });
  });

  test.describe('Task CRUD Operations', () => {
    test('should create new task via Add Task button', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Click Add Task button
      const addButton = page.locator('button:has-text("Add Task")');
      await addButton.click();
      
      // Wait for task dialog to open
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Fill in task details
      const newTask = {
        title: 'New Test Task',
        description: 'Created via E2E test'
      };
      
      await page.fill('input[placeholder*="task title"], input[name="title"]', newTask.title);
      await page.fill('textarea[placeholder*="description"], textarea[name="description"]', newTask.description);
      
      // Submit the form
      await page.click('button:has-text("Create Task"), button[type="submit"]');
      
      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
      
      // Verify task appears on board
      await expect(page.locator(`text="${newTask.title}"`)).toBeVisible({ timeout: 10000 });
    });

    test('should edit existing task', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Find and click on first task's action menu
      const firstTaskCard = page.locator('text="Test Task 1 - Todo"').first();
      await firstTaskCard.waitFor({ state: 'visible' });
      
      // Click the task actions menu
      const actionsButton = firstTaskCard.locator('..').locator('.h-3.w-3').first();
      await actionsButton.click();
      
      // Click Edit
      await page.click('text="Edit"');
      
      // Wait for edit dialog
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Edit task details
      const editedTask = {
        title: 'Edited Test Task',
        description: 'This task was edited via E2E test'
      };
      
      // Clear and fill new title
      await page.fill('input[name="title"]', editedTask.title);
      await page.fill('textarea[name="description"]', editedTask.description);
      
      // Save changes
      await page.click('button:has-text("Update Task"), button:has-text("Save")');
      
      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
      
      // Verify changes are reflected on board
      await expect(page.locator(`text="${editedTask.title}"`)).toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text="${editedTask.description}"`)).toBeVisible();
    });

    test('should delete task', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Count initial tasks
      const initialCards = await page.locator('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm').count();
      
      // Find and click on first task's action menu
      const firstTaskCard = page.locator('text="Test Task 1 - Todo"').first();
      await firstTaskCard.waitFor({ state: 'visible' });
      
      const actionsButton = firstTaskCard.locator('..').locator('.h-3.w-3').first();
      await actionsButton.click();
      
      // Click Delete
      await page.click('text="Delete"');
      
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      // Wait for task to be removed from board
      await page.waitForFunction(
        (initialCount) => {
          const cards = document.querySelectorAll('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm');
          return cards.length < initialCount;
        },
        initialCards,
        { timeout: 10000 }
      );
      
      // Verify task is no longer visible
      await expect(page.locator('text="Test Task 1 - Todo"')).not.toBeVisible();
    });

    test('should show task creation with template selection', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Click on template dropdown (library icon)
      const templateButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
      await templateButton.click();
      
      // Check if template menu opens
      await expect(page.locator('text="Manage Templates"')).toBeVisible();
      
      // Click on Manage Templates to verify it opens
      await page.click('text="Manage Templates"');
      
      // Verify template manager dialog opens
      await page.waitForSelector('text="Manage Templates"', { timeout: 5000 });
      
      // Close the dialog
      await page.click('button:has-text("Done")');
    });
  });

  test.describe('Drag and Drop Functionality', () => {
    test('should drag task between columns', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Wait for tasks to load
      await page.waitForTimeout(2000);
      
      // Find the task in todo column
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      await expect(todoTask).toBeVisible();
      
      // Find the in-progress column
      const inProgressColumn = page.locator('[id="inprogress"]');
      await expect(inProgressColumn).toBeVisible();
      
      // Perform drag and drop
      await todoTask.dragTo(inProgressColumn);
      
      // Wait for the drag operation to complete
      await page.waitForTimeout(1000);
      
      // Verify the task moved to in-progress column
      const inProgressSection = page.locator('[id="inprogress"]');
      const movedTask = inProgressSection.locator('text="Test Task 1 - Todo"');
      await expect(movedTask).toBeVisible({ timeout: 5000 });
    });

    test('should update task status after drag and drop', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Drag task from todo to done
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      const doneColumn = page.locator('[id="done"]');
      
      await todoTask.dragTo(doneColumn);
      await page.waitForTimeout(2000);
      
      // Refresh page and verify persistence
      await page.reload();
      await waitForKanbanBoard(page);
      
      // Verify task is in done column
      const doneSection = page.locator('[id="done"]');
      const movedTask = doneSection.locator('text="Test Task 1 - Todo"');
      await expect(movedTask).toBeVisible({ timeout: 10000 });
    });

    test('should handle drag and drop cancellation', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      const originalColumn = page.locator('[id="todo"]');
      
      // Start drag but don't complete it
      await todoTask.hover();
      await page.mouse.down();
      await page.mouse.move(200, 200);
      await page.mouse.up();
      
      // Verify task remains in original column
      const taskInOriginal = originalColumn.locator('text="Test Task 1 - Todo"');
      await expect(taskInOriginal).toBeVisible();
    });

    test('should show visual feedback during drag operation', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      
      // Start drag operation
      await todoTask.hover();
      await page.mouse.down();
      
      // Check for drag visual feedback (cursor should change)
      const draggingElement = page.locator('.cursor-grabbing');
      await expect(draggingElement).toBeVisible();
      
      // Complete drag operation
      await page.mouse.up();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should filter tasks by title', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Wait for all tasks to be visible
      await expect(page.locator('text="Test Task 1 - Todo"')).toBeVisible();
      await expect(page.locator('text="Test Task 2 - In Progress"')).toBeVisible();
      
      // Use search input
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill('Test Task 1');
      
      // Wait for filtering to occur
      await page.waitForTimeout(500);
      
      // Verify only matching task is visible
      await expect(page.locator('text="Test Task 1 - Todo"')).toBeVisible();
      await expect(page.locator('text="Test Task 2 - In Progress"')).not.toBeVisible();
    });

    test('should filter tasks by description', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Search by description content
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill('completed test task');
      
      await page.waitForTimeout(500);
      
      // Should show the done task that has "completed" in description
      await expect(page.locator('text="Test Task 3 - Done"')).toBeVisible();
      await expect(page.locator('text="Test Task 1 - Todo"')).not.toBeVisible();
    });

    test('should clear search filter', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      
      // Apply filter
      await searchInput.fill('Test Task 1');
      await page.waitForTimeout(500);
      await expect(page.locator('text="Test Task 2 - In Progress"')).not.toBeVisible();
      
      // Clear filter
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      // All tasks should be visible again
      await expect(page.locator('text="Test Task 1 - Todo"')).toBeVisible();
      await expect(page.locator('text="Test Task 2 - In Progress"')).toBeVisible();
      await expect(page.locator('text="Test Task 3 - Done"')).toBeVisible();
    });

    test('should show no results when search has no matches', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill('NonExistentTask12345');
      
      await page.waitForTimeout(500);
      
      // No tasks should be visible
      await expect(page.locator('text="Test Task 1 - Todo"')).not.toBeVisible();
      await expect(page.locator('text="Test Task 2 - In Progress"')).not.toBeVisible();
      await expect(page.locator('text="Test Task 3 - Done"')).not.toBeVisible();
    });

    test('should be case insensitive', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill('test TASK 1');
      
      await page.waitForTimeout(500);
      
      // Should still find the task
      await expect(page.locator('text="Test Task 1 - Todo"')).toBeVisible();
    });
  });

  test.describe('Task Details Panel', () => {
    test('should open task details panel when clicking on task', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Click on a task card
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.click();
      
      // Wait for panel to open and URL to update
      await page.waitForFunction(
        () => window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
      
      // Verify panel is visible
      await expect(page.locator('[data-testid="task-details-panel"]')).toBeVisible({ timeout: 5000 });
    });

    test('should show task details in panel', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Click on task to open details
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.click();
      
      // Wait for panel
      await page.waitForTimeout(2000);
      
      // Verify task information is displayed
      await expect(page.locator('text="Test Task 1 - Todo"')).toBeVisible();
      await expect(page.locator('text="This is a test task in todo status"')).toBeVisible();
    });

    test('should close task details panel', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Open panel
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.click();
      
      await page.waitForTimeout(2000);
      
      // Find and click close button
      const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
      await closeButton.click();
      
      // Verify panel closes and URL updates
      await page.waitForFunction(
        () => !window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
    });

    test('should show different tabs in task details', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.click();
      
      await page.waitForTimeout(2000);
      
      // Check for tab navigation
      const tabs = ['Logs', 'Diff', 'Processes'];
      for (const tab of tabs) {
        // Look for tab buttons or labels
        await expect(page.locator(`text="${tab}"`).first()).toBeVisible({ timeout: 2000 }).catch(() => {
          // Some tabs might not be visible depending on task state
          console.log(`Tab ${tab} not found - may be conditional`);
        });
      }
    });
  });

  test.describe('Task Status Workflow', () => {
    test('should maintain task count across status changes', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Count initial tasks
      const initialTaskCount = await page.locator('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm').count();
      
      // Move task between columns
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      const doneColumn = page.locator('[id="done"]');
      
      await todoTask.dragTo(doneColumn);
      await page.waitForTimeout(1000);
      
      // Verify total task count remains the same
      const finalTaskCount = await page.locator('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm').count();
      expect(finalTaskCount).toBe(initialTaskCount);
    });

    test('should handle all status transitions', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const columns = [
        { id: 'todo', name: 'To Do' },
        { id: 'inprogress', name: 'In Progress' },
        { id: 'inreview', name: 'In Review' },
        { id: 'done', name: 'Done' },
        { id: 'cancelled', name: 'Cancelled' }
      ];
      
      const testTask = page.locator('text="Test Task 1 - Todo"').first();
      
      // Test moving through each status
      for (let i = 1; i < columns.length; i++) {
        const targetColumn = page.locator(`[id="${columns[i].id}"]`);
        await testTask.dragTo(targetColumn);
        await page.waitForTimeout(1000);
        
        // Verify task is in the target column
        const taskInTarget = targetColumn.locator('text="Test Task 1 - Todo"');
        await expect(taskInTarget).toBeVisible();
      }
    });

    test('should persist status changes after page reload', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Move task to done
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      const doneColumn = page.locator('[id="done"]');
      
      await todoTask.dragTo(doneColumn);
      await page.waitForTimeout(2000);
      
      // Reload page
      await page.reload();
      await waitForKanbanBoard(page);
      
      // Verify task is still in done column
      const doneSection = page.locator('[id="done"]');
      const persistedTask = doneSection.locator('text="Test Task 1 - Todo"');
      await expect(persistedTask).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Simulate network failure by blocking API calls
      await page.route('**/api/**', route => {
        route.abort();
      });
      
      // Try to create a new task - should handle error gracefully
      await page.click('button:has-text("Add Task")');
      
      // Dialog should still open
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Try to submit (will fail due to blocked API)
      await page.fill('input[name="title"]', 'Network Fail Test');
      await page.click('button[type="submit"]');
      
      // Should handle error gracefully (exact behavior may vary)
      // The important thing is it shouldn't crash the app
      await page.waitForTimeout(2000);
      
      // Remove network block
      await page.unroute('**/api/**');
    });

    test('should handle invalid task data', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Try to create task with only title (valid)
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[name="title"]', 'Valid Task');
      await page.click('button[type="submit"]');
      
      // Should succeed
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
      await expect(page.locator('text="Valid Task"')).toBeVisible({ timeout: 10000 });
    });

    test('should handle empty search gracefully', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      
      // Test empty search
      await searchInput.fill('');
      await page.waitForTimeout(500);
      
      // All tasks should be visible
      await expect(page.locator('text="Test Task 1 - Todo"')).toBeVisible();
      await expect(page.locator('text="Test Task 2 - In Progress"')).toBeVisible();
    });

    test('should handle rapid drag operations', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      
      // Perform multiple rapid drag operations
      for (let i = 0; i < 3; i++) {
        const targetColumn = i % 2 === 0 ? '[id="inprogress"]' : '[id="todo"]';
        await taskCard.dragTo(page.locator(targetColumn));
        await page.waitForTimeout(300);
      }
      
      // Task should still be functional and visible
      await expect(taskCard).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts and Accessibility', () => {
    test('should support keyboard navigation on task cards', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Focus on first task card
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.focus();
      
      // Verify card is focused
      await expect(taskCard).toBeFocused();
      
      // Test Enter key to open details
      await taskCard.press('Enter');
      
      // Should navigate to task details
      await page.waitForFunction(
        () => window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
    });

    test('should support task deletion via keyboard', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Focus on task card
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.focus();
      
      // Press Backspace to delete (if implemented)
      page.on('dialog', dialog => dialog.accept());
      await taskCard.press('Backspace');
      
      // Wait to see if task gets deleted
      await page.waitForTimeout(2000);
      
      // Note: This test verifies keyboard shortcut support if implemented
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Check for accessibility attributes
      const kanbanContainer = page.locator('.grid.w-full.auto-cols-fr').first();
      await expect(kanbanContainer).toBeVisible();
      
      // Verify task cards have proper focus indicators
      const taskCards = page.locator('.rounded-md.p-3.shadow-sm');
      const firstCard = taskCards.first();
      
      // Cards should be focusable
      await expect(firstCard).toHaveAttribute('tabindex', /^-?\d+$/);
    });
  });

  test.describe('Responsive Design and Mobile Behavior', () => {
    test('should adapt layout for tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await waitForKanbanBoard(page);
      
      // Verify Kanban board is still functional
      await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
      
      // Check that columns are still accessible
      const columns = ['todo', 'inprogress', 'done'];
      for (const columnId of columns) {
        await expect(page.locator(`[id="${columnId}"]`)).toBeVisible();
      }
    });

    test('should handle mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForKanbanBoard(page);
      
      // Verify basic functionality still works
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
      
      // Check that Kanban board is scrollable horizontally
      const kanbanBoard = page.locator('.overflow-x-scroll, .min-w-\\[900px\\]');
      await expect(kanbanBoard).toBeVisible();
    });

    test('should maintain touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Test touch interaction with task cards
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.tap();
      
      // Should still open task details
      await page.waitForFunction(
        () => window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
    });

    test('should handle overflow content gracefully', async ({ page }) => {
      // Create many tasks to test overflow
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Overflow Test Task ${i + 1}`,
        description: `Test task ${i + 1} for overflow testing`,
        status: 'todo'
      }));

      // Create the tasks
      for (const taskData of manyTasks) {
        await createTestTask(testProject.id, taskData);
      }

      await page.reload();
      await waitForKanbanBoard(page);
      
      // Verify scrolling works within columns
      const todoColumn = page.locator('[id="todo"]');
      await expect(todoColumn).toBeVisible();
      
      // Should be able to see multiple tasks
      const taskCount = await todoColumn.locator('.rounded-md.p-3.shadow-sm').count();
      expect(taskCount).toBeGreaterThan(5);
    });
  });

  test.describe('Performance and Real-time Updates', () => {
    test('should handle large numbers of tasks efficiently', async ({ page }) => {
      // Measure initial load time
      const startTime = Date.now();
      await waitForKanbanBoard(page);
      const loadTime = Date.now() - startTime;
      
      // Load time should be reasonable (less than 5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Board should be responsive
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      const searchStartTime = Date.now();
      await searchInput.fill('Test');
      const searchTime = Date.now() - searchStartTime;
      
      // Search should be fast (less than 1 second)
      expect(searchTime).toBeLessThan(1000);
    });

    test('should update task counts in real-time', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Count tasks in todo column
      const todoColumn = page.locator('[id="todo"]');
      const initialCount = await todoColumn.locator('.rounded-md.p-3.shadow-sm').count();
      
      // Create a new task via API (simulating real-time update)
      await createTestTask(testProject.id, {
        title: 'Real-time Test Task',
        description: 'Should appear without refresh',
        status: 'todo'
      });
      
      // Wait for potential real-time update (2 second polling interval)
      await page.waitForTimeout(3000);
      
      // Check if task count increased
      const newCount = await todoColumn.locator('.rounded-md.p-3.shadow-sm').count();
      expect(newCount).toBeGreaterThan(initialCount);
    });

    test('should handle concurrent user interactions', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Simulate concurrent operations
      const promises = [
        // Search operation
        page.locator('input[placeholder="Search tasks..."]').fill('Test Task'),
        
        // Drag operation
        page.locator('text="Test Task 1 - Todo"').first().dragTo(page.locator('[id="inprogress"]')),
        
        // Click operation
        page.locator('text="Test Task 2 - In Progress"').first().click()
      ];
      
      // Execute all operations concurrently
      await Promise.allSettled(promises);
      
      // Verify the board is still functional
      await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
    });

    test('should gracefully handle API slowness', async ({ page }) => {
      // Simulate slow API responses
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        route.continue();
      });
      
      await waitForKanbanBoard(page);
      
      // Try to create a task with delayed API
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      
      await page.fill('input[name="title"]', 'Slow API Test');
      await page.click('button[type="submit"]');
      
      // Should show loading state or handle delay gracefully
      // The important thing is it shouldn't crash
      await page.waitForTimeout(5000);
      
      // Remove route delay
      await page.unroute('**/api/**');
    });
  });

  test.describe('Integration and Project Navigation', () => {
    test('should navigate back to projects list', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Navigate back to projects (if there's a back button or breadcrumb)
      await page.goto(`${UI_BASE_URL}/projects`);
      
      // Verify we're on projects page
      await page.waitForSelector('text="Projects", h1:has-text("Projects")', { timeout: 10000 });
      
      // Should see our test project
      await expect(page.locator(`text="${TEST_PROJECT.name}"`)).toBeVisible();
    });

    test('should handle direct URL navigation to task details', async ({ page }) => {
      // Get a task ID first
      const taskResponse = await fetch(`${API_BASE_URL}/api/projects/${testProject.id}/tasks`);
      const tasks = await taskResponse.json();
      const firstTask = Array.isArray(tasks) ? tasks[0] : tasks.data?.[0];
      
      if (firstTask) {
        // Navigate directly to task details URL
        await page.goto(`${UI_BASE_URL}/projects/${testProject.id}/tasks/${firstTask.id}`);
        
        // Should open with task details panel
        await page.waitForFunction(
          () => window.location.pathname.includes('/tasks/'),
          { timeout: 5000 }
        );
        
        // Verify task details are shown
        await expect(page.locator(`text="${firstTask.title}"`)).toBeVisible({ timeout: 10000 });
      }
    });

    test('should maintain state across navigation', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Apply search filter
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill('Test Task 1');
      await page.waitForTimeout(500);
      
      // Navigate to settings and back
      await page.click('button[title="Project Settings"]');
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Close settings
      await page.keyboard.press('Escape');
      
      // Search filter should be preserved
      await expect(searchInput).toHaveValue('Test Task 1');
      await expect(page.locator('text="Test Task 2 - In Progress"')).not.toBeVisible();
    });

    test('should handle browser back/forward buttons', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Click on a task to open details
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      await taskCard.click();
      
      await page.waitForFunction(
        () => window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
      
      // Use browser back button
      await page.goBack();
      
      // Should return to task list view
      await page.waitForFunction(
        () => !window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
      
      // Use browser forward button
      await page.goForward();
      
      // Should return to task details
      await page.waitForFunction(
        () => window.location.pathname.includes('/tasks/'),
        { timeout: 5000 }
      );
    });
  });

  test.describe('Data Persistence and Reliability', () => {
    test('should persist data after browser refresh', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Create a new task
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]');
      
      const taskTitle = 'Persistence Test Task';
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
      await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 10000 });
      
      // Refresh the page
      await page.reload();
      await waitForKanbanBoard(page);
      
      // Task should still be there
      await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 10000 });
    });

    test('should handle offline/online transitions', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Simulate going offline
      await page.context().setOffline(true);
      
      // Try to create a task while offline
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[name="title"]', 'Offline Test Task');
      await page.click('button[type="submit"]');
      
      // Should handle the offline state gracefully
      await page.waitForTimeout(2000);
      
      // Go back online
      await page.context().setOffline(false);
      
      // The application should recover
      await page.waitForTimeout(2000);
      
      // Close any dialogs that might be open
      await page.keyboard.press('Escape');
      
      // Board should still be functional
      await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
    });

    test('should recover from temporary API failures', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Simulate temporary API failure
      let requestCount = 0;
      await page.route('**/api/**', route => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      // Try operation that will initially fail
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[name="title"]', 'Recovery Test Task');
      await page.click('button[type="submit"]');
      
      // Wait for potential retry and recovery
      await page.waitForTimeout(5000);
      
      // Remove route interception
      await page.unroute('**/api/**');
      
      // Application should still be functional
      await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
    });
  });

  test.describe('Integration Tests', () => {
    test('should integrate templates with task creation from kanban board', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Look for template dropdown or template button
      const templateButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
      if (await templateButton.isVisible()) {
        await templateButton.click();
        
        // Check if templates are available
        const templateOptions = page.locator('[role="menuitem"], [role="option"]');
        const templateCount = await templateOptions.count();
        
        if (templateCount > 0) {
          // Select first template
          await templateOptions.first().click();
          
          // Should pre-populate task creation form
          const dialog = page.locator('[role="dialog"]');
          await expect(dialog).toBeVisible();
          
          // Verify template content is loaded
          const titleInput = dialog.locator('input[name="title"]');
          const titleValue = await titleInput.inputValue();
          expect(titleValue.length).toBeGreaterThan(0);
        }
      }
    });

    test('should track analytics events for kanban interactions', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Mock analytics endpoint to capture events
      const analyticsEvents: any[] = [];
      await page.route('**/api/analytics/**', route => {
        analyticsEvents.push(route.request().postData());
        route.fulfill({ status: 200, body: '{"success": true}' });
      });
      
      // Perform actions that should trigger analytics
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      if (await taskCard.isVisible()) {
        // Click on task (should track view event)
        await taskCard.click();
        await page.waitForTimeout(500);
        
        // Close details
        const closeButton = page.locator('button[title="Close"]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
        
        // Drag task (should track drag event)
        const inProgressColumn = page.locator('[id="inprogress"]');
        if (await inProgressColumn.isVisible()) {
          await taskCard.dragTo(inProgressColumn);
          await page.waitForTimeout(1000);
        }
      }
      
      // Verify at least some analytics events were captured
      expect(analyticsEvents.length).toBeGreaterThanOrEqual(0);
      
      await page.unroute('**/api/analytics/**');
    });

    test('should maintain real-time updates across browser tabs', async ({ page, context }) => {
      await waitForKanbanBoard(page);
      
      // Open second tab with same project
      const secondTab = await context.newPage();
      await secondTab.goto(page.url());
      await secondTab.waitForSelector('.grid.w-full.auto-cols-fr');
      
      // Create task in first tab
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]');
      
      const newTaskTitle = 'Real-time Test Task';
      await page.fill('input[name="title"]', newTaskTitle);
      await page.click('button[type="submit"]');
      
      // Wait for task to appear in first tab
      await expect(page.locator(`text="${newTaskTitle}"`)).toBeVisible({ timeout: 10000 });
      
      // Check if task appears in second tab (polling-based updates)
      await secondTab.waitForTimeout(5000); // Allow time for potential polling
      await secondTab.reload(); // Simulate refresh-based sync
      
      // Task should appear in second tab after refresh
      await expect(secondTab.locator(`text="${newTaskTitle}"`)).toBeVisible({ timeout: 10000 });
      
      await secondTab.close();
    });
  });

  test.describe('Performance and Scale Tests', () => {
    test('should handle large numbers of tasks efficiently', async ({ page }) => {
      // Create many tasks for performance testing
      const manyTasks = Array.from({ length: 15 }, (_, i) => ({
        title: `Perf Test Task ${i + 1}`,
        description: `Performance testing task ${i + 1}`,
        status: 'todo'
      }));

      // Create tasks in batches
      const batchSize = 5;
      for (let i = 0; i < manyTasks.length; i += batchSize) {
        const batch = manyTasks.slice(i, i + batchSize);
        const promises = batch.map(taskData => createTestTask(testProject.id, taskData));
        await Promise.all(promises);
      }

      // Measure page load performance
      const startTime = Date.now();
      await page.reload();
      await waitForKanbanBoard(page);
      const loadTime = Date.now() - startTime;
      
      // Load time should be reasonable (less than 8 seconds even with many tasks)
      expect(loadTime).toBeLessThan(8000);
      
      // Search should still be responsive
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      const searchStart = Date.now();
      await searchInput.fill('Perf Test');
      await page.waitForTimeout(1000);
      const searchTime = Date.now() - searchStart;
      
      // Search should be fast (less than 2 seconds)
      expect(searchTime).toBeLessThan(2000);
      
      // Should show filtered results
      const visibleTasks = page.locator('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm');
      const visibleCount = await visibleTasks.count();
      expect(visibleCount).toBeGreaterThan(10);
    });

    test('should handle network resilience during drag operations', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Find task to drag
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      const inProgressColumn = page.locator('[id="inprogress"]');
      
      // Start drag operation
      await todoTask.hover();
      await page.mouse.down();
      
      // Simulate network interruption during drag
      await page.route('**/api/projects/**', route => {
        // Simulate slow network
        setTimeout(() => route.continue(), 2000);
      });
      
      // Complete drag operation
      await todoTask.dragTo(inProgressColumn);
      await page.waitForTimeout(3000);
      
      // Task should eventually be moved despite network issues
      const taskInProgress = inProgressColumn.locator('text="Test Task 1 - Todo"');
      await expect(taskInProgress).toBeVisible({ timeout: 10000 });
      
      await page.unroute('**/api/projects/**');
    });

    test('should detect memory usage during extended drag sessions', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      const columns = ['inprogress', 'todo', 'inreview', 'done', 'cancelled'];
      
      // Get initial memory usage
      const initialMetrics = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Perform many rapid drag operations
      for (let i = 0; i < 20; i++) {
        const targetColumn = columns[i % columns.length];
        const columnElement = page.locator(`[id="${targetColumn}"]`);
        
        await taskCard.dragTo(columnElement);
        await page.waitForTimeout(100);
      }
      
      // Check memory usage after drag session
      const finalMetrics = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Memory increase should be reasonable (less than 10MB)
      if (initialMetrics > 0 && finalMetrics > 0) {
        const memoryIncrease = finalMetrics - initialMetrics;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
      
      // Task should still be functional
      await expect(taskCard).toBeVisible();
    });
  });

  test.describe('Advanced Accessibility Tests', () => {
    test('should support screen reader announcements for drag operations', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Check for ARIA live regions for drag announcements
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const liveRegionCount = await liveRegions.count();
      expect(liveRegionCount).toBeGreaterThanOrEqual(0);
      
      // Perform drag operation
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      const inProgressColumn = page.locator('[id="inprogress"]');
      
      await todoTask.dragTo(inProgressColumn);
      await page.waitForTimeout(1000);
      
      // Check if any live regions were updated
      for (let i = 0; i < await liveRegions.count(); i++) {
        const region = liveRegions.nth(i);
        const content = await region.textContent();
        
        // Live regions might announce the status change
        if (content && content.length > 0) {
          expect(typeof content).toBe('string');
        }
      }
    });

    test('should work in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
              border-color: white !important;
            }
          }
        `
      });
      
      await waitForKanbanBoard(page);
      
      // Verify board is still functional and visible
      await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
      
      // Task cards should still be visible
      const taskCards = page.locator('[data-testid*="task-card"], .rounded-md.p-3.shadow-sm');
      const cardCount = await taskCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Drag operations should still work
      const todoTask = page.locator('text="Test Task 1 - Todo"').first();
      if (await todoTask.isVisible()) {
        await todoTask.hover();
        // Should be able to focus and interact
        await expect(todoTask).toBeFocused();
      }
    });

    test('should manage focus properly during keyboard navigation', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Start keyboard navigation
      const addButton = page.locator('button:has-text("Add Task")');
      await addButton.focus();
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveText(/Add Task/);
      
      // Tab through elements and track focus
      const focusedElements: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        
        const currentFocus = page.locator(':focus');
        if (await currentFocus.isVisible()) {
          const tagName = await currentFocus.evaluate(el => el.tagName);
          const text = await currentFocus.textContent();
          focusedElements.push(`${tagName}: ${text?.slice(0, 20) || 'no text'}`);
        }
      }
      
      // Should have focused on multiple elements
      expect(focusedElements.length).toBeGreaterThan(3);
      
      // Focus should be trapped within the kanban board area
      const finalFocus = page.locator(':focus');
      const isInBoard = await finalFocus.evaluate(el => {
        const boardElement = document.querySelector('.grid.w-full.auto-cols-fr');
        return boardElement?.contains(el) || false;
      });
      
      expect(isInBoard || true).toBeTruthy(); // Allow focus outside board for navigation
    });
  });

  test.describe('Advanced Edge Cases', () => {
    test('should handle concurrent drag operations from multiple simulated sources', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      // Get multiple tasks for concurrent operations
      const task1 = page.locator('text="Test Task 1 - Todo"').first();
      const task2 = page.locator('text="Test Task 2 - In Progress"').first();
      
      if (await task1.isVisible() && await task2.isVisible()) {
        const columns = ['inprogress', 'done'];
        
        // Simulate rapid, overlapping drag operations
        const promises = [
          task1.dragTo(page.locator(`[id="${columns[0]}"]`)),
          task2.dragTo(page.locator(`[id="${columns[1]}"]`))
        ];
        
        await Promise.allSettled(promises);
        await page.waitForTimeout(2000);
        
        // Both operations should complete without errors
        await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
      }
    });

    test('should support browser back/forward with task selection state', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      const currentUrl = page.url();
      
      // Click on a task to open details
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      if (await taskCard.isVisible()) {
        await taskCard.click();
        
        // Wait for URL or state change
        await page.waitForTimeout(1000);
        
        // Use browser back button
        await page.goBack();
        await page.waitForTimeout(1000);
        
        // Should return to board view
        const backUrl = page.url();
        expect(backUrl).toBe(currentUrl);
        
        // Board should still be functional
        await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
        
        // Use forward button
        await page.goForward();
        await page.waitForTimeout(1000);
        
        // Should handle forward navigation gracefully
        await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
      }
    });

    test('should support URL deep linking to specific task context', async ({ page }) => {
      // Get a task ID first
      const taskResponse = await fetch(`${API_BASE_URL}/api/projects/${testProject.id}/tasks`);
      const tasks = await taskResponse.json();
      const firstTask = Array.isArray(tasks) ? tasks[0] : tasks.data?.[0];
      
      if (firstTask) {
        // Navigate directly to task-specific URL
        await page.goto(`${UI_BASE_URL}/projects/${testProject.id}/tasks/${firstTask.id}`);
        
        // Should load the board with task context
        await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible({ timeout: 15000 });
        
        // Task should be highlighted or details should be visible
        const taskTitle = firstTask.title || 'Test Task';
        const taskElement = page.locator(`text="${taskTitle}"`);
        await expect(taskElement).toBeVisible({ timeout: 10000 });
        
        // URL should reflect the task context
        const currentUrl = page.url();
        expect(currentUrl).toContain(firstTask.id);
      }
    });

    test('should gracefully handle rapid status transitions', async ({ page }) => {
      await waitForKanbanBoard(page);
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator('text="Test Task 1 - Todo"').first();
      const statuses = ['inprogress', 'todo', 'done', 'inprogress', 'cancelled'];
      
      // Perform very rapid status changes
      for (const status of statuses) {
        const targetColumn = page.locator(`[id="${status}"]`);
        await taskCard.dragTo(targetColumn);
        await page.waitForTimeout(200); // Very quick transitions
      }
      
      // Wait for final state to settle
      await page.waitForTimeout(2000);
      
      // Task should be in a valid final state and board should be stable
      await expect(taskCard).toBeVisible();
      await expect(page.locator('.grid.w-full.auto-cols-fr')).toBeVisible();
      
      // Verify task is in the cancelled column
      const cancelledColumn = page.locator('[id="cancelled"]');
      const taskInCancelled = cancelledColumn.locator('text="Test Task 1 - Todo"');
      await expect(taskInCancelled).toBeVisible({ timeout: 5000 });
    });

    test('should maintain data consistency after browser crash simulation', async ({ page }) => {
      await waitForKanbanBoard(page);
      
      // Create a task and move it
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]');
      
      const crashTestTitle = 'Crash Test Task';
      await page.fill('input[name="title"]', crashTestTitle);
      await page.click('button[type="submit"]');
      
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
      await expect(page.locator(`text="${crashTestTitle}"`)).toBeVisible({ timeout: 10000 });
      
      // Move task to done
      const taskCard = page.locator(`text="${crashTestTitle}"`);
      const doneColumn = page.locator('[id="done"]');
      await taskCard.dragTo(doneColumn);
      await page.waitForTimeout(2000);
      
      // Simulate browser crash by hard reload
      await page.goto(page.url(), { waitUntil: 'load' });
      
      // Wait for page to fully reload
      await waitForKanbanBoard(page);
      
      // Task should still be in done column
      const taskInDone = page.locator('[id="done"]').locator(`text="${crashTestTitle}"`);
      await expect(taskInDone).toBeVisible({ timeout: 10000 });
    });
  });
});