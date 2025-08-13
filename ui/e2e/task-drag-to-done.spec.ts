import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for task drag and drop functionality to move tasks to "Done" status
 * Tests the complete drag workflow and status updates
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Generate unique test data to avoid conflicts
function generateTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Drag Test Project ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-drag-${timestamp}-${randomId}`,
    taskTitle: `Draggable Test Task ${timestamp}-${randomId}`,
    taskDescription: `This task will be dragged to done status at ${new Date().toISOString()}`,
  };
}

// Helper function to create a test project
async function createTestProject() {
  const testData = generateTestData();
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
    const errorText = await response.text();
    throw new Error(`Failed to create test project: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return { project: result.data || result, testData };
}

// Helper function to create a test task via API
async function createTestTask(projectId: string, taskData: any) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: taskData.taskTitle,
      description: taskData.taskDescription,
      status: 'pending' // Start in pending status
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create test task: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.data || result;
}

// Helper function to navigate to project tasks page
async function navigateToProjectTasks(page: Page, projectId: string) {
  await page.goto(`${UI_BASE_URL}/projects/${projectId}/tasks`);
  
  // Wait for the page to load
  await page.waitForSelector('h1, h2', { timeout: 15000 });
  
  // Wait for kanban board to load
  await page.waitForFunction(() => {
    const loadingText = document.body.textContent;
    return !loadingText?.includes('Loading tasks...');
  }, { timeout: 10000 });
}

// Helper function to wait for a task card to be visible
async function waitForTaskCard(page: Page, taskTitle: string, timeout: number = 15000) {
  await page.waitForFunction(
    (title) => {
      const taskElements = document.querySelectorAll('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card');
      for (const element of taskElements) {
        if (element.textContent?.includes(title)) {
          return true;
        }
      }
      return false;
    },
    { timeout },
    taskTitle
  );
}

// Helper function to get task status by checking which column it's in
async function getTaskStatus(page: Page, taskTitle: string): Promise<string> {
  // Look for the task card and determine which column it's in
  const taskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
    .filter({ hasText: taskTitle });
  
  // Get the parent column
  const column = taskCard.locator('..').locator('..'); // Navigate up to find the column container
  
  // Check column headers or data attributes to determine status
  const columnText = await column.textContent();
  
  if (columnText?.toLowerCase().includes('pending') || columnText?.toLowerCase().includes('to do')) {
    return 'pending';
  } else if (columnText?.toLowerCase().includes('progress') || columnText?.toLowerCase().includes('doing')) {
    return 'in_progress';
  } else if (columnText?.toLowerCase().includes('done') || columnText?.toLowerCase().includes('completed')) {
    return 'completed';
  }
  
  return 'unknown';
}

// Helper function to find kanban column by status
async function findKanbanColumn(page: Page, status: string) {
  const statusMap = {
    'pending': /pending|to.do|todo|backlog/i,
    'in_progress': /progress|doing|in.progress|working/i,
    'completed': /done|completed|finished/i
  };
  
  const pattern = statusMap[status as keyof typeof statusMap] || new RegExp(status, 'i');
  
  // Look for column headers
  const columns = page.locator('[data-testid="kanban-column"], .kanban-column, .column');
  
  for (let i = 0; i < await columns.count(); i++) {
    const column = columns.nth(i);
    const columnText = await column.textContent();
    
    if (columnText && pattern.test(columnText)) {
      return column;
    }
  }
  
  // Fallback: look for any element with matching text
  return page.locator(`text=${pattern.source}`).first().locator('..').locator('..');
}

test.describe('Task Drag and Drop to Done E2E Tests', () => {
  
  test('should drag a task from pending to done column', async ({ page }) => {
    test.setTimeout(60000);
    
    // Step 1: Create a test project
    const { project, testData } = await createTestProject();
    console.log(`Created test project: ${project.id} - ${project.name}`);
    
    // Step 2: Create a test task via API
    const task = await createTestTask(project.id, testData);
    console.log(`Created test task: ${task.id} - ${task.title}`);
    
    // Step 3: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 4: Wait for the task to appear
    await waitForTaskCard(page, testData.taskTitle);
    console.log('Task card found on kanban board');
    
    // Step 5: Verify task is initially in pending column
    const initialStatus = await getTaskStatus(page, testData.taskTitle);
    console.log(`Initial task status: ${initialStatus}`);
    
    // Step 6: Find the task card and done column
    const taskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle });
    
    await expect(taskCard).toBeVisible();
    
    const doneColumn = await findKanbanColumn(page, 'completed');
    await expect(doneColumn).toBeVisible();
    
    // Step 7: Get the bounding boxes for drag and drop
    const taskBox = await taskCard.boundingBox();
    const doneBox = await doneColumn.boundingBox();
    
    if (!taskBox || !doneBox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }
    
    console.log('Starting drag operation...');
    
    // Step 8: Perform drag and drop
    await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
    await page.mouse.down();
    
    // Move slowly to the done column
    await page.mouse.move(doneBox.x + doneBox.width / 2, doneBox.y + doneBox.height / 2, { steps: 5 });
    await page.mouse.up();
    
    console.log('Drag operation completed');
    
    // Step 9: Wait for status update (the UI should update)
    await page.waitForTimeout(2000); // Give time for animations and API calls
    
    // Step 10: Verify the task is now in the done column
    await page.waitForFunction(
      (title) => {
        const taskElements = document.querySelectorAll('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card');
        for (const element of taskElements) {
          if (element.textContent?.includes(title)) {
            // Check if the task is in a done/completed column
            const column = element.closest('[data-testid="kanban-column"], .kanban-column, .column');
            const columnText = column?.textContent?.toLowerCase() || '';
            return columnText.includes('done') || columnText.includes('completed');
          }
        }
        return false;
      },
      { timeout: 15000 },
      testData.taskTitle
    );
    
    console.log('✓ Task successfully moved to done column');
    
    // Step 11: Verify the task card is still visible in the done column
    const updatedTaskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle });
    
    await expect(updatedTaskCard).toBeVisible();
    
    // Step 12: Verify final status
    const finalStatus = await getTaskStatus(page, testData.taskTitle);
    console.log(`Final task status: ${finalStatus}`);
    expect(['completed', 'done'].includes(finalStatus.toLowerCase())).toBeTruthy();
  });
  
  test('should handle drag and drop between different status columns', async ({ page }) => {
    test.setTimeout(60000);
    
    // Step 1: Create a test project and task
    const { project, testData } = await createTestProject();
    const task = await createTestTask(project.id, testData);
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    await waitForTaskCard(page, testData.taskTitle);
    
    // Step 3: First move from pending to in_progress
    const taskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle });
    
    const inProgressColumn = await findKanbanColumn(page, 'in_progress');
    
    // Drag to in_progress
    await taskCard.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);
    
    // Verify it's in in_progress
    await page.waitForFunction(
      (title) => {
        const taskElements = document.querySelectorAll('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card');
        for (const element of taskElements) {
          if (element.textContent?.includes(title)) {
            const column = element.closest('[data-testid="kanban-column"], .kanban-column, .column');
            const columnText = column?.textContent?.toLowerCase() || '';
            return columnText.includes('progress') || columnText.includes('doing');
          }
        }
        return false;
      },
      { timeout: 10000 },
      testData.taskTitle
    );
    
    console.log('✓ Task moved to in_progress column');
    
    // Step 4: Now move from in_progress to done
    const doneColumn = await findKanbanColumn(page, 'completed');
    await taskCard.dragTo(doneColumn);
    await page.waitForTimeout(1000);
    
    // Verify it's in done
    await page.waitForFunction(
      (title) => {
        const taskElements = document.querySelectorAll('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card');
        for (const element of taskElements) {
          if (element.textContent?.includes(title)) {
            const column = element.closest('[data-testid="kanban-column"], .kanban-column, .column');
            const columnText = column?.textContent?.toLowerCase() || '';
            return columnText.includes('done') || columnText.includes('completed');
          }
        }
        return false;
      },
      { timeout: 10000 },
      testData.taskTitle
    );
    
    console.log('✓ Task successfully moved through all columns to done');
  });
  
  test('should persist task status after page refresh', async ({ page }) => {
    test.setTimeout(60000);
    
    // Step 1: Create test data and move task to done
    const { project, testData } = await createTestProject();
    const task = await createTestTask(project.id, testData);
    
    await navigateToProjectTasks(page, project.id);
    await waitForTaskCard(page, testData.taskTitle);
    
    // Step 2: Drag task to done
    const taskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle });
    
    const doneColumn = await findKanbanColumn(page, 'completed');
    await taskCard.dragTo(doneColumn);
    await page.waitForTimeout(2000); // Wait for API update
    
    // Step 3: Refresh the page
    await page.reload();
    await waitForTaskCard(page, testData.taskTitle);
    
    // Step 4: Verify task is still in done column
    await page.waitForFunction(
      (title) => {
        const taskElements = document.querySelectorAll('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card');
        for (const element of taskElements) {
          if (element.textContent?.includes(title)) {
            const column = element.closest('[data-testid="kanban-column"], .kanban-column, .column');
            const columnText = column?.textContent?.toLowerCase() || '';
            return columnText.includes('done') || columnText.includes('completed');
          }
        }
        return false;
      },
      { timeout: 15000 },
      testData.taskTitle
    );
    
    console.log('✓ Task status persisted after page refresh');
  });

  test('should show visual feedback during drag operation', async ({ page }) => {
    test.setTimeout(60000);
    
    // Step 1: Create test data
    const { project, testData } = await createTestProject();
    const task = await createTestTask(project.id, testData);
    
    await navigateToProjectTasks(page, project.id);
    await waitForTaskCard(page, testData.taskTitle);
    
    // Step 2: Start drag operation and check for visual feedback
    const taskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle });
    
    // Get initial state
    const initialOpacity = await taskCard.evaluate(el => getComputedStyle(el).opacity);
    
    // Start drag
    await taskCard.hover();
    await page.mouse.down();
    
    // Check for visual changes (opacity, transform, etc.)
    await page.waitForTimeout(500);
    
    // The task should have some visual indication it's being dragged
    // This could be opacity change, transform, class addition, etc.
    const draggingOpacity = await taskCard.evaluate(el => getComputedStyle(el).opacity);
    const draggingTransform = await taskCard.evaluate(el => getComputedStyle(el).transform);
    
    // At least one visual property should change during drag
    const hasVisualFeedback = 
      draggingOpacity !== initialOpacity || 
      draggingTransform !== 'none' ||
      await taskCard.evaluate(el => el.classList.contains('dragging')) ||
      await taskCard.evaluate(el => el.classList.contains('drag-active'));
    
    expect(hasVisualFeedback).toBeTruthy();
    console.log('✓ Visual feedback detected during drag operation');
    
    // Complete the drag
    await page.mouse.up();
  });
});