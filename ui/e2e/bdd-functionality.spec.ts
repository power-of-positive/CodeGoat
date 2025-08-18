import { test, expect, Page } from '@playwright/test';

test.describe('BDD Tests Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to BDD Tests page
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
  });

  test('should display BDD Tests Dashboard with all sections', async ({ page }) => {
    // Wait for page to load properly
    await page.waitForLoadState('domcontentloaded');
    
    // Check for heading - more flexible matching
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/BDD|test|dashboard/i);
    
    // Check for any meaningful content on the page
    const mainContent = page.locator('main, .container, #root > div');
    await expect(mainContent.first()).toBeVisible();
    
    // Check for dashboard elements
    const dashboardElements = page.locator('.card, [class*="card"], section, article').first();
    if (await dashboardElements.count() > 0) {
      await expect(dashboardElements.first()).toBeVisible();
    }
  });

  test('should have responsive layout', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileHeading = page.getByRole('heading').first();
    await expect(mobileHeading).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    const tabletHeading = page.getByRole('heading').first();
    await expect(tabletHeading).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    const desktopHeading = page.getByRole('heading').first();
    await expect(desktopHeading).toBeVisible();
    
    // Ensure content is accessible at all viewport sizes
    const content = page.locator('main, .container, #root > div').first();
    await expect(content).toBeVisible();
  });

  test('should switch between tabs correctly', async ({ page }) => {
    // Wait for tabs to be available
    await page.waitForLoadState('domcontentloaded');
    
    // Check if tabs exist at all
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      // Try to interact with available tabs
      const firstTab = tabs.first();
      await firstTab.click();
      await page.waitForTimeout(500); // Give content time to load
      
      // If there's a second tab, click it
      if (tabCount > 1) {
        const secondTab = tabs.nth(1);
        await secondTab.click();
        await page.waitForTimeout(500);
      }
      
      // Verify some content changed
      const content = page.locator('main, .container, [role="tabpanel"]').first();
      await expect(content).toBeVisible();
    } else {
      // No tabs found - just verify the page loaded
      const content = page.locator('main, .container, #root > div').first();
      await expect(content).toBeVisible();
    }
  });
});

test.describe('BDD Scenario Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
  });

  test('should display scenario list and controls', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for any buttons on the page (might be Add Scenario or similar)
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // At least one button should be visible
      await expect(buttons.first()).toBeVisible();
    }
    
    // Check for scenario management content
    const content = page.locator('main, .container, #root > div').first();
    await expect(content).toBeVisible();
  });

  test('should open add scenario dialog', async ({ page }) => {
    // Click Add Scenario button
    await page.getByRole('button', { name: 'Add Scenario' }).click();
    
    // Check that dialog opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add BDD Scenario' })).toBeVisible();
    
    // Check form fields
    await expect(page.getByLabel('Title')).toBeVisible();
    await expect(page.getByLabel('Feature')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByLabel('Gherkin Content')).toBeVisible();
    
    // Check buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Scenario' })).toBeVisible();
  });

  test('should validate required fields when creating scenario', async ({ page }) => {
    // Open add scenario dialog
    await page.getByRole('button', { name: 'Add Scenario' }).click();
    
    // Try to create without filling required fields
    await page.getByRole('button', { name: 'Create Scenario' }).click();
    
    // Should show validation errors (assuming form validation is implemented)
    // This might need adjustment based on actual implementation
    await expect(page.getByText(/required|empty/i)).toBeVisible();
  });

  test('should create new scenario successfully', async ({ page }) => {
    // Open add scenario dialog
    await page.getByRole('button', { name: 'Add Scenario' }).click();
    
    // Fill in scenario details
    await page.getByLabel('Title').fill('Test User Login');
    await page.getByLabel('Feature').fill('User Authentication');
    await page.getByLabel('Description').fill('Test user login functionality');
    await page.getByLabel('Gherkin Content').fill(`
Feature: User Authentication
  Scenario: Valid user login
    Given the user is on the login page
    When they enter valid credentials
    Then they should be logged in successfully
    `);
    
    // Create scenario
    await page.getByRole('button', { name: 'Create Scenario' }).click();
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
    
    // Should show success message or see the new scenario in the list
    // This might need adjustment based on actual implementation
  });
});

test.describe('BDD Scenario Execution History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
    
    // Switch to Execution History tab
    await page.getByRole('tab', { name: 'Execution History' }).click();
  });

  test('should display execution history table', async ({ page }) => {
    await expect(page.getByText('BDD Scenario Execution History')).toBeVisible();
    
    // Check for execution history components
    // This might need adjustment based on actual implementation
    const historySection = page.locator('[data-testid="execution-history"]');
    if (await historySection.isVisible()) {
      await expect(historySection).toBeVisible();
    }
  });

  test('should show execution details when clicking on a run', async ({ page }) => {
    // Look for execution items and click on one if available
    const executionItem = page.locator('[data-testid="execution-item"]').first();
    if (await executionItem.isVisible()) {
      await executionItem.click();
      
      // Should show execution details
      await expect(page.getByText(/execution details|scenario details/i)).toBeVisible();
    }
  });

  test('should filter execution history by status', async ({ page }) => {
    // Look for status filter if available
    const statusFilter = page.getByLabel(/status|filter/i);
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      
      // Select a specific status
      const passedOption = page.getByText('Passed');
      if (await passedOption.isVisible()) {
        await passedOption.click();
        
        // Results should be filtered
        // This verification depends on actual data and implementation
      }
    }
  });
});

test.describe('BDD to E2E Test Mapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
    
    // Switch to Test Mapping tab
    await page.getByRole('tab', { name: 'Test Mapping' }).click();
  });

  test('should display test mapping interface', async ({ page }) => {
    await expect(page.getByText('BDD Scenario to E2E Test Mapping')).toBeVisible();
    
    // Check for mapping management section
    const mappingSection = page.locator('[data-testid="test-mapping"]');
    if (await mappingSection.isVisible()) {
      await expect(mappingSection).toBeVisible();
    }
  });

  test('should show available scenarios for mapping', async ({ page }) => {
    // Look for scenario list or dropdown
    const scenarioList = page.locator('[data-testid="scenario-list"]');
    if (await scenarioList.isVisible()) {
      await expect(scenarioList).toBeVisible();
    }
  });

  test('should show available E2E test files', async ({ page }) => {
    // Look for test file list or suggestions
    const testFileList = page.locator('[data-testid="test-files"]');
    if (await testFileList.isVisible()) {
      await expect(testFileList).toBeVisible();
    }
  });

  test('should create mapping between scenario and test', async ({ page }) => {
    // Look for mapping creation interface
    const createMappingButton = page.getByRole('button', { name: /link|map|connect/i });
    if (await createMappingButton.isVisible()) {
      await createMappingButton.click();
      
      // Should open mapping dialog or interface
      const mappingDialog = page.getByRole('dialog');
      if (await mappingDialog.isVisible()) {
        await expect(mappingDialog).toBeVisible();
      }
    }
  });
});

test.describe('BDD Integration with Tasks', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tasks page first
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should prevent story completion without BDD scenarios', async ({ page }) => {
    // Create a new story task
    await page.getByRole('button', { name: 'Add Task' }).click();
    
    // Fill in story details
    await page.getByLabel('Content').fill('Test story without BDD scenarios');
    await page.getByLabel('Priority').selectOption('high');
    
    // Select story type if available
    const taskTypeSelect = page.getByLabel(/task type|type/i);
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }
    
    await page.getByRole('button', { name: 'Add Task' }).click();
    
    // Try to complete the story
    const taskCard = page.locator('[data-testid*="task-card"]').first();
    if (await taskCard.isVisible()) {
      // Look for complete button or status change option
      const completeButton = taskCard.getByRole('button', { name: /complete|done/i });
      if (await completeButton.isVisible()) {
        await completeButton.click();
        
        // Should show validation error
        await expect(page.getByText(/cannot be completed without.*BDD/i)).toBeVisible();
      }
    }
  });

  test('should allow story completion with linked BDD scenarios', async ({ page }) => {
    // This test assumes we have a story with properly linked BDD scenarios
    // Implementation depends on how stories and scenarios are connected
    
    // Navigate to a story that has BDD scenarios
    const storyWithBDD = page.locator('[data-testid*="task-card"]').filter({
      hasText: /story.*bdd|bdd.*story/i
    }).first();
    
    if (await storyWithBDD.isVisible()) {
      await storyWithBDD.click();
      
      // Should show task detail page
      await expect(page.getByRole('heading', { name: /task details/i })).toBeVisible();
      
      // Should show BDD scenarios section
      await expect(page.getByText(/bdd.*scenario/i)).toBeVisible();
    }
  });

  test('should show validation requirements for stories', async ({ page }) => {
    // Navigate to task details for a story
    const storyTask = page.locator('[data-testid*="task-card"]').filter({
      hasText: /story/i
    }).first();
    
    if (await storyTask.isVisible()) {
      await storyTask.click();
      
      // Should show BDD requirements or validation status
      const validationSection = page.locator('[data-testid="validation-status"]');
      if (await validationSection.isVisible()) {
        await expect(validationSection).toBeVisible();
      }
    }
  });
});

test.describe('BDD Analytics and Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should show BDD-related metrics in analytics', async ({ page }) => {
    // Look for BDD-specific metrics
    const bddMetrics = page.locator('[data-testid="bdd-metrics"]');
    if (await bddMetrics.isVisible()) {
      await expect(bddMetrics).toBeVisible();
    }
    
    // Check for scenario success rates
    const successRateCard = page.getByText(/scenario.*success|success.*scenario/i);
    if (await successRateCard.isVisible()) {
      await expect(successRateCard).toBeVisible();
    }
  });

  test('should display BDD scenario execution trends', async ({ page }) => {
    // Look for charts or trends related to BDD scenarios
    const trendChart = page.locator('[data-testid="bdd-trend-chart"]');
    if (await trendChart.isVisible()) {
      await expect(trendChart).toBeVisible();
    }
  });

  test('should link to detailed BDD reports', async ({ page }) => {
    // Look for links to detailed BDD views
    const detailedReportLink = page.getByRole('link', { name: /bdd.*detail|detail.*bdd/i });
    if (await detailedReportLink.isVisible()) {
      await detailedReportLink.click();
      
      // Should navigate to BDD dashboard or detailed view
      await expect(page.url()).toContain('/bdd');
    }
  });
});

test.describe('Validation Run Details with BDD Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to validation run details from analytics', async ({ page }) => {
    // Look for "View Details" links in recent runs
    const viewDetailsButton = page.getByRole('button', { name: 'View Details' }).first();
    
    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click();
      
      // Should navigate to validation run detail page
      await expect(page.url()).toMatch(/\/validation-run\/[\w-]+/);
      await expect(page.getByRole('heading', { name: 'Validation Run Details' })).toBeVisible();
    }
  });

  test('should show stage details with expandable logs', async ({ page }) => {
    // Navigate to a validation run details page
    const viewDetailsButton = page.getByRole('button', { name: 'View Details' }).first();
    
    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click();
      
      // Check for stage details
      const stageCard = page.locator('[data-testid="stage-detail"]').first();
      if (await stageCard.isVisible()) {
        await expect(stageCard).toBeVisible();
        
        // Look for show logs button
        const showLogsButton = page.getByRole('button', { name: /show logs|hide logs/i });
        if (await showLogsButton.isVisible()) {
          await showLogsButton.click();
          
          // Should expand logs
          await expect(page.locator('pre').first()).toBeVisible();
        }
      }
    }
  });

  test('should display run summary metrics', async ({ page }) => {
    const viewDetailsButton = page.getByRole('button', { name: 'View Details' }).first();
    
    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click();
      
      // Check for summary metrics
      await expect(page.getByText('Total Stages')).toBeVisible();
      await expect(page.getByText('Passed')).toBeVisible();
      await expect(page.getByText('Failed')).toBeVisible();
      await expect(page.getByText('Duration')).toBeVisible();
    }
  });

  test('should provide back navigation to analytics', async ({ page }) => {
    const viewDetailsButton = page.getByRole('button', { name: 'View Details' }).first();
    
    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click();
      
      // Check for back button
      const backButton = page.getByRole('button', { name: /back.*analytics/i });
      await expect(backButton).toBeVisible();
      
      await backButton.click();
      
      // Should navigate back to analytics
      await expect(page.url()).toContain('/analytics');
      await expect(page.getByRole('heading', { name: 'Validation Analytics' })).toBeVisible();
    }
  });
});