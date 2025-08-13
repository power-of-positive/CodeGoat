import { test, expect, Page } from '@playwright/test';

/**
 * Summary test for task creation functionality
 * Focuses on core functionality that is now working
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Generate unique test data to avoid conflicts
function generateTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Summary Test Project ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-summary-${timestamp}-${randomId}`,
    taskTitle: `Summary Task ${timestamp}-${randomId}`,
    taskDescription: `This task was created via summary E2E test at ${new Date().toISOString()}`,
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
  if (result.success === false) {
    throw new Error(`Project creation failed: ${result.message}`);
  }
  
  return { project: result.data || result, testData };
}

test.describe('Task Creation Summary Tests', () => {
  
  test('should successfully create a task and verify it exists in database', async ({ page }) => {
    // Step 1: Create a test project
    const { project, testData } = await createTestProject();
    
    // Step 2: Navigate to the project tasks page
    await page.goto(`${UI_BASE_URL}/projects/${project.id}/tasks`);
    
    // Step 3: Verify we're on the correct page
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/tasks`));
    
    // Step 4: Find and click Add Task button
    const addTaskButton = page.locator('button').filter({ 
      hasText: /Add Task|Create Task|New Task|\\+/ 
    }).first();
    
    await expect(addTaskButton).toBeVisible({ timeout: 10000 });
    await addTaskButton.click();
    
    // Step 5: Wait for the task creation dialog to open
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Step 6: Fill in the task details
    const titleInput = page.locator('input[id="task-title"], input[name="title"], input[placeholder*="title"]').first();
    const descriptionInput = page.locator('textarea[id="task-description"], textarea[name="description"], textarea[placeholder*="description"]').first();
    
    await expect(titleInput).toBeVisible();
    await titleInput.fill(testData.taskTitle);
    
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill(testData.taskDescription);
    }
    
    // Step 7: Submit the form
    const createButton = page.locator('button').filter({ 
      hasText: /Create Task|Create|Submit|Save/ 
    }).and(page.locator('[role="dialog"] button')).first();
    
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    
    await createButton.click();
    
    // Step 8: Wait for the dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    
    // Step 9: Wait for task title to appear anywhere on the page (confirming UI update)
    await page.waitForFunction(
      (title) => document.body.textContent?.includes(title) || false,
      { timeout: 15000 },
      testData.taskTitle
    );
    
    // Step 10: Verify the task appears on the page
    await expect(page.locator(`text="${testData.taskTitle}"`)).toBeVisible({ timeout: 5000 });
    
    // Step 11: Verify task exists in database via API
    const apiResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}/tasks`);
    expect(apiResponse.ok).toBe(true);
    
    const tasksData = await apiResponse.json();
    expect(tasksData.success).toBe(true);
    expect(tasksData.data).toBeDefined();
    expect(Array.isArray(tasksData.data)).toBe(true);
    expect(tasksData.data.length).toBeGreaterThan(0);
    
    const createdTask = tasksData.data.find(task => task.title === testData.taskTitle);
    expect(createdTask).toBeDefined();
    expect(createdTask.project_id).toBe(project.id);
    expect(createdTask.status).toBe('todo');
  });
  
  test('task creation form validation works correctly', async ({ page }) => {
    // Step 1: Create a test project
    const { project } = await createTestProject();
    
    // Step 2: Navigate to the project tasks page
    await page.goto(`${UI_BASE_URL}/projects/${project.id}/tasks`);
    
    // Step 3: Open task creation dialog
    const addTaskButton = page.locator('button').filter({ 
      hasText: /Add Task|Create Task|New Task|\\+/ 
    }).first();
    await addTaskButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Step 4: Try to submit with empty title
    const createButton = page.locator('button').filter({ 
      hasText: /Create Task|Create|Submit|Save/ 
    }).and(page.locator('[role="dialog"] button')).first();
    
    // The button should be disabled when title is empty
    await expect(createButton).toBeDisabled();
    
    // Step 5: Fill in title and verify button becomes enabled
    const titleInput = page.locator('input[id="task-title"], input[name="title"], input[placeholder*="title"]').first();
    await titleInput.fill('Valid Task Title');
    
    await expect(createButton).toBeEnabled();
  });
  
  test('task creation dialog can be cancelled', async ({ page }) => {
    // Step 1: Create a test project
    const { project } = await createTestProject();
    
    // Step 2: Navigate to the project tasks page
    await page.goto(`${UI_BASE_URL}/projects/${project.id}/tasks`);
    
    // Step 3: Open task creation dialog
    const addTaskButton = page.locator('button').filter({ 
      hasText: /Add Task|Create Task|New Task|\\+/ 
    }).first();
    await addTaskButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Step 4: Fill in some data
    const titleInput = page.locator('input[id="task-title"], input[name="title"], input[placeholder*="title"]').first();
    await titleInput.fill('Task That Will Be Cancelled');
    
    // Step 5: Click cancel
    const cancelButton = page.locator('button').filter({ hasText: /Cancel/ }).first();
    await cancelButton.click();
    
    // Step 6: Verify dialog closes
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    
    // Step 7: Verify task was not created
    await expect(page.locator('text="Task That Will Be Cancelled"')).not.toBeVisible();
  });
});