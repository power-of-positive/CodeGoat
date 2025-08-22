import { test, expect } from '@playwright/test';

test.describe('Task Board Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should display task board layout', async ({ page }) => {
    // Given I am logged into CODEGOAT
    // And I have access to the Task Board
    // And there are existing tasks in different statuses
    
    // When I navigate to the Tasks page
    // Then I should see the task board with columns for different statuses
    await expect(page.locator('[data-testid="task-board"]')).toBeVisible();
    
    // And I should see "Pending", "In Progress", and "Completed" columns
    await expect(page.locator('[data-testid="pending-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="in-progress-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-column"]')).toBeVisible();
    
    // And I should see tasks distributed across the appropriate columns
    await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible();
    
    // And I should see an "Add Task" button
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible();
  });

  test('should create new task', async ({ page }) => {
    // Given I am on the Task Board page
    await expect(page.locator('[data-testid="task-board"]')).toBeVisible();
    
    // When I click the "Add Task" button
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Then I should see a task creation dialog
    const dialog = page.locator('[data-testid="task-creation-dialog"]');
    await expect(dialog).toBeVisible();
    
    // When I fill in the task content
    await page.locator('[data-testid="task-content-input"]').fill('Implement user authentication');
    
    // And I select priority "High"
    await page.locator('[data-testid="priority-select"]').selectOption('HIGH');
    
    // And I select task type "Story"
    await page.locator('[data-testid="task-type-select"]').selectOption('STORY');
    
    // And I click "Add Task"
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Then the task should be created in the Pending column
    await expect(page.locator('[data-testid="pending-column"]')).toContainText('Implement user authentication');
    
    // And the dialog should close
    await expect(dialog).not.toBeVisible();
    
    // And I should see the new task on the board
    await expect(page.locator('[data-testid="task-card"]').filter({ hasText: 'Implement user authentication' })).toBeVisible();
  });

  test('should move task between columns', async ({ page }) => {
    // Given I am on the Task Board page
    await expect(page.locator('[data-testid="task-board"]')).toBeVisible();
    
    // And there is a task in the "Pending" column
    const pendingColumn = page.locator('[data-testid="pending-column"]');
    const inProgressColumn = page.locator('[data-testid="in-progress-column"]');
    
    const taskCard = pendingColumn.locator('[data-testid="task-card"]').first();
    
    if (await taskCard.count() > 0) {
      const taskText = await taskCard.textContent();
      
      // When I drag the task to the "In Progress" column
      await taskCard.dragTo(inProgressColumn);
      
      // Then the task status should update to "In Progress"
      // And the task should appear in the "In Progress" column
      await expect(inProgressColumn).toContainText(taskText || '');
      
      // And the task should no longer be in the "Pending" column
      await expect(pendingColumn).not.toContainText(taskText || '');
    } else {
      // If no tasks exist, create one first
      await page.getByRole('button', { name: /add task/i }).click();
      await page.locator('[data-testid="task-content-input"]').fill('Test task for drag and drop');
      await page.locator('[data-testid="priority-select"]').selectOption('MEDIUM');
      await page.getByRole('button', { name: /add task/i }).click();
      
      // Now try the drag and drop
      const newTaskCard = pendingColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Test task for drag and drop' });
      await newTaskCard.dragTo(inProgressColumn);
      
      await expect(inProgressColumn).toContainText('Test task for drag and drop');
    }
  });
});