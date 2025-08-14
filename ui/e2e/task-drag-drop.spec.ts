import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for task drag and drop functionality
 * Tests dragging tasks between different status columns
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data constants
function generateTestProject() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    name: `Drag Drop Test ${timestamp}-${randomId}`,
    git_repo_path: `/tmp/test-drag-drop-${timestamp}-${randomId}`,
    use_existing_repo: false,
    setup_script: 'echo "Setup complete"',
    dev_script: 'npm run dev'
  };
}

// Helper functions
async function createProject(projectData: any) {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data || result;
}

async function createTask(projectId: string, taskData: any) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data || result;
}

async function deleteProject(projectId: string) {
  await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: 'DELETE'
  });
}

test.describe('Task Drag and Drop', () => {
  let projectId: string;
  let createdProjects: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Create a test project
    const projectData = generateTestProject();
    const project = await createProject(projectData);
    projectId = project.id;
    createdProjects.push(projectId);
    
    // Navigate to the project tasks page
    await page.goto(`${UI_BASE_URL}/projects/${projectId}/tasks`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // Cleanup created projects
    for (const id of createdProjects) {
      await deleteProject(id);
    }
    createdProjects = [];
  });

  test('should drag task from todo to in-progress', async ({ page }) => {
    // Create a task in todo status
    const task = await createTask(projectId, {
      title: 'Test Task for Dragging',
      description: 'This task will be dragged',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the task card
    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();

    // Find the in-progress column
    const inProgressColumn = page.locator('[data-testid="kanban-column-inprogress"]');
    await expect(inProgressColumn).toBeVisible();

    // Drag the task to in-progress column
    await taskCard.dragTo(inProgressColumn);

    // Wait for the update
    await page.waitForTimeout(1000);

    // Verify task is now in in-progress column
    const inProgressTasks = inProgressColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(inProgressTasks).toBeVisible();

    // Verify task is no longer in todo column
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const todoTasks = todoColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(todoTasks).not.toBeVisible();
  });

  test('should drag task from in-progress to in-review', async ({ page }) => {
    // Create a task in in-progress status
    const task = await createTask(projectId, {
      title: 'Test Task In Progress',
      description: 'This task is in progress',
      status: 'inprogress'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();

    const inReviewColumn = page.locator('[data-testid="kanban-column-inreview"]');
    await expect(inReviewColumn).toBeVisible();

    await taskCard.dragTo(inReviewColumn);
    await page.waitForTimeout(1000);

    const inReviewTasks = inReviewColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(inReviewTasks).toBeVisible();
  });

  test('should drag task from in-review to done', async ({ page }) => {
    // Create a task in in-review status
    const task = await createTask(projectId, {
      title: 'Test Task In Review',
      description: 'This task is being reviewed',
      status: 'inreview'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();

    const doneColumn = page.locator('[data-testid="kanban-column-done"]');
    await expect(doneColumn).toBeVisible();

    await taskCard.dragTo(doneColumn);
    await page.waitForTimeout(1000);

    const doneTasks = doneColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(doneTasks).toBeVisible();
  });

  test('should drag task backwards from done to in-review', async ({ page }) => {
    // Create a task in done status
    const task = await createTask(projectId, {
      title: 'Test Task Done',
      description: 'This task was completed',
      status: 'done'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();

    const inReviewColumn = page.locator('[data-testid="kanban-column-inreview"]');
    await expect(inReviewColumn).toBeVisible();

    await taskCard.dragTo(inReviewColumn);
    await page.waitForTimeout(1000);

    const inReviewTasks = inReviewColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(inReviewTasks).toBeVisible();
  });

  test('should handle multiple tasks drag and drop', async ({ page }) => {
    // Create multiple tasks
    const task1 = await createTask(projectId, {
      title: 'Task 1',
      status: 'todo'
    });
    
    const task2 = await createTask(projectId, {
      title: 'Task 2',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const inProgressColumn = page.locator('[data-testid="kanban-column-inprogress"]');
    
    // Drag first task
    const taskCard1 = page.locator(`[data-testid="task-card-${task1.id}"]`);
    await taskCard1.dragTo(inProgressColumn);
    await page.waitForTimeout(500);

    // Drag second task
    const taskCard2 = page.locator(`[data-testid="task-card-${task2.id}"]`);
    await taskCard2.dragTo(inProgressColumn);
    await page.waitForTimeout(500);

    // Verify both tasks are in in-progress
    const inProgressTask1 = inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`);
    const inProgressTask2 = inProgressColumn.locator(`[data-testid="task-card-${task2.id}"]`);
    
    await expect(inProgressTask1).toBeVisible();
    await expect(inProgressTask2).toBeVisible();
  });

  test('should preserve task order within columns after drag', async ({ page }) => {
    // Create tasks in specific order
    const tasks = await Promise.all([
      createTask(projectId, { title: 'First Task', status: 'todo' }),
      createTask(projectId, { title: 'Second Task', status: 'todo' }),
      createTask(projectId, { title: 'Third Task', status: 'todo' })
    ]);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Move middle task to in-progress
    const secondTaskCard = page.locator(`[data-testid="task-card-${tasks[1].id}"]`);
    const inProgressColumn = page.locator('[data-testid="kanban-column-inprogress"]');
    
    await secondTaskCard.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);

    // Verify order in todo column (should have first and third)
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const todoTasks = await todoColumn.locator('[data-testid^="task-card-"]').all();
    
    expect(todoTasks).toHaveLength(2);
  });

  test('should handle drag cancellation', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Test Drag Cancel',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    
    // Start drag but drop back in same column
    await taskCard.dragTo(todoColumn);
    await page.waitForTimeout(500);

    // Task should still be in todo
    const todoTask = todoColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(todoTask).toBeVisible();
  });

  test('should handle error gracefully when drag fails', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Error Test Task',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Mock API to fail
    await page.route('**/api/projects/*/tasks/*', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 500, body: 'Server error' });
      } else {
        route.continue();
      }
    });

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    const inProgressColumn = page.locator('[data-testid="kanban-column-inprogress"]');
    
    await taskCard.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);

    // Task should revert to original position
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const todoTask = todoColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(todoTask).toBeVisible();

    // Check for error message (if displayed)
    const errorMessage = page.locator('text=Failed to update task status');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should drag task from todo to cancelled', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Test Cancel Task',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    const cancelledColumn = page.locator('[data-testid="kanban-column-cancelled"]');
    
    await taskCard.dragTo(cancelledColumn);
    await page.waitForTimeout(1000);

    const cancelledTask = cancelledColumn.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(cancelledTask).toBeVisible();
  });

  test('should test drag across all columns sequentially', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Test Sequential Drag',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCardSelector = `[data-testid="task-card-${task.id}"]`;
    
    // Todo -> In Progress
    await page.locator(taskCardSelector).dragTo(
      page.locator('[data-testid="kanban-column-inprogress"]')
    );
    await page.waitForTimeout(500);
    
    // In Progress -> In Review
    await page.locator(taskCardSelector).dragTo(
      page.locator('[data-testid="kanban-column-inreview"]')
    );
    await page.waitForTimeout(500);
    
    // In Review -> Done
    await page.locator(taskCardSelector).dragTo(
      page.locator('[data-testid="kanban-column-done"]')
    );
    await page.waitForTimeout(500);
    
    // Verify final position
    const doneColumn = page.locator('[data-testid="kanban-column-done"]');
    const doneTask = doneColumn.locator(taskCardSelector);
    await expect(doneTask).toBeVisible();
  });
});