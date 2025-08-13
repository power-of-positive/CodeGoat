import { test, expect, Page } from '@playwright/test';

/**
 * Debug test for task creation issue
 * This test will help us understand why tasks aren't appearing after creation
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Generate unique test data
function generateTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Debug Test Project ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/debug-test-${timestamp}-${randomId}`,
    taskTitle: `Debug Task ${timestamp}-${randomId}`,
    taskDescription: `Debug task created at ${new Date().toISOString()}`,
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
    throw new Error(`Failed to create test project: ${response.status}`);
  }
  
  const result = await response.json();
  return { project: result.data || result, testData };
}

test.describe('Task Creation Debug', () => {
  
  test('debug task creation flow with detailed logging', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Monitor network requests
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('/tasks')) {
        requests.push({
          method: request.method(),
          url: request.url(),
          postData: request.postData()
        });
        console.log('REQUEST:', request.method(), request.url());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/') || response.url().includes('/tasks')) {
        console.log('RESPONSE:', response.status(), response.url());
        if (response.status() >= 400) {
          try {
            const errorText = await response.text();
            console.log('ERROR RESPONSE BODY:', errorText);
          } catch (e) {
            console.log('Could not read error response body');
          }
        }
      }
    });
    
    // Step 1: Create a test project
    const { project, testData } = await createTestProject();
    console.log(`Created test project: ${project.id} - ${project.name}`);
    
    // Step 2: Navigate to the project tasks page
    await page.goto(`${UI_BASE_URL}/projects/${project.id}/tasks`);
    console.log(`Navigated to: ${UI_BASE_URL}/projects/${project.id}/tasks`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Step 3: Log the current page content
    const pageContent = await page.locator('body').textContent();
    console.log('Page content summary:', pageContent?.substring(0, 500));
    
    // Step 4: Look for existing tasks
    const existingTasks = await page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card').count();
    console.log(`Existing tasks on board: ${existingTasks}`);
    
    // Step 5: Find and click Add Task button
    await page.waitForTimeout(2000); // Give page time to fully load
    
    const addTaskButton = page.locator('button').filter({ 
      hasText: /Add Task|Create Task|New Task|\+/ 
    }).first();
    
    console.log('Looking for Add Task button...');
    await expect(addTaskButton).toBeVisible({ timeout: 10000 });
    console.log('✓ Found Add Task button');
    
    await addTaskButton.click();
    console.log('✓ Clicked Add Task button');
    
    // Step 6: Wait for dialog and log its content
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    const dialogContent = await page.locator('[role="dialog"]').textContent();
    console.log('Dialog content:', dialogContent);
    
    // Step 7: Fill the form
    const titleInput = page.locator('input[id="task-title"], input[name="title"], input[placeholder*="title"]').first();
    const descriptionInput = page.locator('textarea[id="task-description"], textarea[name="description"], textarea[placeholder*="description"]').first();
    
    await titleInput.fill(testData.taskTitle);
    console.log(`✓ Filled title: ${testData.taskTitle}`);
    
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill(testData.taskDescription);
      console.log(`✓ Filled description: ${testData.taskDescription}`);
    }
    
    // Step 8: Log form values before submission
    const titleValue = await titleInput.inputValue();
    let descriptionValue = '';
    if (await descriptionInput.isVisible()) {
      descriptionValue = await descriptionInput.inputValue();
    }
    console.log(`Form values - Title: "${titleValue}", Description: "${descriptionValue}"`);
    
    // Step 9: Submit the form
    const createButton = page.locator('button').filter({ 
      hasText: /Create Task|Create|Submit|Save/ 
    }).and(page.locator('[role="dialog"] button')).first();
    
    console.log('Found Create button, clicking...');
    await createButton.click();
    
    // Step 10: Wait a moment and check network requests
    await page.waitForTimeout(3000);
    console.log('Network requests made:', requests.length);
    requests.forEach((req, i) => {
      console.log(`Request ${i + 1}: ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`  Post data: ${req.postData}`);
      }
    });
    
    // Step 11: Check if dialog closed
    const dialogVisible = await page.locator('[role="dialog"]').isVisible();
    console.log(`Dialog still visible: ${dialogVisible}`);
    
    // Step 12: Check current page state
    await page.waitForTimeout(2000);
    const finalTaskCount = await page.locator('[data-testid="kanban-card"], [data-testid="task-card"], .task-card, .kanban-card').count();
    console.log(`Final task count: ${finalTaskCount} (was ${existingTasks})`);
    
    // Step 13: Look for our specific task
    const ourTaskVisible = await page.locator(`text="${testData.taskTitle}"`).count();
    console.log(`Our task visible: ${ourTaskVisible > 0}`);
    
    // Step 14: Log all text content to see what's on the page
    const finalPageContent = await page.locator('body').textContent();
    console.log('Final page content contains our task:', finalPageContent?.includes(testData.taskTitle));
    
    // Step 15: Take a screenshot for debugging
    await page.screenshot({ path: 'task-creation-debug.png' });
    console.log('Screenshot saved as task-creation-debug.png');
    
    // Step 16: Make direct API call to check if task was created
    const apiResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}/tasks`);
    if (apiResponse.ok) {
      const tasksData = await apiResponse.json();
      console.log('Tasks from API:', JSON.stringify(tasksData, null, 2));
    } else {
      console.log('Failed to fetch tasks from API:', apiResponse.status);
    }
  });
});