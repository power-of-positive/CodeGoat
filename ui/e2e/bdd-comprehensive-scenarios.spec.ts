import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment } from './helpers/test-setup';

test.describe('BDD Comprehensive Scenarios E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestEnvironment(page);
  });

  test.describe('BDD Scenarios Management', () => {
    test('should display BDD scenarios dashboard', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'BDD Test Scenarios' })).toBeVisible();
      
      // Should show statistics cards
      await expect(page.getByText('Total Scenarios')).toBeVisible();
      await expect(page.getByText('Passed')).toBeVisible();
      await expect(page.getByText('Failed')).toBeVisible();
      await expect(page.getByText('Pending')).toBeVisible();
    });

    test('should create comprehensive BDD scenarios', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Click create comprehensive scenarios button
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      
      // Should show success message
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Should update scenario count
      await expect(page.getByTestId('total-scenarios-count')).not.toHaveText('0');
    });

    test('should display scenario list', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Ensure scenarios are loaded
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Should show scenario list
      await expect(page.getByTestId('scenarios-list')).toBeVisible();
      
      // Should show individual scenarios
      await expect(page.getByText('User creates a new task')).toBeVisible();
      await expect(page.getByText('User edits an existing task')).toBeVisible();
      await expect(page.getByText('User views validation analytics dashboard')).toBeVisible();
    });

    test('should execute individual BDD scenario', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create scenarios first
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Find and execute a scenario
      const firstScenario = page.locator('[data-testid="scenario-card"]').first();
      await expect(firstScenario).toBeVisible();
      
      await firstScenario.getByRole('button', { name: 'Execute' }).click();
      
      // Should show execution progress
      await expect(page.getByText('Executing scenario...')).toBeVisible();
      
      // Should show execution result
      await expect(page.locator('.execution-result')).toBeVisible();
    });

    test('should execute all BDD scenarios', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create scenarios first
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Execute all scenarios
      await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
      
      // Should show progress indicator
      await expect(page.getByText('Executing all scenarios...')).toBeVisible();
      
      // Should show completion message
      await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
      
      // Statistics should update
      const passedCount = await page.getByTestId('passed-scenarios-count').textContent();
      const failedCount = await page.getByTestId('failed-scenarios-count').textContent();
      
      expect(parseInt(passedCount || '0') + parseInt(failedCount || '0')).toBeGreaterThan(0);
    });

    test('should display scenario execution history', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create and execute scenarios first
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Execute a scenario to create history
      const firstScenario = page.locator('[data-testid="scenario-card"]').first();
      await firstScenario.getByRole('button', { name: 'Execute' }).click();
      
      // Wait for execution to complete
      await expect(page.locator('.execution-result')).toBeVisible();
      
      // Click on scenario to view details
      await firstScenario.getByTestId('scenario-title').click();
      
      // Should show execution history
      await expect(page.getByRole('heading', { name: 'Execution History' })).toBeVisible();
      await expect(page.getByTestId('execution-history-list')).toBeVisible();
      
      // Should show execution entries
      await expect(page.locator('[data-testid="execution-entry"]')).toHaveCountGreaterThan(0);
    });

    test('should filter scenarios by status', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create scenarios first
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Execute some scenarios to have mixed statuses
      await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
      await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
      
      // Filter by status
      await page.getByTestId('status-filter').selectOption('passed');
      
      // Should only show passed scenarios
      const visibleScenarios = page.locator('[data-testid="scenario-card"]');
      await expect(visibleScenarios).toHaveCountGreaterThan(0);
      
      // All visible scenarios should have passed status
      const statusBadges = visibleScenarios.locator('[data-testid="scenario-status"]');
      const count = await statusBadges.count();
      for (let i = 0; i < count; i++) {
        await expect(statusBadges.nth(i)).toHaveText('passed');
      }
    });

    test('should search scenarios by title', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create scenarios first
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Search for specific scenarios
      await page.getByTestId('search-scenarios').fill('task');
      
      // Should filter scenarios containing "task"
      const visibleScenarios = page.locator('[data-testid="scenario-card"]');
      await expect(visibleScenarios).toHaveCountGreaterThan(0);
      
      // All visible scenarios should contain "task" in title
      const count = await visibleScenarios.count();
      for (let i = 0; i < count; i++) {
        const title = await visibleScenarios.nth(i).getByTestId('scenario-title').textContent();
        expect(title?.toLowerCase()).toContain('task');
      }
    });

    test('should display scenario details modal', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create scenarios first
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Click on a scenario to view details
      const firstScenario = page.locator('[data-testid="scenario-card"]').first();
      await firstScenario.getByRole('button', { name: 'View Details' }).click();
      
      // Should open modal with scenario details
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Scenario Details' })).toBeVisible();
      
      // Should show scenario information
      await expect(page.getByText('Title:')).toBeVisible();
      await expect(page.getByText('Feature:')).toBeVisible();
      await expect(page.getByText('Status:')).toBeVisible();
      await expect(page.getByText('Gherkin Content:')).toBeVisible();
      
      // Should show Gherkin content
      await expect(page.locator('[data-testid="gherkin-content"]')).toBeVisible();
      
      // Close modal
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('BDD Integration with Task Management', () => {
    test('should link BDD scenarios to tasks', async ({ page }) => {
      // Navigate to tasks page first
      await page.goto('/tasks');
      
      // Create a task
      await page.getByRole('button', { name: 'Add Task' }).click();
      await page.getByPlaceholder('Describe the task...').fill('Implement user authentication');
      await page.getByRole('button', { name: 'Create' }).click();
      
      // Navigate to BDD tests
      await page.goto('/bdd-tests');
      
      // Create comprehensive scenarios
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Link a scenario to the task
      const authScenario = page.locator('[data-testid="scenario-card"]')
        .filter({ hasText: 'authentication' }).first();
      
      if (await authScenario.count() > 0) {
        await authScenario.getByRole('button', { name: 'Link to Task' }).click();
        
        // Should show task selection dialog
        await expect(page.getByRole('dialog', { name: 'Link to Task' })).toBeVisible();
        
        // Select the task
        await page.getByTestId('task-select').selectOption(/Implement user authentication/);
        await page.getByRole('button', { name: 'Link' }).click();
        
        // Should show success message
        await expect(page.getByText('Scenario linked to task successfully')).toBeVisible();
      }
    });

    test('should show BDD scenarios in task details', async ({ page }) => {
      // Go to tasks and select a task
      await page.goto('/tasks');
      
      // Create a task if none exist
      if (await page.locator('[data-testid="task-card"]').count() === 0) {
        await page.getByRole('button', { name: 'Add Task' }).click();
        await page.getByPlaceholder('Describe the task...').fill('Test task with BDD scenarios');
        await page.getByRole('button', { name: 'Create' }).click();
      }
      
      // Click on a task
      await page.locator('[data-testid="task-card"]').first().click();
      
      // Should navigate to task details
      await expect(page.getByRole('heading', { name: 'Task Details' })).toBeVisible();
      
      // Should show BDD scenarios section
      await expect(page.getByRole('heading', { name: 'BDD Scenarios' })).toBeVisible();
      
      // Should show associated scenarios (if any)
      const scenariosList = page.getByTestId('task-bdd-scenarios');
      await expect(scenariosList).toBeVisible();
    });
  });

  test.describe('BDD Scenario Execution Results', () => {
    test('should display execution results with proper status indicators', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create and execute scenarios
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
      await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
      
      // Check that scenarios show proper status indicators
      const passedScenarios = page.locator('[data-testid="scenario-status"][data-status="passed"]');
      const failedScenarios = page.locator('[data-testid="scenario-status"][data-status="failed"]');
      
      // Should have both passed and failed scenarios (due to mock random execution)
      expect(await passedScenarios.count() + await failedScenarios.count()).toBeGreaterThan(0);
      
      // Status indicators should be visible
      if (await passedScenarios.count() > 0) {
        await expect(passedScenarios.first()).toHaveClass(/passed/);
      }
      
      if (await failedScenarios.count() > 0) {
        await expect(failedScenarios.first()).toHaveClass(/failed/);
      }
    });

    test('should show execution duration for completed scenarios', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create and execute scenarios
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Execute a single scenario to check duration
      const firstScenario = page.locator('[data-testid="scenario-card"]').first();
      await firstScenario.getByRole('button', { name: 'Execute' }).click();
      
      // Wait for execution to complete
      await expect(page.locator('.execution-result')).toBeVisible();
      
      // Should show execution duration
      await expect(page.getByTestId('execution-duration')).toBeVisible();
      
      // Duration should be a reasonable value (in ms)
      const durationText = await page.getByTestId('execution-duration').textContent();
      const duration = parseInt(durationText?.replace(/\D/g, '') || '0');
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds for mock execution
    });

    test('should display error messages for failed scenarios', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create and execute scenarios
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
      await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
      
      // Find failed scenarios
      const failedScenarios = page.locator('[data-testid="scenario-card"]')
        .filter({ has: page.locator('[data-testid="scenario-status"][data-status="failed"]') });
      
      if (await failedScenarios.count() > 0) {
        const firstFailedScenario = failedScenarios.first();
        
        // Should show error indicator
        await expect(firstFailedScenario.getByTestId('error-indicator')).toBeVisible();
        
        // Click to view details
        await firstFailedScenario.getByRole('button', { name: 'View Details' }).click();
        
        // Should show error message in details modal
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Error Message:')).toBeVisible();
        await expect(page.getByTestId('error-message')).toBeVisible();
      }
    });
  });

  test.describe('BDD Statistics and Reporting', () => {
    test('should update statistics after scenario execution', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Record initial stats
      const initialTotalText = await page.getByTestId('total-scenarios-count').textContent();
      const initialTotal = parseInt(initialTotalText || '0');
      
      // Create scenarios
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Check that total count increased
      const newTotalText = await page.getByTestId('total-scenarios-count').textContent();
      const newTotal = parseInt(newTotalText || '0');
      expect(newTotal).toBeGreaterThan(initialTotal);
      
      // Execute scenarios
      await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
      await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
      
      // Check that passed/failed counts are updated
      const passedText = await page.getByTestId('passed-scenarios-count').textContent();
      const failedText = await page.getByTestId('failed-scenarios-count').textContent();
      
      const passed = parseInt(passedText || '0');
      const failed = parseInt(failedText || '0');
      
      expect(passed + failed).toBe(newTotal);
      expect(passed).toBeGreaterThan(0); // Should have some passed scenarios
    });

    test('should calculate and display pass rate', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create and execute scenarios
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
      await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
      
      // Should display pass rate
      await expect(page.getByTestId('pass-rate')).toBeVisible();
      
      // Pass rate should be a percentage
      const passRateText = await page.getByTestId('pass-rate').textContent();
      const passRate = parseInt(passRateText?.replace('%', '') || '0');
      
      expect(passRate).toBeGreaterThanOrEqual(0);
      expect(passRate).toBeLessThanOrEqual(100);
    });

    test('should show execution trends over time', async ({ page }) => {
      await page.goto('/bdd-tests');
      
      // Create scenarios and execute multiple times to create history
      await page.getByRole('button', { name: 'Create Comprehensive Scenarios' }).click();
      await expect(page.getByText(/Created \d+ comprehensive BDD scenarios/)).toBeVisible();
      
      // Execute scenarios multiple times
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Execute All Scenarios' }).click();
        await expect(page.getByText(/Executed \d+ scenarios/)).toBeVisible();
        
        // Wait a bit between executions
        await page.waitForTimeout(1000);
      }
      
      // Navigate to trends view
      await page.getByRole('tab', { name: 'Trends' }).click();
      
      // Should show execution trends chart
      await expect(page.getByTestId('execution-trends-chart')).toBeVisible();
      
      // Should show trend statistics
      await expect(page.getByText('Total Executions:')).toBeVisible();
      await expect(page.getByText('Average Pass Rate:')).toBeVisible();
    });
  });
});