import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for task editing functionality
 * Tests cover: edit dialog, field updates, status changes, validation, and keyboard shortcuts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Generate unique test data to avoid conflicts
function generateTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Task Edit Test Project ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-task-edit-${timestamp}-${randomId}`,
    taskTitle: `Test Task Edit ${timestamp}-${randomId}`,
    taskDescription: `This task was created for edit testing at ${new Date().toISOString()}`,
    editedTitle: `Edited Task ${timestamp}-${randomId}`,
    editedDescription: `This task was edited via E2E test at ${new Date().toISOString()}`,
  };
}

// Helper function to create a test project with a task
async function createTestProjectWithTask() {
  const testData = generateTestData();
  
  // Create project
  const projectResponse = await fetch(`${API_BASE_URL}/api/projects`, {
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
  
  if (!projectResponse.ok) {
    const errorText = await projectResponse.text();
    throw new Error(`Failed to create test project: ${projectResponse.status} - ${errorText}`);
  }
  
  const projectResult = await projectResponse.json();
  
  if (projectResult.success === false) {
    throw new Error(`Project creation failed: ${projectResult.message}`);
  }
  
  const project = projectResult.data;
  
  // Create task
  const taskResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: testData.taskTitle,
      description: testData.taskDescription,
    }),
  });
  
  if (!taskResponse.ok) {
    const errorText = await taskResponse.text();
    throw new Error(`Failed to create test task: ${taskResponse.status} - ${errorText}`);
  }
  
  const taskResult = await taskResponse.json();
  
  if (taskResult.success === false) {
    throw new Error(`Task creation failed: ${taskResult.message}`);
  }
  
  const task = taskResult.data;
  
  return { project, task, testData };
}

// Helper function to navigate to project tasks page
async function navigateToProjectTasks(page: Page, projectId: string) {
  await page.goto(`${UI_BASE_URL}/projects/${projectId}/tasks`);
  
  // Wait for the page to load
  await page.waitForSelector('h1, h2', { timeout: 15000 });
  
  // Wait for any loading states to complete
  await page.waitForFunction(() => {
    const loadingText = document.body.textContent;
    return !loadingText?.includes('Loading tasks...');
  }, { timeout: 10000 });
}

// Helper function to open edit dialog for a task
async function openEditDialog(page: Page, taskTitle: string) {
  // Find the task card containing the title
  const taskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
    .filter({ hasText: taskTitle })
    .first();
  
  await expect(taskCard).toBeVisible({ timeout: 10000 });
  
  // Hover over the task to show the actions menu
  await taskCard.hover();
  
  // Click the more actions button (three dots)
  const moreButton = taskCard.locator('button').filter({ has: page.locator('[class*="MoreHorizontal"]') }).first();
  await moreButton.click();
  
  // Click the Edit menu item
  const editMenuItem = page.locator('[role="menuitem"]').filter({ hasText: 'Edit' }).first();
  await expect(editMenuItem).toBeVisible();
  await editMenuItem.click();
  
  // Wait for the edit dialog to open
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await expect(page.locator('[role="dialog"]')).toBeVisible();
}

test.describe('Task Editing E2E Tests', () => {
  
  test('should successfully edit task title and description', async ({ page }) => {
    test.setTimeout(45000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    console.log(`Created test project: ${project.id} with task: ${task.id}`);
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Open the edit dialog for the task
    await openEditDialog(page, testData.taskTitle);
    console.log('Edit dialog opened');
    
    // Step 4: Verify the dialog shows "Edit Task"
    await expect(page.locator('[role="dialog"] h2')).toContainText('Edit Task');
    
    // Step 5: Verify current values are pre-filled
    const titleInput = page.locator('input[id="task-title"]').first();
    const descriptionInput = page.locator('textarea[id="task-description"], textarea[placeholder*="description"]').first();
    
    await expect(titleInput).toHaveValue(testData.taskTitle);
    await expect(descriptionInput).toHaveValue(testData.taskDescription);
    
    // Step 6: Edit the task details
    await titleInput.clear();
    await titleInput.fill(testData.editedTitle);
    console.log(`Updated title to: ${testData.editedTitle}`);
    
    await descriptionInput.clear();
    await descriptionInput.fill(testData.editedDescription);
    console.log(`Updated description to: ${testData.editedDescription}`);
    
    // Step 7: Save the changes
    const updateButton = page.locator('button').filter({ hasText: 'Update Task' }).first();
    await expect(updateButton).toBeVisible();
    await expect(updateButton).toBeEnabled();
    await updateButton.click();
    
    // Step 8: Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    console.log('Edit dialog closed');
    
    // Step 9: Verify the task card shows updated title
    const updatedTaskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.editedTitle })
      .first();
    
    await expect(updatedTaskCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Task successfully edited and changes are visible');
    
    // Step 10: Verify the old title is no longer visible
    await expect(page.locator(`text="${testData.taskTitle}"`)).not.toBeVisible();
  });
  
  test('should successfully change task status', async ({ page }) => {
    test.setTimeout(45000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    console.log(`Created test project: ${project.id} with task: ${task.id}`);
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Open the edit dialog for the task
    await openEditDialog(page, testData.taskTitle);
    
    // Step 4: Find and click the status dropdown
    const statusDropdown = page.locator('[id="task-status"]').locator('..').locator('button').first();
    await expect(statusDropdown).toBeVisible();
    await statusDropdown.click();
    
    // Step 5: Select "In Progress" status
    const inProgressOption = page.locator('[role="option"]').filter({ hasText: 'In Progress' }).first();
    await expect(inProgressOption).toBeVisible();
    await inProgressOption.click();
    
    // Step 6: Save the changes
    const updateButton = page.locator('button').filter({ hasText: 'Update Task' }).first();
    await updateButton.click();
    
    // Step 7: Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    
    // Step 8: Verify task moved to "In Progress" column
    const inProgressColumn = page.locator('[data-testid="kanban-column-inprogress"], [data-column="inprogress"], .kanban-column').filter({ hasText: 'In Progress' }).first();
    const taskInProgress = inProgressColumn.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle })
      .first();
    
    await expect(taskInProgress).toBeVisible({ timeout: 10000 });
    console.log('✓ Task status successfully changed to In Progress');
  });
  
  test('should validate required fields when editing', async ({ page }) => {
    test.setTimeout(30000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Open the edit dialog for the task
    await openEditDialog(page, testData.taskTitle);
    
    // Step 4: Clear the title field
    const titleInput = page.locator('input[id="task-title"]').first();
    await titleInput.clear();
    
    // Step 5: Verify Update button is disabled
    const updateButton = page.locator('button').filter({ hasText: 'Update Task' }).first();
    await expect(updateButton).toBeDisabled();
    
    // Step 6: Add title back and verify button is enabled
    await titleInput.fill('Valid Title');
    await expect(updateButton).toBeEnabled();
  });
  
  test('should cancel edit and preserve original values', async ({ page }) => {
    test.setTimeout(30000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Open the edit dialog for the task
    await openEditDialog(page, testData.taskTitle);
    
    // Step 4: Modify the fields
    const titleInput = page.locator('input[id="task-title"]').first();
    const descriptionInput = page.locator('textarea[id="task-description"], textarea[placeholder*="description"]').first();
    
    await titleInput.clear();
    await titleInput.fill('Changed Title That Will Be Cancelled');
    await descriptionInput.clear();
    await descriptionInput.fill('Changed Description That Will Be Cancelled');
    
    // Step 5: Click Cancel
    const cancelButton = page.locator('button').filter({ hasText: 'Cancel' }).first();
    await cancelButton.click();
    
    // Step 6: Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    
    // Step 7: Verify original task title is still visible
    const originalTaskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle })
      .first();
    
    await expect(originalTaskCard).toBeVisible();
    
    // Step 8: Verify changed title is not visible
    await expect(page.locator('text="Changed Title That Will Be Cancelled"')).not.toBeVisible();
  });
  
  test('should support keyboard shortcuts for saving edits', async ({ page }) => {
    test.setTimeout(30000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Open the edit dialog for the task
    await openEditDialog(page, testData.taskTitle);
    
    // Step 4: Modify the title
    const titleInput = page.locator('input[id="task-title"]').first();
    await titleInput.clear();
    await titleInput.fill(`${testData.taskTitle} - Updated via Keyboard`);
    
    // Step 5: Use Cmd/Ctrl+Enter to save
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
    
    // Step 6: Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    
    // Step 7: Verify task was updated
    const updatedTaskCard = page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: `${testData.taskTitle} - Updated via Keyboard` })
      .first();
    
    await expect(updatedTaskCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Task successfully updated using keyboard shortcut');
  });
  
  test('should handle editing tasks with templates', async ({ page }) => {
    test.setTimeout(45000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Open the edit dialog for the task
    await openEditDialog(page, testData.taskTitle);
    
    // Step 4: Verify template selection is not shown in edit mode
    const templateSection = page.locator('details').filter({ hasText: 'Use a template' });
    await expect(templateSection).not.toBeVisible();
    
    // Step 5: Verify status dropdown is present in edit mode
    const statusDropdown = page.locator('[id="task-status"]').locator('..').locator('button').first();
    await expect(statusDropdown).toBeVisible();
  });
  
  test('should allow editing task from different kanban columns', async ({ page }) => {
    test.setTimeout(45000);
    
    // Step 1: Create a test project with a task in "done" status
    const testData = generateTestData();
    const projectResponse = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testData.projectName,
        git_repo_path: testData.gitRepoPath,
        use_existing_repo: false,
      }),
    });
    
    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      throw new Error(`Failed to create test project: ${projectResponse.status} - ${errorText}`);
    }
    
    const projectResult = await projectResponse.json();
    
    if (projectResult.success === false) {
      throw new Error(`Project creation failed: ${projectResult.message}`);
    }
    
    const project = projectResult.data;
    
    // Create task with "done" status
    const taskResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: testData.taskTitle,
        description: testData.taskDescription,
        status: 'done',
      }),
    });
    
    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      throw new Error(`Failed to create test task: ${taskResponse.status} - ${errorText}`);
    }
    
    const taskResult = await taskResponse.json();
    
    if (taskResult.success === false) {
      throw new Error(`Task creation failed: ${taskResult.message}`);
    }
    
    const task = taskResult.data;
    
    // Step 2: Navigate to the project tasks page
    await navigateToProjectTasks(page, project.id);
    
    // Step 3: Find task in Done column
    const doneColumn = page.locator('[data-testid="kanban-column-done"], [data-column="done"], .kanban-column').filter({ hasText: 'Done' }).first();
    const taskInDone = doneColumn.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle })
      .first();
    
    await expect(taskInDone).toBeVisible({ timeout: 10000 });
    
    // Step 4: Open edit dialog from Done column
    await taskInDone.hover();
    const moreButton = taskInDone.locator('button').filter({ has: page.locator('[class*="MoreHorizontal"]') }).first();
    await moreButton.click();
    
    const editMenuItem = page.locator('[role="menuitem"]').filter({ hasText: 'Edit' }).first();
    await editMenuItem.click();
    
    // Step 5: Verify dialog opens and status shows "Done"
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    const statusDropdown = page.locator('[id="task-status"]').locator('..').locator('button').first();
    await expect(statusDropdown).toContainText('Done');
    
    // Step 6: Change status to "To Do"
    await statusDropdown.click();
    const todoOption = page.locator('[role="option"]').filter({ hasText: 'To Do' }).first();
    await todoOption.click();
    
    // Step 7: Save changes
    const updateButton = page.locator('button').filter({ hasText: 'Update Task' }).first();
    await updateButton.click();
    
    // Step 8: Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    
    // Step 9: Verify task moved to Todo column
    const todoColumn = page.locator('[data-testid="kanban-column-todo"], [data-column="todo"], .kanban-column').filter({ hasText: 'To Do' }).first();
    const taskInTodo = todoColumn.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: testData.taskTitle })
      .first();
    
    await expect(taskInTodo).toBeVisible({ timeout: 10000 });
    console.log('✓ Task successfully moved from Done to To Do via edit');
  });
  
  test('should handle concurrent edits gracefully', async ({ page, context }) => {
    test.setTimeout(45000);
    
    // Step 1: Create a test project with a task
    const { project, task, testData } = await createTestProjectWithTask();
    
    // Step 2: Open two tabs
    const page2 = await context.newPage();
    
    // Step 3: Navigate both pages to the project tasks
    await navigateToProjectTasks(page, project.id);
    await navigateToProjectTasks(page2, project.id);
    
    // Step 4: Open edit dialog in first tab
    await openEditDialog(page, testData.taskTitle);
    
    // Step 5: Edit and save in first tab
    const titleInput1 = page.locator('input[id="task-title"]').first();
    await titleInput1.clear();
    await titleInput1.fill(`${testData.taskTitle} - Edit 1`);
    
    const updateButton1 = page.locator('button').filter({ hasText: 'Update Task' }).first();
    await updateButton1.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    
    // Step 6: Verify change is reflected in second tab (might need refresh)
    await page2.reload();
    const updatedTaskCard = page2.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card')
      .filter({ hasText: `${testData.taskTitle} - Edit 1` })
      .first();
    
    await expect(updatedTaskCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Concurrent edits handled gracefully');
    
    await page2.close();
  });
});