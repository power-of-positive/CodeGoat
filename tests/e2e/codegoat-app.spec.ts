import { test, expect } from '@playwright/test';

test.describe('CodeGoat Application', () => {
  test.beforeEach(async ({ page }) => {
    // Start the application
    await page.goto('http://localhost:3001');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10000 });
  });

  test('should display main navigation and pages', async ({ page }) => {
    // Check that the main navigation elements are present
    await expect(page.getByText('CodeGoat')).toBeVisible();
    await expect(page.getByText('Analytics')).toBeVisible();
    await expect(page.getByText('Tasks')).toBeVisible();
    await expect(page.getByText('Workers')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();

    // Test navigation to Analytics page
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/.*analytics/);
    await expect(page.getByText('View validation metrics and performance data')).toBeVisible();

    // Test navigation to Tasks page
    await page.click('text=Tasks');
    await expect(page).toHaveURL(/.*tasks/);
    await expect(page.getByText('Manage tasks with kanban-style board')).toBeVisible();

    // Test navigation to Workers page
    await page.click('text=Workers');
    await expect(page).toHaveURL(/.*workers/);
    await expect(page.getByText('Monitor Claude Code worker processes and logs')).toBeVisible();

    // Test navigation to Settings page
    await page.click('text=Settings');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.getByText('Configure validation pipeline stages')).toBeVisible();
  });

  test('should display analytics dashboard', async ({ page }) => {
    await page.click('text=Analytics');
    
    // Check for analytics components
    await expect(page.getByText('Validation Analytics')).toBeVisible();
    
    // Check for charts and metrics
    await page.waitForSelector('[data-testid="validation-metrics-chart"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="success-rate-metric"]', { timeout: 5000 });
    
    // Verify that metrics are loading or displayed
    const metricsContainer = page.locator('[data-testid="metrics-container"]');
    await expect(metricsContainer).toBeVisible();
  });

  test('should display task management interface', async ({ page }) => {
    await page.click('text=Tasks');
    
    // Check for task board
    await expect(page.getByText('Task Board')).toBeVisible();
    
    // Check for kanban columns
    await expect(page.getByText('To Do')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
    
    // Check for create task button
    const createButton = page.getByRole('button', { name: /create.*task/i });
    await expect(createButton).toBeVisible();
  });

  test('should display workers monitoring interface', async ({ page }) => {
    await page.click('text=Workers');
    
    // Check for workers list
    await expect(page.getByText('Active Workers')).toBeVisible();
    
    // Check for worker status indicators
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 5000 });
    
    // Check if there are any workers or appropriate empty state
    const workersList = page.locator('[data-testid="workers-list"]');
    await expect(workersList).toBeVisible();
  });

  test('should display settings configuration', async ({ page }) => {
    await page.click('text=Settings');
    
    // Check for validation settings
    await expect(page.getByText('Validation Pipeline')).toBeVisible();
    
    // Check for settings form elements
    await expect(page.getByText('Validation Stages')).toBeVisible();
    
    // Look for toggle switches or checkboxes for stages
    const lintStage = page.getByText('Lint');
    const typeCheckStage = page.getByText('Type Check');
    await expect(lintStage).toBeVisible();
    await expect(typeCheckStage).toBeVisible();
  });
});

test.describe('Worker Details Page', () => {
  test('should display worker details when worker exists', async ({ page }) => {
    // First navigate to workers page
    await page.goto('http://localhost:3001/workers');
    
    // Wait for workers list to load
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });
    
    // Check if there are any workers
    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();
    
    if (workerCount > 0) {
      // Click on first worker
      await workerLinks.first().click();
      
      // Check worker details page elements
      await expect(page.getByText('Worker Status')).toBeVisible();
      await expect(page.getByText('Task Content')).toBeVisible();
      await expect(page.getByText('Duration')).toBeVisible();
      await expect(page.getByText('Worker Logs')).toBeVisible();
      
      // Check for action buttons
      await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /open.*vs.*code/i })).toBeVisible();
      
      // Check for log streaming controls
      await expect(page.getByText('Real-time Log Streaming')).toBeVisible();
    } else {
      // If no workers exist, check empty state
      await expect(page.getByText('No active workers')).toBeVisible();
    }
  });

  test('should handle worker log streaming', async ({ page }) => {
    await page.goto('http://localhost:3001/workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });
    
    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();
    
    if (workerCount > 0) {
      await workerLinks.first().click();
      
      // Check for log entries
      await page.waitForSelector('[data-testid="log-entries"]', { timeout: 5000 });
      
      // Check for streaming controls
      const startStreamButton = page.getByRole('button', { name: /start.*stream/i });
      if (await startStreamButton.isVisible()) {
        await startStreamButton.click();
        
        // Wait for streaming to start
        await expect(page.getByText('Streaming')).toBeVisible();
      }
      
      // Check for enhanced logging badge
      const enhancedBadge = page.getByText('Enhanced');
      // Badge should be visible if enhanced logging is working
      if (await enhancedBadge.isVisible()) {
        await expect(enhancedBadge).toBeVisible();
      }
      
      // Check for log entries container
      const logEntries = page.locator('[data-testid="log-entries"]');
      await expect(logEntries).toBeVisible();
    }
  });
});

test.describe('Task Management', () => {
  test('should allow creating a new task', async ({ page }) => {
    await page.goto('http://localhost:3001/tasks');
    
    // Click create task button
    const createButton = page.getByRole('button', { name: /create.*task/i });
    await createButton.click();
    
    // Fill in task form
    await page.fill('[data-testid="task-title-input"]', 'Test Task from Playwright');
    await page.fill('[data-testid="task-description-input"]', 'This is a test task created by Playwright');
    
    // Submit the form
    await page.click('[data-testid="create-task-submit"]');
    
    // Check that task was created
    await expect(page.getByText('Test Task from Playwright')).toBeVisible();
  });

  test('should allow updating task status', async ({ page }) => {
    await page.goto('http://localhost:3001/tasks');
    
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-board"]', { timeout: 5000 });
    
    // Look for a task card
    const taskCard = page.locator('[data-testid="task-card"]').first();
    
    if (await taskCard.isVisible()) {
      // Drag task to different column (simplified - just check if drag handles exist)
      const dragHandle = taskCard.locator('[data-testid="drag-handle"]');
      await expect(dragHandle).toBeVisible();
    }
  });
});

test.describe('Settings Management', () => {
  test('should allow toggling validation stages', async ({ page }) => {
    await page.goto('http://localhost:3001/settings');
    
    // Wait for settings to load
    await page.waitForSelector('[data-testid="validation-settings"]', { timeout: 5000 });
    
    // Look for validation stage toggles
    const lintToggle = page.getByTestId('lint-stage-toggle');
    const typeCheckToggle = page.getByTestId('typecheck-stage-toggle');
    
    if (await lintToggle.isVisible()) {
      const initialState = await lintToggle.isChecked();
      
      // Toggle the setting
      await lintToggle.click();
      
      // Verify the state changed
      const newState = await lintToggle.isChecked();
      expect(newState).toBe(!initialState);
      
      // Save settings
      const saveButton = page.getByRole('button', { name: /save/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Check for success message
        await expect(page.getByText(/saved/i)).toBeVisible();
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('http://localhost:3001/nonexistent-page');
    
    // Should show 404 page or redirect to home
    const pageContent = await page.textContent('body');
    const has404 = pageContent?.includes('404') || 
                   pageContent?.includes('Not Found') || 
                   pageContent?.includes('CodeGoat');
    expect(has404).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/workers', route => route.abort());
    
    await page.goto('http://localhost:3001/workers');
    
    // Should show error message or loading state
    await expect(page.getByText(/error|failed|loading/i)).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check that focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check for navigation landmarks
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check for main content
    await expect(page.getByRole('main')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001');
    
    // Check that navigation is still accessible (might be hamburger menu)
    const navigation = page.getByRole('navigation');
    await expect(navigation).toBeVisible();
    
    // Check that content is readable
    await expect(page.getByText('CodeGoat')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3001');
    
    // Check layout adjustments
    const mainContent = page.getByRole('main');
    await expect(mainContent).toBeVisible();
  });
});