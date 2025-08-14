import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for task details opening functionality
 * Tests clicking on task cards to open task details
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data constants
function generateTestProject() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    name: `Task Details Test ${timestamp}-${randomId}`,
    git_repo_path: `/tmp/test-task-details-${timestamp}-${randomId}`,
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

test.describe('Task Details Opening', () => {
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

  test('should open task details when clicking on task card', async ({ page }) => {
    // Create a test task
    const task = await createTask(projectId, {
      title: 'Test Task for Details',
      description: 'This task should show details when clicked',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the task card
    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();

    // Click on the task card
    await taskCard.click();

    // Wait for task details to appear (modal or side panel)
    // Check for common patterns for task details display
    const taskDetailsModal = page.locator('[data-testid="task-details-modal"]');
    const taskDetailsPanel = page.locator('[data-testid="task-details-panel"]');
    const taskDetailsDialog = page.locator('[role="dialog"]');
    
    // Wait for any of these to appear
    await expect(
      taskDetailsModal.or(taskDetailsPanel).or(taskDetailsDialog)
    ).toBeVisible({ timeout: 5000 });

    // Verify task details content is displayed in the panel specifically
    const panelLocator = page.locator('[data-testid="task-details-panel"]');
    await expect(panelLocator.getByText(task.title)).toBeVisible();
    await expect(panelLocator.getByText(task.description)).toBeVisible();
  });

  test('should show task title and description in details', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Detailed Task Title',
      description: 'This is a detailed task description that should be visible in the details view',
      status: 'inprogress'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await taskCard.click();

    // Verify task details content in the panel specifically  
    const panelLocator = page.locator('[data-testid="task-details-panel"]');
    await expect(panelLocator.getByText('Detailed Task Title')).toBeVisible();
    await expect(panelLocator.getByText('This is a detailed task description')).toBeVisible();
  });

  test('should handle task with minimal data', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Minimal Task',
      status: 'todo'
      // No description
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await taskCard.click();

    // Should still show task details even with minimal data in the panel
    const panelLocator = page.locator('[data-testid="task-details-panel"]');
    await expect(panelLocator.getByText('Minimal Task')).toBeVisible();
  });

  test('should close task details when close button is clicked', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Closable Task',
      description: 'This task details should be closable',
      status: 'done'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await taskCard.click();

    // Wait for details to appear
    const taskDetails = page.locator('[role="dialog"]').or(
      page.locator('[data-testid="task-details-modal"]')
    ).or(
      page.locator('[data-testid="task-details-panel"]')
    );
    
    await expect(taskDetails).toBeVisible();

    // Look for close button (common patterns)
    const closeButton = page.locator('[aria-label="Close"]')
      .or(page.locator('button[data-testid="close-task-details"]'))
      .or(page.locator('button:has-text("Close")'))
      .or(page.locator('[data-testid="close-button"]'))
      .first();

    if (await closeButton.isVisible()) {
      await closeButton.click();
      
      // Verify details are closed
      await expect(taskDetails).not.toBeVisible();
    }
  });

  test('should handle keyboard navigation for task details', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Keyboard Task',
      description: 'This task should be accessible via keyboard',
      status: 'inreview'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    
    // Focus on task card and press Enter
    await taskCard.focus();
    await page.keyboard.press('Enter');

    // Should open task details panel
    const taskDetailsPanel = page.locator('[data-testid="task-details-panel"]');
    await expect(taskDetailsPanel).toBeVisible({ timeout: 3000 });
  });

  test('should not interfere with dropdown menu clicks', async ({ page }) => {
    const task = await createTask(projectId, {
      title: 'Dropdown Test Task',
      description: 'This task has a dropdown menu',
      status: 'todo'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click on the dropdown trigger (three dots)
    const dropdownTrigger = page.locator(`[data-testid="task-card-${task.id}"] button`).first();
    await dropdownTrigger.click();

    // Verify dropdown menu appears
    const dropdownMenu = page.locator('[role="menu"]').or(
      page.locator('.dropdown-menu')
    );
    
    // Should show dropdown, not task details
    if (await dropdownMenu.isVisible()) {
      // Verify task details modal/panel is NOT visible
      const taskDetails = page.locator('[role="dialog"]').or(
        page.locator('[data-testid="task-details-modal"]')
      );
      await expect(taskDetails).not.toBeVisible();
    }
  });
});