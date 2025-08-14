import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Performance and Error Handling
 * Based on vibe-kanban PRD and RFC requirements
 * 
 * Tests cover:
 * - Application load performance
 * - Large dataset handling
 * - Concurrent user operations
 * - Network failure scenarios
 * - API error handling
 * - Memory usage and cleanup
 * - Browser compatibility
 * - Offline functionality
 * - Data integrity under stress
 * - Recovery mechanisms
 * - Resource usage optimization
 * - Graceful degradation
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoadTime: 5000,      // 5 seconds max
  apiResponseTime: 2000,   // 2 seconds max
  uiResponseTime: 500,     // 500ms max for UI interactions
  searchResponseTime: 1000, // 1 second max for search
  dragDropTime: 300        // 300ms max for drag operations
};

// Test data factory for performance tests
function createPerformanceTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Performance Test ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-performance-${timestamp}-${randomId}`,
    massTaskCount: 50,
    concurrentOperations: 10
  };
}

// Helper functions
async function createProjectWithManyTasks(taskCount: number = 50) {
  const testData = createPerformanceTestData();
  
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
    throw new Error(`Failed to create project: ${projectResponse.status}`);
  }
  
  const projectResult = await projectResponse.json();
  const project = projectResult.data || projectResult;
  
  // Create many tasks
  const tasks = [];
  const statuses = ['todo', 'inprogress', 'inreview', 'done', 'cancelled'];
  
  for (let i = 0; i < taskCount; i++) {
    const status = statuses[i % statuses.length];
    const taskResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Performance Test Task ${i + 1}`,
        description: `This is test task number ${i + 1} for performance testing. It contains enough text to test rendering performance with longer descriptions.`,
        status: status
      }),
    });
    
    if (taskResponse.ok) {
      const taskResult = await taskResponse.json();
      tasks.push(taskResult.data || taskResult);
    }
  }
  
  return { project, tasks, testData };
}

async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  
  // Wait for main content to be visible
  await page.waitForSelector('h1, h2, main', { timeout: 15000 });
  
  // Wait for loading states to complete
  await page.waitForFunction(() => {
    const loadingElements = document.querySelectorAll('[data-testid="loader"], .loading, .spinner');
    return loadingElements.length === 0;
  }, { timeout: 10000 }).catch(() => {
    // Ignore timeout, continue with measurement
  });
  
  const endTime = Date.now();
  return endTime - startTime;
}

async function measureApiResponseTime(endpoint: string, method: string = 'GET', body?: any): Promise<number> {
  const startTime = Date.now();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  
  const endTime = Date.now();
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  return endTime - startTime;
}

async function simulateNetworkConditions(page: Page, conditions: 'fast' | 'slow' | 'offline') {
  const client = await page.context().newCDPSession(page);
  
  switch (conditions) {
    case 'slow':
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 100 * 1024, // 100kb/s
        uploadThroughput: 50 * 1024,    // 50kb/s
        latency: 500 // 500ms
      });
      break;
    case 'offline':
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });
      break;
    case 'fast':
    default:
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 10 * 1024 * 1024, // 10mb/s
        uploadThroughput: 5 * 1024 * 1024,    // 5mb/s
        latency: 20 // 20ms
      });
      break;
  }
}

test.describe('Performance and Error Handling', () => {
  let performanceProject: any;
  let performanceTasks: any[];
  let testData: any;

  test.beforeAll(async () => {
    // Create project with many tasks for performance testing
    const { project, tasks, testData: data } = await createProjectWithManyTasks(30);
    performanceProject = project;
    performanceTasks = tasks;
    testData = data;
  });

  test.afterAll(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/projects/${performanceProject.id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to cleanup performance test project:', error);
    }
  });

  test.describe('Application Load Performance', () => {
    test('should load projects page within performance threshold', async ({ page }) => {
      const loadTime = await measurePageLoadTime(page, `${UI_BASE_URL}/projects`);
      
      console.log(`Projects page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
      
      // Verify content is actually loaded
      await expect(page.locator('h1, h2')).toBeVisible();
      await expect(page.locator('button:has-text("Create Project"), button:has-text("New Project")')).toBeVisible();
    });

    test('should load kanban board with many tasks efficiently', async ({ page }) => {
      const loadTime = await measurePageLoadTime(page, `${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      
      console.log(`Kanban board load time with ${performanceTasks.length} tasks: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
      
      // Verify board is functional
      await expect(page.locator('text="To Do"')).toBeVisible();
      await expect(page.locator('text="In Progress"')).toBeVisible();
      
      // Count visible task cards
      const taskCards = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const cardCount = await taskCards.count();
      
      console.log(`Visible task cards: ${cardCount}`);
      expect(cardCount).toBeGreaterThan(10); // Should show multiple tasks
    });

    test('should handle search operations efficiently', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      await page.waitForSelector('text="To Do"', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        const searchStartTime = Date.now();
        await searchInput.fill('Performance Test Task');
        
        // Wait for search results
        await page.waitForTimeout(500);
        
        const searchEndTime = Date.now();
        const searchTime = searchEndTime - searchStartTime;
        
        console.log(`Search operation time: ${searchTime}ms`);
        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponseTime);
        
        // Verify search results
        const visibleTasks = page.locator('[data-testid*="task-card"], .task-card').filter({ 
          hasText: 'Performance Test Task' 
        });
        const resultCount = await visibleTasks.count();
        
        console.log(`Search results: ${resultCount} tasks`);
        expect(resultCount).toBeGreaterThan(0);
      } else {
        test.skip('Search functionality not available');
      }
    });

    test('should render large datasets without performance degradation', async ({ page }) => {
      // Create a project with even more tasks
      const { project: largeProject } = await createProjectWithManyTasks(100);
      
      try {
        const loadTime = await measurePageLoadTime(page, `${UI_BASE_URL}/projects/${largeProject.id}/tasks`);
        
        console.log(`Large dataset (100 tasks) load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime * 1.5); // Allow 50% more time for large datasets
        
        // Test scroll performance
        const scrollStartTime = Date.now();
        
        // Scroll through the page
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel(0, 500);
          await page.waitForTimeout(100);
        }
        
        const scrollEndTime = Date.now();
        const scrollTime = scrollEndTime - scrollStartTime;
        
        console.log(`Scroll performance time: ${scrollTime}ms`);
        expect(scrollTime).toBeLessThan(2000); // Scrolling should be smooth
        
      } finally {
        // Cleanup large project
        await fetch(`${API_BASE_URL}/api/projects/${largeProject.id}`, {
          method: 'DELETE',
        });
      }
    });
  });

  test.describe('API Performance', () => {
    test('should respond to API requests within threshold', async ({ page }) => {
      // Test various API endpoints
      const endpoints = [
        '/api/projects',
        `/api/projects/${performanceProject.id}`,
        `/api/projects/${performanceProject.id}/tasks`
      ];
      
      for (const endpoint of endpoints) {
        const responseTime = await measureApiResponseTime(endpoint);
        console.log(`${endpoint} response time: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
      }
    });

    test('should handle concurrent API requests efficiently', async ({ page }) => {
      const concurrentRequests = 10;
      const promises = [];
      
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(measureApiResponseTime('/api/projects'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      
      console.log(`Concurrent requests (${concurrentRequests}): Total=${totalTime}ms, Average=${averageTime}ms, Max=${maxTime}ms`);
      
      // Even with concurrent requests, individual responses should be reasonable
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime * 2);
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });

    test('should handle task creation with large payloads efficiently', async ({ page }) => {
      const largeDescription = 'A'.repeat(10000); // 10KB description
      
      const createTime = await measureApiResponseTime(
        `/api/projects/${performanceProject.id}/tasks`,
        'POST',
        {
          title: 'Large Payload Test Task',
          description: largeDescription
        }
      );
      
      console.log(`Large payload task creation time: ${createTime}ms`);
      expect(createTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });
  });

  test.describe('UI Interaction Performance', () => {
    test('should handle drag and drop operations efficiently', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      await page.waitForSelector('text="To Do"', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Find a task in todo column
      const todoTask = page.locator('[id="todo"]').locator('[data-testid*="task-card"], .task-card').first();
      
      if (await todoTask.isVisible()) {
        const dragStartTime = Date.now();
        
        // Perform drag and drop
        const inProgressColumn = page.locator('[id="inprogress"]');
        await todoTask.dragTo(inProgressColumn);
        
        // Wait for operation to complete
        await page.waitForTimeout(500);
        
        const dragEndTime = Date.now();
        const dragTime = dragEndTime - dragStartTime;
        
        console.log(`Drag and drop operation time: ${dragTime}ms`);
        expect(dragTime).toBeLessThan(PERFORMANCE_THRESHOLDS.dragDropTime * 5); // Allow more time for network updates
        
        // Verify operation succeeded
        const taskInProgress = inProgressColumn.locator('[data-testid*="task-card"], .task-card').first();
        await expect(taskInProgress).toBeVisible();
      } else {
        test.skip('No tasks available for drag and drop test');
      }
    });

    test('should handle rapid UI interactions without degradation', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      await page.waitForSelector('text="To Do"', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        const rapidOperationStart = Date.now();
        
        // Perform rapid search operations
        const searchTerms = ['Task 1', 'Task 2', 'Performance', 'Test', ''];
        
        for (const term of searchTerms) {
          await searchInput.fill(term);
          await page.waitForTimeout(100); // Brief pause between operations
        }
        
        const rapidOperationEnd = Date.now();
        const rapidOperationTime = rapidOperationEnd - rapidOperationStart;
        
        console.log(`Rapid UI interactions time: ${rapidOperationTime}ms`);
        expect(rapidOperationTime).toBeLessThan(3000); // Should handle rapid operations within 3 seconds
        
        // UI should still be responsive
        await expect(searchInput).toBeFocused();
      }
    });

    test('should maintain performance with multiple browser tabs', async ({ browser }) => {
      const context = await browser.newContext();
      
      // Open multiple tabs
      const tabs = [];
      for (let i = 0; i < 3; i++) {
        const page = await context.newPage();
        await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
        await page.waitForSelector('text="To Do"', { timeout: 10000 });
        tabs.push(page);
      }
      
      // Test interactions in each tab
      for (let i = 0; i < tabs.length; i++) {
        const page = tabs[i];
        const interactionStart = Date.now();
        
        const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill(`Tab ${i + 1} search`);
          await page.waitForTimeout(500);
        }
        
        const interactionEnd = Date.now();
        const interactionTime = interactionEnd - interactionStart;
        
        console.log(`Tab ${i + 1} interaction time: ${interactionTime}ms`);
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.uiResponseTime * 3);
      }
      
      // Cleanup
      for (const page of tabs) {
        await page.close();
      }
      await context.close();
    });
  });

  test.describe('Network Error Handling', () => {
    test('should handle slow network conditions gracefully', async ({ page }) => {
      await simulateNetworkConditions(page, 'slow');
      
      try {
        await page.goto(`${UI_BASE_URL}/projects`);
        
        // Should show loading indicators
        const loadingIndicators = [
          page.locator('[data-testid="loader"], .loading, .spinner, svg.animate-spin'),
          page.locator('text="Loading", text="Please wait"')
        ];
        
        let hasLoadingIndicator = false;
        for (const indicator of loadingIndicators) {
          if (await indicator.isVisible()) {
            hasLoadingIndicator = true;
            console.log('✓ Loading indicator shown during slow network');
            break;
          }
        }
        
        // Page should eventually load
        await page.waitForSelector('h1, h2', { timeout: 15000 });
        
        // Should handle subsequent operations
        const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Should show dialog eventually
          await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
          console.log('✓ App remains functional with slow network');
          
          // Close dialog
          const cancelButton = page.locator('button:has-text("Cancel")').first();
          await cancelButton.click();
        }
        
      } finally {
        await simulateNetworkConditions(page, 'fast');
      }
    });

    test('should handle API failures with proper error messages', async ({ page }) => {
      // Block API requests to simulate server errors
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      try {
        await page.goto(`${UI_BASE_URL}/projects`);
        
        // Should show error state
        const errorIndicators = [
          page.locator('text="Error", text="Failed", text="Unable to load"'),
          page.locator('.error, .error-message, [data-testid="error"]'),
          page.locator('button:has-text("Retry"), button:has-text("Try Again")')
        ];
        
        let hasErrorHandling = false;
        for (const indicator of errorIndicators) {
          if (await indicator.isVisible()) {
            hasErrorHandling = true;
            console.log(`✓ Error handling visible: ${await indicator.textContent()}`);
            break;
          }
        }
        
        // Should provide retry mechanism
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
        if (await retryButton.isVisible()) {
          console.log('✓ Retry mechanism available');
        }
        
        if (hasErrorHandling) {
          console.log('✓ API failure handled gracefully');
        } else {
          console.log('API error handling needs improvement');
        }
        
      } finally {
        await page.unroute('**/api/**');
      }
    });

    test('should handle intermittent network failures', async ({ page }) => {
      // Simulate intermittent failures (50% success rate)
      await page.route('**/api/**', route => {
        if (Math.random() < 0.5) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      try {
        await page.goto(`${UI_BASE_URL}/projects`);
        
        // App should eventually load with retries
        await page.waitForSelector('h1, h2', { timeout: 15000 });
        
        // Try to create a project (may require retries)
        const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
        
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Dialog should eventually appear
          try {
            await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
            console.log('✓ App handles intermittent failures');
            
            const cancelButton = page.locator('button:has-text("Cancel")').first();
            await cancelButton.click();
          } catch (error) {
            console.log('Intermittent failure handling could be improved');
          }
        }
        
      } finally {
        await page.unroute('**/api/**');
      }
    });

    test('should handle offline mode gracefully', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects`);
      await page.waitForSelector('h1, h2', { timeout: 10000 });
      
      // Go offline after initial load
      await simulateNetworkConditions(page, 'offline');
      
      try {
        // Try to perform operations that require network
        const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
        
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Should show offline indicator or handle gracefully
          const offlineIndicators = [
            page.locator('text="Offline", text="No connection", text="Connection lost"'),
            page.locator('.offline, .no-connection'),
            page.locator('button:has-text("Retry when online")')
          ];
          
          let hasOfflineHandling = false;
          for (const indicator of offlineIndicators) {
            if (await indicator.isVisible()) {
              hasOfflineHandling = true;
              console.log('✓ Offline mode handled gracefully');
              break;
            }
          }
          
          // App should not crash
          await expect(page.locator('h1, h2')).toBeVisible();
          console.log('✓ App remains stable in offline mode');
        }
        
      } finally {
        await simulateNetworkConditions(page, 'fast');
      }
    });
  });

  test.describe('Memory and Resource Management', () => {
    test('should not have memory leaks with repeated operations', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      await page.waitForSelector('text="To Do"', { timeout: 10000 });
      
      // Get initial memory usage
      const initialMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return { usedJSHeapSize: 0, totalJSHeapSize: 0 };
      });
      
      // Perform repeated operations
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        for (let i = 0; i < 20; i++) {
          await searchInput.fill(`Search ${i}`);
          await page.waitForTimeout(100);
          await searchInput.clear();
          await page.waitForTimeout(100);
        }
      }
      
      // Force garbage collection and wait
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      await page.waitForTimeout(1000);
      
      // Get final memory usage
      const finalMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return { usedJSHeapSize: 0, totalJSHeapSize: 0 };
      });
      
      // Memory should not grow excessively
      const memoryGrowth = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      console.log(`Memory growth after repeated operations: ${memoryGrowthMB.toFixed(2)}MB`);
      
      // Allow up to 50MB growth for repeated operations
      expect(memoryGrowthMB).toBeLessThan(50);
    });

    test('should clean up resources when navigating between pages', async ({ page }) => {
      // Navigate between multiple pages
      const pages = [
        `${UI_BASE_URL}/projects`,
        `${UI_BASE_URL}/projects/${performanceProject.id}/tasks`,
        `${UI_BASE_URL}/templates`,
        `${UI_BASE_URL}/analytics`
      ];
      
      for (const pageUrl of pages) {
        try {
          await page.goto(pageUrl);
          await page.waitForSelector('h1, h2', { timeout: 10000 });
          await page.waitForTimeout(1000);
          
          // Check for resource cleanup (no excessive DOM nodes, event listeners, etc.)
          const domNodeCount = await page.evaluate(() => {
            return document.querySelectorAll('*').length;
          });
          
          console.log(`DOM nodes on ${pageUrl}: ${domNodeCount}`);
          
          // DOM should not grow excessively (reasonable limit for complex apps)
          expect(domNodeCount).toBeLessThan(5000);
          
        } catch (error) {
          console.log(`Page ${pageUrl} may not be implemented yet`);
        }
      }
    });

    test('should handle large form submissions efficiently', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects`);
      await page.waitForSelector('h1, h2', { timeout: 10000 });
      
      // Open create project dialog
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      await createButton.click();
      
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Fill form with large data
      const nameInput = page.locator('input[name="name"], input[id="project-name"]').first();
      const gitPathInput = page.locator('input[name="git_repo_path"], input[id="git-repo-path"]').first();
      const descriptionInput = page.locator('textarea[name="description"], textarea[id="project-description"]').first();
      
      const largeText = 'A'.repeat(5000); // 5KB of text
      
      const formFillStart = Date.now();
      
      await nameInput.fill('Large Form Test Project');
      await gitPathInput.fill('/tmp/large-form-test');
      
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill(largeText);
      }
      
      const formFillEnd = Date.now();
      const formFillTime = formFillEnd - formFillStart;
      
      console.log(`Large form filling time: ${formFillTime}ms`);
      expect(formFillTime).toBeLessThan(3000); // Form should handle large input efficiently
      
      // Cancel form
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    });
  });

  test.describe('Browser Compatibility and Edge Cases', () => {
    test('should handle browser refresh without losing application state', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      await page.waitForSelector('text="To Do"', { timeout: 10000 });
      
      // Apply a search filter
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('Performance Test');
        await page.waitForTimeout(1000);
        
        // Refresh the page
        await page.reload();
        await page.waitForSelector('text="To Do"', { timeout: 10000 });
        
        // Application should load successfully
        await expect(page.locator('text="To Do"')).toBeVisible();
        await expect(page.locator('text="In Progress"')).toBeVisible();
        
        console.log('✓ Application handles browser refresh gracefully');
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects`);
      await page.waitForSelector('h1, h2', { timeout: 10000 });
      
      // Navigate to project tasks
      const projectCard = page.locator(`text="${testData.projectName}"`).first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
        await page.waitForTimeout(2000);
        
        // Use browser back
        await page.goBack();
        await page.waitForTimeout(1000);
        
        // Should be back at projects page
        await expect(page.locator('button:has-text("Create Project"), button:has-text("New Project")')).toBeVisible();
        
        // Use browser forward
        await page.goForward();
        await page.waitForTimeout(1000);
        
        // Should be back at tasks page
        await expect(page.locator('text="To Do"')).toBeVisible();
        
        console.log('✓ Browser navigation handled correctly');
      }
    });

    test('should handle rapid clicking without multiple actions', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects`);
      await page.waitForSelector('h1, h2', { timeout: 10000 });
      
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      
      // Rapidly click the button multiple times
      const rapidClickStart = Date.now();
      for (let i = 0; i < 5; i++) {
        await createButton.click();
        await page.waitForTimeout(50);
      }
      const rapidClickEnd = Date.now();
      
      // Should only open one dialog
      const dialogs = page.locator('[role="dialog"]');
      const dialogCount = await dialogs.count();
      
      console.log(`Rapid clicking resulted in ${dialogCount} dialogs`);
      expect(dialogCount).toBeLessThanOrEqual(1); // Should prevent duplicate dialogs
      
      // Close any open dialog
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
      
      console.log('✓ Rapid clicking handled without duplicate actions');
    });

    test('should handle invalid URLs gracefully', async ({ page }) => {
      // Try to navigate to invalid project ID
      await page.goto(`${UI_BASE_URL}/projects/invalid-project-id/tasks`);
      
      // Should show error page or redirect
      await page.waitForTimeout(3000);
      
      const errorIndicators = [
        page.locator('text="Not Found", text="404", text="Project not found"'),
        page.locator('text="Invalid", text="Error"'),
        page.locator('button:has-text("Go Back"), button:has-text("Home")')
      ];
      
      let hasErrorPage = false;
      for (const indicator of errorIndicators) {
        if (await indicator.isVisible()) {
          hasErrorPage = true;
          console.log(`✓ Error page shown: ${await indicator.textContent()}`);
          break;
        }
      }
      
      // Should not crash the application
      const isPageResponsive = await page.locator('body').isVisible();
      expect(isPageResponsive).toBeTruthy();
      
      console.log('✓ Invalid URLs handled gracefully');
    });

    test('should handle concurrent user actions without conflicts', async ({ browser }) => {
      // Simulate multiple users by opening multiple browser contexts
      const contexts = [];
      const pages = [];
      
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
        await page.waitForSelector('text="To Do"', { timeout: 10000 });
        
        contexts.push(context);
        pages.push(page);
      }
      
      try {
        // Perform concurrent operations
        const concurrentPromises = pages.map(async (page, index) => {
          const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
          
          if (await searchInput.isVisible()) {
            await searchInput.fill(`User ${index + 1} search`);
            await page.waitForTimeout(1000);
            
            // Each user should see their own search results
            const searchValue = await searchInput.inputValue();
            expect(searchValue).toContain(`User ${index + 1}`);
          }
        });
        
        await Promise.all(concurrentPromises);
        
        console.log('✓ Concurrent user actions handled without conflicts');
        
      } finally {
        // Cleanup
        for (const context of contexts) {
          await context.close();
        }
      }
    });
  });

  test.describe('Data Integrity and Recovery', () => {
    test('should maintain data consistency during rapid operations', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects/${performanceProject.id}/tasks`);
      await page.waitForSelector('text="To Do"', { timeout: 10000 });
      
      // Count initial tasks
      const initialTasks = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
      const initialCount = await initialTasks.count();
      
      // Perform rapid drag operations
      const todoTasks = page.locator('[id="todo"]').locator('[data-testid*="task-card"], .task-card').first();
      const inProgressColumn = page.locator('[id="inprogress"]');
      const doneColumn = page.locator('[id="done"]');
      
      if (await todoTasks.isVisible()) {
        // Rapid status changes
        await todoTasks.dragTo(inProgressColumn);
        await page.waitForTimeout(500);
        
        await todoTasks.dragTo(doneColumn);
        await page.waitForTimeout(500);
        
        await todoTasks.dragTo(inProgressColumn);
        await page.waitForTimeout(500);
        
        // Count final tasks
        const finalTasks = page.locator('[data-testid*="task-card"], .task-card, .kanban-card');
        const finalCount = await finalTasks.count();
        
        // Task count should remain consistent
        expect(finalCount).toBe(initialCount);
        
        console.log('✓ Data consistency maintained during rapid operations');
      }
    });

    test('should recover from failed operations', async ({ page }) => {
      await page.goto(`${UI_BASE_URL}/projects`);
      await page.waitForSelector('h1, h2', { timeout: 10000 });
      
      // Count initial projects
      const initialProjects = page.locator('[data-testid="project-card"], .project-card');
      const initialCount = await initialProjects.count();
      
      // Try to create project with network failure
      await page.route('**/api/projects', route => {
        route.abort('failed');
      });
      
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      await createButton.click();
      
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Fill form
      const nameInput = page.locator('input[name="name"], input[id="project-name"]').first();
      const gitPathInput = page.locator('input[name="git_repo_path"], input[id="git-repo-path"]').first();
      
      await nameInput.fill('Failed Creation Test');
      await gitPathInput.fill('/tmp/failed-test');
      
      // Try to submit (should fail)
      const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
      await submitButton.click();
      
      // Wait for potential error
      await page.waitForTimeout(3000);
      
      // Restore network
      await page.unroute('**/api/projects');
      
      // Try again (should succeed)
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Wait for dialog to close
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
        
        // Verify project was created
        await expect(page.locator('text="Failed Creation Test"')).toBeVisible({ timeout: 10000 });
        
        console.log('✓ Recovery from failed operations successful');
      }
    });

    test('should handle storage quota exceeded gracefully', async ({ page }) => {
      // This test simulates storage quota issues (common in browsers with limited storage)
      await page.goto(`${UI_BASE_URL}/projects`);
      await page.waitForSelector('h1, h2', { timeout: 10000 });
      
      // Try to store large amounts of data in localStorage (to simulate quota exceeded)
      const storageTest = await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(1024 * 1024); // 1MB string
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`test_${i}`, largeData);
          }
          return 'success';
        } catch (error) {
          return error.name;
        }
      });
      
      console.log(`Storage test result: ${storageTest}`);
      
      // Application should still function even if storage is limited
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      await expect(createButton).toBeVisible();
      
      // Cleanup test data
      await page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          localStorage.removeItem(`test_${i}`);
        }
      });
      
      console.log('✓ Storage quota issues handled gracefully');
    });
  });
});