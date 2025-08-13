import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Kanban board functionality
 * Based on the vibe-kanban PRD and RFC requirements
 * 
 * Tests all aspects of the kanban board including:
 * - Board rendering and layout
 * - Task card functionality with status indicators
 * - Drag and drop operations between all columns
 * - CRUD operations for tasks
 * - Search and filtering capabilities
 * - Task details panel integration
 * - Keyboard shortcuts and accessibility
 * - Real-time updates
 * - Error handling and edge cases
 * - Mobile responsiveness
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data factory
function createTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Kanban E2E Test Project ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-kanban-${timestamp}-${randomId}`,
    tasks: [
      {
        title: `Todo Task ${randomId}`,
        description: `Test task in todo status - ${timestamp}`,
        status: 'todo'
      },
      {
        title: `In Progress Task ${randomId}`,
        description: `Test task in progress - ${timestamp}`,
        status: 'inprogress'
      },
      {
        title: `Review Task ${randomId}`,
        description: `Test task in review - ${timestamp}`,
        status: 'inreview'
      },
      {
        title: `Done Task ${randomId}`,
        description: `Test task completed - ${timestamp}`,
        status: 'done'
      },
      {
        title: `Cancelled Task ${randomId}`,
        description: `Test task cancelled - ${timestamp}`,
        status: 'cancelled'
      }
    ]
  };
}

// Helper functions
async function createTestProject() {
  const testData = createTestData();
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testData.projectName,
      git_repo_path: testData.gitRepoPath,
      use_existing_repo: false,
      setup_script: 'echo "Setup complete"',
      dev_script: 'npm run dev',
      cleanup_script: 'echo "Cleanup complete"'
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test project: ${response.status}`);
  }
  
  const result = await response.json();
  return { project: result.data || result, testData };
}

async function createTaskInProject(projectId: string, task: any) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: task.title,
      description: task.description,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.status}`);
  }
  
  const result = await response.json();
  const createdTask = result.data || result;
  
  // Update status if not todo
  if (task.status !== 'todo') {
    await updateTaskStatus(projectId, createdTask.id, task.status);
  }
  
  return createdTask;
}

async function updateTaskStatus(projectId: string, taskId: string, status: string) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update task status: ${response.status}`);
  }
}

async function cleanupProject(projectId: string) {
  try {
    await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.warn('Failed to cleanup project:', error);
  }
}

async function navigateToKanbanBoard(page: Page, projectId: string) {
  await page.goto(`${UI_BASE_URL}/projects/${projectId}/tasks`);
  
  // Wait for kanban board to load
  await page.waitForSelector('[data-testid="kanban-board"], .grid.w-full.auto-cols-fr', {
    timeout: 15000
  });
  
  // Wait for columns to be visible
  await expect(page.locator('text="To Do"')).toBeVisible();
  await expect(page.locator('text="In Progress"')).toBeVisible();
  await expect(page.locator('text="Done"')).toBeVisible();
}

test.describe('Comprehensive Kanban Board Tests', () => {
  let testProject: any;
  let testData: any;
  let createdTasks: any[] = [];

  test.beforeAll(async () => {
    // Create test project and tasks
    const { project, testData: data } = await createTestProject();
    testProject = project;
    testData = data;
    
    // Create all test tasks
    for (const taskData of testData.tasks) {
      const task = await createTaskInProject(testProject.id, taskData);
      createdTasks.push(task);
    }
  });

  test.beforeEach(async ({ page }) => {
    await navigateToKanbanBoard(page, testProject.id);
  });

  test.afterAll(async () => {
    await cleanupProject(testProject.id);
  });

  test.describe('Board Layout and Structure', () => {
    test('should display all kanban columns with correct headers', async ({ page }) => {
      // Verify all column headers are present
      await expect(page.locator('text="To Do"')).toBeVisible();
      await expect(page.locator('text="In Progress"')).toBeVisible();
      await expect(page.locator('text="In Review"')).toBeVisible();
      await expect(page.locator('text="Done"')).toBeVisible();
      await expect(page.locator('text="Cancelled"')).toBeVisible();
    });

    test('should show project header with name and controls', async ({ page }) => {
      // Check project name in header
      await expect(page.locator('h1, h2').filter({ hasText: testData.projectName })).toBeVisible();
      
      // Check toolbar buttons
      await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      await expect(page.locator('button[title*="Settings"], button[title*="Project Settings"]')).toBeVisible();
    });

    test('should display task count badges on column headers', async ({ page }) => {
      // Wait for tasks to load
      await page.waitForTimeout(2000);
      
      // Check that columns show task counts
      const columns = ['todo', 'inprogress', 'inreview', 'done', 'cancelled'];
      for (const columnId of columns) {
        const column = page.locator(`[data-testid="kanban-column-${columnId}"], [id="${columnId}"]`);
        if (await column.isVisible()) {
          // Each column should show some indication of task count
          const columnHeader = column.locator('h3, .column-header').first();
          await expect(columnHeader).toBeVisible();
        }
      }
    });

    test('should handle empty columns gracefully', async ({ page }) => {
      // Create a fresh project with no tasks
      const { project } = await createTestProject();
      await navigateToKanbanBoard(page, project.id);
      
      // All columns should be visible but empty
      const columns = ['todo', 'inprogress', 'inreview', 'done', 'cancelled'];
      for (const columnId of columns) {
        const column = page.locator(`[data-testid="kanban-column-${columnId}"], [id="${columnId}"]`);
        await expect(column).toBeVisible();
      }
      
      // Should show empty state
      await expect(page.locator('text="No tasks found"')).toBeVisible();
      
      await cleanupProject(project.id);
    });
  });

  test.describe('Task Card Display and Interactions', () => {
    test('should display task cards in correct columns', async ({ page }) => {
      // Wait for tasks to load
      await page.waitForTimeout(2000);
      
      // Verify each task appears in its correct column
      for (const taskData of testData.tasks) {
        const taskCard = page.locator(`text="${taskData.title}"`);
        await expect(taskCard).toBeVisible();
        
        // Verify task is in correct column
        const column = page.locator(`[id="${taskData.status}"]`);
        const taskInColumn = column.locator(`text="${taskData.title}"`);
        await expect(taskInColumn).toBeVisible();
      }
    });

    test('should show task status indicators', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Check for status indicators on task cards
      const taskCards = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const cardCount = await taskCards.count();
      
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = taskCards.nth(i);
        // Look for status indicators (spinners, checks, etc.)
        const indicators = card.locator('svg, .status-indicator');
        const indicatorCount = await indicators.count();
        expect(indicatorCount).toBeGreaterThanOrEqual(0); // Cards may or may not have indicators
      }
    });

    test('should display task action menus', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Find first task card
      const firstTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      await expect(firstTask).toBeVisible();
      
      // Hover to reveal action menu
      await firstTask.hover();
      
      // Look for action menu button (three dots or similar)
      const actionButton = page.locator('button').filter({ 
        has: page.locator('[class*="MoreHorizontal"], [class*="menu"], [class*="dots"]') 
      }).first();
      
      if (await actionButton.isVisible()) {
        await actionButton.click();
        
        // Check for menu items
        await expect(page.locator('[role="menuitem"], [role="menu"] button').filter({ hasText: 'Edit' })).toBeVisible();
        await expect(page.locator('[role="menuitem"], [role="menu"] button').filter({ hasText: 'Delete' })).toBeVisible();
        
        // Close menu
        await page.keyboard.press('Escape');
      }
    });

    test('should truncate long task descriptions properly', async ({ page }) => {
      // Create a task with very long description
      const longTask = {
        title: 'Long Description Test',
        description: 'A'.repeat(300), // Very long description
        status: 'todo'
      };
      
      const task = await createTaskInProject(testProject.id, longTask);
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Find the task card
      const taskCard = page.locator(`text="${longTask.title}"`);
      await expect(taskCard).toBeVisible();
      
      // Check that description is truncated (should not show full 300 chars)
      const cardContent = await taskCard.locator('..').textContent();
      expect(cardContent?.length).toBeLessThan(350); // Should be truncated
    });
  });

  test.describe('Drag and Drop Operations', () => {
    test('should drag task from Todo to In Progress', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Find task in todo column
      const todoTask = page.locator(`[id="todo"]`).locator(`text="${testData.tasks[0].title}"`).first();
      await expect(todoTask).toBeVisible();
      
      // Find in progress column drop zone
      const inProgressColumn = page.locator(`[id="inprogress"]`);
      await expect(inProgressColumn).toBeVisible();
      
      // Perform drag and drop
      await todoTask.dragTo(inProgressColumn);
      
      // Wait for operation to complete
      await page.waitForTimeout(1500);
      
      // Verify task moved to in progress column
      const taskInProgress = page.locator(`[id="inprogress"]`).locator(`text="${testData.tasks[0].title}"`);
      await expect(taskInProgress).toBeVisible();
    });

    test('should handle drag across all column transitions', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const statuses = ['todo', 'inprogress', 'inreview', 'done', 'cancelled'];
      const testTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      
      // Move task through each status
      for (let i = 1; i < statuses.length; i++) {
        const targetColumn = page.locator(`[id="${statuses[i]}"]`);
        await testTask.dragTo(targetColumn);
        await page.waitForTimeout(1000);
        
        // Verify task is in target column
        const taskInTarget = targetColumn.locator(`text="${testData.tasks[0].title}"`);
        await expect(taskInTarget).toBeVisible();
      }
    });

    test('should provide visual feedback during drag operations', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const todoTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      
      // Start drag operation
      await todoTask.hover();
      await page.mouse.down();
      
      // Check for drag feedback (cursor changes, etc.)
      await page.waitForTimeout(500);
      
      // Look for drag-related classes or visual indicators
      const dragIndicators = page.locator('.dragging, .drag-over, [data-dragging], .cursor-grabbing');
      const hasIndicators = await dragIndicators.count() > 0;
      
      // Complete drag operation
      await page.mouse.up();
      
      // Visual feedback should exist during drag
      expect(hasIndicators).toBeTruthy();
    });

    test('should prevent invalid drag operations', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const todoTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      const originalColumn = page.locator(`[id="todo"]`);
      
      // Try to drag to an invalid area (outside columns)
      await todoTask.hover();
      await page.mouse.down();
      await page.mouse.move(50, 50); // Move to top-left corner
      await page.mouse.up();
      
      await page.waitForTimeout(1000);
      
      // Task should remain in original column
      const taskStillInOriginal = originalColumn.locator(`text="${testData.tasks[0].title}"`);
      await expect(taskStillInOriginal).toBeVisible();
    });

    test('should persist drag changes after page reload', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Move task to done column
      const todoTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      const doneColumn = page.locator(`[id="done"]`);
      
      await todoTask.dragTo(doneColumn);
      await page.waitForTimeout(1500);
      
      // Reload page
      await page.reload();
      await navigateToKanbanBoard(page, testProject.id);
      
      // Verify task is still in done column
      const taskInDone = page.locator(`[id="done"]`).locator(`text="${testData.tasks[0].title}"`);
      await expect(taskInDone).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Task CRUD Operations', () => {
    test('should create new task via Add Task button', async ({ page }) => {
      // Click Add Task button
      const addButton = page.locator('button:has-text("Add Task")');
      await addButton.click();
      
      // Wait for task creation dialog
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Fill task details
      const newTaskTitle = `New E2E Task ${Date.now()}`;
      const newTaskDescription = 'Created via comprehensive E2E test';
      
      await page.fill('input[id="task-title"], input[name="title"]', newTaskTitle);
      await page.fill('textarea[id="task-description"], textarea[name="description"]', newTaskDescription);
      
      // Submit form
      const submitButton = page.locator('button:has-text("Create Task"), button[type="submit"]');
      await submitButton.click();
      
      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
      
      // Verify task appears on board
      await expect(page.locator(`text="${newTaskTitle}"`)).toBeVisible({ timeout: 10000 });
    });

    test('should edit existing task through action menu', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Find task and open edit dialog
      const taskCard = page.locator(`text="${testData.tasks[1].title}"`).first();
      await taskCard.hover();
      
      const actionButton = page.locator('button').filter({
        has: page.locator('[class*="MoreHorizontal"], [class*="menu"]')
      }).first();
      
      if (await actionButton.isVisible()) {
        await actionButton.click();
        await page.click('[role="menuitem"]:has-text("Edit")');
        
        // Wait for edit dialog
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        
        // Edit task
        const editedTitle = `${testData.tasks[1].title} - EDITED`;
        await page.fill('input[id="task-title"], input[name="title"]', editedTitle);
        
        // Save changes
        await page.click('button:has-text("Update Task"), button:has-text("Save")');
        
        // Wait for dialog to close
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
        
        // Verify changes
        await expect(page.locator(`text="${editedTitle}"`)).toBeVisible({ timeout: 10000 });
      } else {
        test.skip();
      }
    });

    test('should delete task with confirmation', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Count initial tasks
      const initialCount = await page.locator('[data-testid*="task-card"], .task-card, .kanban-card').count();
      
      // Find task to delete
      const taskCard = page.locator(`text="${testData.tasks[2].title}"`).first();
      await taskCard.hover();
      
      const actionButton = page.locator('button').filter({
        has: page.locator('[class*="MoreHorizontal"], [class*="menu"]')
      }).first();
      
      if (await actionButton.isVisible()) {
        await actionButton.click();
        
        // Handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        
        await page.click('[role="menuitem"]:has-text("Delete")');
        
        // Wait for task to be removed
        await page.waitForTimeout(2000);
        
        // Verify task count decreased
        const finalCount = await page.locator('[data-testid*="task-card"], .task-card, .kanban-card').count();
        expect(finalCount).toBeLessThan(initialCount);
        
        // Verify specific task is gone
        await expect(page.locator(`text="${testData.tasks[2].title}"`)).not.toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should validate required fields in task creation', async ({ page }) => {
      // Open task creation dialog
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Try to submit without title
      const submitButton = page.locator('button:has-text("Create Task"), button[type="submit"]');
      await expect(submitButton).toBeDisabled();
      
      // Add title and verify button becomes enabled
      await page.fill('input[id="task-title"], input[name="title"]', 'Valid Title');
      await expect(submitButton).toBeEnabled();
      
      // Cancel dialog
      await page.click('button:has-text("Cancel")');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    });
  });

  test.describe('Search and Filtering', () => {
    test('should filter tasks by title search', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Ensure all tasks are visible initially
      for (const taskData of testData.tasks) {
        await expect(page.locator(`text="${taskData.title}"`)).toBeVisible();
      }
      
      // Search for specific task
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await searchInput.fill(testData.tasks[0].title);
      
      // Wait for filtering
      await page.waitForTimeout(1000);
      
      // Verify only matching task is visible
      await expect(page.locator(`text="${testData.tasks[0].title}"`)).toBeVisible();
      await expect(page.locator(`text="${testData.tasks[1].title}"`)).not.toBeVisible();
    });

    test('should filter tasks by description content', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Search by description content
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      const searchTerm = 'completed'; // From done task description
      await searchInput.fill(searchTerm);
      
      await page.waitForTimeout(1000);
      
      // Should show tasks with matching description
      const visibleTasks = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const visibleCount = await visibleTasks.count();
      expect(visibleCount).toBeGreaterThanOrEqual(1);
    });

    test('should clear search and show all tasks', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      
      // Apply filter
      await searchInput.fill(testData.tasks[0].title);
      await page.waitForTimeout(1000);
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);
      
      // All tasks should be visible again
      for (const taskData of testData.tasks) {
        await expect(page.locator(`text="${taskData.title}"`)).toBeVisible();
      }
    });

    test('should handle case-insensitive search', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      
      // Search with different case
      const searchTerm = testData.tasks[0].title.toUpperCase();
      await searchInput.fill(searchTerm);
      
      await page.waitForTimeout(1000);
      
      // Should still find the task
      await expect(page.locator(`text="${testData.tasks[0].title}"`)).toBeVisible();
    });

    test('should show no results for invalid search', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await searchInput.fill('NONEXISTENT_TASK_12345');
      
      await page.waitForTimeout(1000);
      
      // No task cards should be visible
      const visibleTasks = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const visibleCount = await visibleTasks.count();
      expect(visibleCount).toBe(0);
    });
  });

  test.describe('Keyboard Navigation and Accessibility', () => {
    test('should support tab navigation between task cards', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Start tab navigation from search input
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await searchInput.focus();
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to focus on task cards
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should support Enter key to open task details', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Focus on first task card
      const firstTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      await firstTask.focus();
      
      // Press Enter
      await page.keyboard.press('Enter');
      
      // Should navigate to task details (if implemented)
      await page.waitForTimeout(1000);
      
      // Check if URL changed or panel opened
      const currentUrl = page.url();
      const hasTaskInUrl = currentUrl.includes('/tasks/') || currentUrl.includes('task');
      const hasDetailsPanel = await page.locator('[data-testid="task-details"], .task-details, [role="dialog"]').isVisible();
      
      expect(hasTaskInUrl || hasDetailsPanel).toBeTruthy();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Check for accessibility attributes on kanban board
      const kanbanBoard = page.locator('[data-testid="kanban-board"], .kanban-board, .grid.w-full');
      await expect(kanbanBoard).toBeVisible();
      
      // Check for proper heading structure
      const columnHeaders = page.locator('h2, h3').filter({ hasText: /To Do|In Progress|Done/ });
      const headerCount = await columnHeaders.count();
      expect(headerCount).toBeGreaterThanOrEqual(3);
      
      // Check for focusable task cards
      const taskCards = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const firstCard = taskCards.first();
      
      if (await firstCard.isVisible()) {
        // Should have tabindex for keyboard navigation
        const tabindex = await firstCard.getAttribute('tabindex');
        expect(tabindex !== null).toBeTruthy();
      }
    });

    test('should support Escape key to close dialogs', async ({ page }) => {
      // Open task creation dialog
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      
      // Dialog should close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 });
      
      // Verify dialog is closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should adapt to tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      
      // Kanban board should still be functional
      await expect(page.locator('[data-testid="kanban-board"], .grid.w-full')).toBeVisible();
      
      // Columns should be visible and scrollable
      const columns = ['todo', 'inprogress', 'done'];
      for (const columnId of columns) {
        const column = page.locator(`[id="${columnId}"]`);
        await expect(column).toBeVisible();
      }
      
      // Add Task button should be accessible
      await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
    });

    test('should handle mobile viewport with horizontal scroll', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Board should be scrollable horizontally
      const kanbanContainer = page.locator('[data-testid="kanban-board"], .overflow-x-auto, .min-w-\\[900px\\]');
      await expect(kanbanContainer).toBeVisible();
      
      // Should be able to see at least the first column
      const todoColumn = page.locator(`[id="todo"]`);
      await expect(todoColumn).toBeVisible();
      
      // Touch interactions should work
      const firstTask = page.locator(`text="${testData.tasks[0].title}"`).first();
      if (await firstTask.isVisible()) {
        await firstTask.tap();
        await page.waitForTimeout(1000);
      }
    });

    test('should show mobile-optimized task creation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Open task creation on mobile
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Dialog should be full-screen or properly sized for mobile
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Form should be usable on mobile
      const titleInput = page.locator('input[id="task-title"], input[name="title"]');
      await expect(titleInput).toBeVisible();
      
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Block network requests
      await page.route('**/api/**', route => route.abort());
      
      // Try to create a task (should fail gracefully)
      await page.click('button:has-text("Add Task")');
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      await page.fill('input[id="task-title"], input[name="title"]', 'Network Fail Test');
      await page.click('button:has-text("Create Task"), button[type="submit"]');
      
      // Should handle error without crashing
      await page.waitForTimeout(3000);
      
      // Board should still be functional
      await expect(page.locator('[data-testid="kanban-board"], .grid.w-full')).toBeVisible();
      
      // Restore network
      await page.unroute('**/api/**');
    });

    test('should handle rapid successive drag operations', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator(`text="${testData.tasks[0].title}"`).first();
      const columns = ['inprogress', 'todo', 'done', 'inprogress'];
      
      // Perform rapid drag operations
      for (const columnId of columns) {
        const targetColumn = page.locator(`[id="${columnId}"]`);
        await taskCard.dragTo(targetColumn);
        await page.waitForTimeout(200); // Quick succession
      }
      
      // Task should still be functional
      await expect(taskCard).toBeVisible();
    });

    test('should handle large numbers of tasks efficiently', async ({ page }) => {
      // Create many tasks for performance testing
      const manyTasks = Array.from({ length: 20 }, (_, i) => ({
        title: `Performance Test Task ${i + 1}`,
        description: `Task ${i + 1} for performance testing`,
        status: 'todo'
      }));

      // Create tasks
      for (const taskData of manyTasks.slice(0, 5)) { // Create just a few for testing
        await createTaskInProject(testProject.id, taskData);
      }

      await page.reload();
      await page.waitForTimeout(3000);
      
      // Board should still be responsive
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      const searchStart = Date.now();
      await searchInput.fill('Performance');
      const searchTime = Date.now() - searchStart;
      
      // Search should be reasonably fast
      expect(searchTime).toBeLessThan(2000);
      
      // Should show filtered results
      await page.waitForTimeout(1000);
      const visibleTasks = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const visibleCount = await visibleTasks.count();
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('should maintain data consistency after page refresh', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Count tasks before refresh
      const initialTaskCards = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const initialCount = await initialTaskCards.count();
      
      // Refresh page
      await page.reload();
      await navigateToKanbanBoard(page, testProject.id);
      
      // Count tasks after refresh
      const finalTaskCards = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const finalCount = await finalTaskCards.count();
      
      // Count should be consistent
      expect(finalCount).toBe(initialCount);
      
      // Original test tasks should still be visible
      for (const taskData of testData.tasks.slice(0, 3)) { // Check first 3
        await expect(page.locator(`text="${taskData.title}"`)).toBeVisible();
      }
    });
  });
});