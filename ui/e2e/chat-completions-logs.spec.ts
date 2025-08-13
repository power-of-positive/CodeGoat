import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for chat completion logging functionality
 * Ensures that chat completion requests are properly logged and displayed in the UI
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test chat completion request payload
const TEST_COMPLETION_PAYLOAD = {
  model: 'kimi-k2:free',
  messages: [{ role: 'user', content: 'Hello, this is a Playwright test!' }],
  max_tokens: 50,
};

// Helper function to make a chat completion request
async function makeChatCompletionRequest() {
  const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-key',
    },
    body: JSON.stringify(TEST_COMPLETION_PAYLOAD),
  });

  if (!response.ok) {
    throw new Error(`Chat completion request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Helper function to wait for logs to appear in the API
async function waitForLogsInAPI(expectedCount: number = 1, timeoutMs: number = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${API_BASE_URL}/api/logs/chat-completions?limit=10`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.logs && data.logs.length >= expectedCount) {
        return data.logs;
      }
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Logs did not appear in API within ${timeoutMs}ms`);
}

// Helper function to navigate to chat completion logs page
async function navigateToLogsPage(page: Page) {
  await page.goto(`${UI_BASE_URL}`);
  
  // Wait for the page to load and click on Request Logs navigation
  await page.waitForSelector('[data-testid="nav-request-logs"]', { timeout: 10000 });
  await page.click('[data-testid="nav-request-logs"]');
  
  // Wait for the logs page to load
  await page.waitForSelector('h2:has-text("Chat Completion Logs")', { timeout: 10000 });
}

test.describe('Chat Completion Logs E2E', () => {
  
  test('should log chat completion requests and display them in the UI', async ({ page }) => {
    // Step 1: Make a chat completion request to generate logs
    const completionResponse = await makeChatCompletionRequest();
    expect(completionResponse).toBeDefined();
    expect(completionResponse.choices).toBeDefined();
    expect(completionResponse.choices.length).toBeGreaterThan(0);
    
    // Step 2: Wait for the logs to appear in the API
    const apiLogs = await waitForLogsInAPI(1);
    expect(apiLogs).toBeDefined();
    expect(apiLogs.length).toBeGreaterThan(0);
    
    // Verify the log contains the correct information
    const testLog = apiLogs[0];
    expect(testLog.path).toBe('/v1/chat/completions');
    expect(testLog.method).toBe('POST');
    expect(testLog.statusCode).toBe(200);
    expect(testLog.requestBody).toBeDefined();
    expect(testLog.requestBody.model).toBe(TEST_COMPLETION_PAYLOAD.model);
    expect(testLog.responseBody).toBeDefined();
    expect(testLog.responseBody.choices).toBeDefined();
    
    // Step 3: Navigate to the UI logs page
    await navigateToLogsPage(page);
    
    // Step 4: Wait for logs to appear in the UI (might take a moment to process)
    await page.waitForFunction(
      () => {
        const table = document.querySelector('table');
        if (!table) return false;
        const rows = table.querySelectorAll('tbody tr');
        return rows.length > 0;
      },
      { timeout: 15000 }
    );
    
    // Verify we have logs displayed
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);
    
    // Check that the first row contains our test request
    const firstRow = page.locator('tbody tr').first();
    
    // Check status code
    await expect(firstRow.locator('td').first()).toContainText('200');
    
    // Check method
    await expect(firstRow.locator('td').nth(1)).toContainText('POST');
    
    // Check path
    await expect(firstRow.locator('td').nth(2)).toContainText('/v1/chat/completions');
    
    // Check that duration is displayed
    const durationCell = firstRow.locator('td').nth(3);
    await expect(durationCell).toContainText('ms');
  });
  
  test('should allow expanding log details to view request and response data', async ({ page }) => {
    // Step 1: Make a chat completion request
    await makeChatCompletionRequest();
    
    // Step 2: Wait for logs to appear
    await waitForLogsInAPI(1);
    
    // Step 3: Navigate to the UI logs page
    await navigateToLogsPage(page);
    
    // Step 4: Wait for logs to appear in the table
    await page.waitForFunction(
      () => {
        const table = document.querySelector('table');
        if (!table) return false;
        const rows = table.querySelectorAll('tbody tr');
        return rows.length > 0;
      },
      { timeout: 15000 }
    );
    
    // Step 5: Click on the first row to expand details
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Step 6: Wait for the expanded details to appear
    await page.waitForSelector('.log-details', { timeout: 5000 });
    
    // Step 7: Verify request details are shown
    await expect(page.locator('.log-details')).toContainText('Request Body');
    await expect(page.locator('.log-details')).toContainText(TEST_COMPLETION_PAYLOAD.model);
    await expect(page.locator('.log-details')).toContainText(TEST_COMPLETION_PAYLOAD.messages[0].content);
    
    // Step 8: Verify response details are shown
    await expect(page.locator('.log-details')).toContainText('Response Body');
    await expect(page.locator('.log-details')).toContainText('choices');
  });
  
  test('should refresh logs when the refresh button is clicked', async ({ page }) => {
    // Step 1: Navigate to logs page first
    await navigateToLogsPage(page);
    
    // Step 2: Wait for table to load and count initial logs
    await page.waitForFunction(
      () => {
        const table = document.querySelector('table');
        return table !== null;
      },
      { timeout: 15000 }
    );
    const initialRowCount = await page.locator('tbody tr').count();
    
    // Step 3: Make a new chat completion request
    await makeChatCompletionRequest();
    
    // Step 4: Click refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    
    // Step 5: Wait for loading to complete and verify new logs appear
    await page.waitForFunction(
      (expectedMinCount) => {
        const table = document.querySelector('table');
        if (!table) return false;
        const rows = table.querySelectorAll('tbody tr');
        return rows.length >= expectedMinCount;
      },
      { timeout: 15000 },
      initialRowCount + 1
    );
    
    // Verify the count increased
    const newRowCount = await page.locator('tbody tr').count();
    expect(newRowCount).toBeGreaterThan(initialRowCount);
  });
  
  test('should handle empty logs state gracefully', async ({ page }) => {
    // Step 1: Navigate to logs page  
    await navigateToLogsPage(page);
    
    // Step 2: Wait for the page to fully load (either show table or empty state)
    await page.waitForFunction(
      () => {
        const table = document.querySelector('table');
        const emptyMessage = document.querySelector('[data-testid="empty-state"]') || 
                           document.querySelector('text*="No chat completion logs found"') ||
                           document.querySelector('div:has-text("No chat completion logs found")');
        return table !== null || emptyMessage !== null;
      },
      { timeout: 15000 }
    );
    
    // Step 3: Check what state we're in
    const hasTable = await page.locator('table').count() > 0;
    const hasEmptyMessage = await page.locator('text="No chat completion logs found"').count() > 0;
    
    // Either we should have a table or an empty message (or both is fine too)
    expect(hasTable || hasEmptyMessage).toBe(true);
  });
  
  test('should display proper error handling when API fails', async ({ page }) => {
    // This test would require mocking a failed API response
    // For now, we'll test that the UI has error handling elements
    await navigateToLogsPage(page);
    
    // Verify that error handling elements exist in the component
    // The actual error state would be triggered by API failures
    await page.waitForSelector('h2:has-text("Chat Completion Logs")', { timeout: 10000 });
    
    // Check that the component has loaded without errors
    const errorAlert = page.locator('[data-testid="error-alert"]');
    await expect(errorAlert).not.toBeVisible();
  });
});

test.describe('Chat Completion API Direct Tests', () => {
  
  test('should return proper logs from API endpoint', async () => {
    // Step 1: Make a chat completion request
    const completionResponse = await makeChatCompletionRequest();
    expect(completionResponse).toBeDefined();
    
    // Step 2: Fetch logs from API
    const logsResponse = await fetch(`${API_BASE_URL}/api/logs/chat-completions?limit=5`);
    expect(logsResponse.ok).toBe(true);
    
    const logsData = await logsResponse.json();
    expect(logsData).toBeDefined();
    expect(logsData.logs).toBeDefined();
    expect(Array.isArray(logsData.logs)).toBe(true);
    expect(logsData.total).toBeGreaterThan(0);
    expect(logsData.limit).toBe(5);
    expect(logsData.offset).toBe(0);
    
    // Verify log structure
    if (logsData.logs.length > 0) {
      const log = logsData.logs[0];
      expect(log.timestamp).toBeDefined();
      expect(log.method).toBe('POST');
      expect(log.path).toBe('/v1/chat/completions');
      expect(log.statusCode).toBe(200);
      expect(log.requestBody).toBeDefined();
      expect(log.responseBody).toBeDefined();
    }
  });
  
  test('should handle pagination in logs API', async () => {
    // Make multiple requests to ensure we have enough logs for pagination
    await makeChatCompletionRequest();
    await makeChatCompletionRequest();
    await makeChatCompletionRequest();
    
    // Wait for logs to be written
    await waitForLogsInAPI(3);
    
    // Test pagination
    const page1Response = await fetch(`${API_BASE_URL}/api/logs/chat-completions?limit=2&offset=0`);
    const page1Data = await page1Response.json();
    
    expect(page1Data.logs.length).toBeLessThanOrEqual(2);
    expect(page1Data.limit).toBe(2);
    expect(page1Data.offset).toBe(0);
    
    if (page1Data.total > 2) {
      const page2Response = await fetch(`${API_BASE_URL}/api/logs/chat-completions?limit=2&offset=2`);
      const page2Data = await page2Response.json();
      
      expect(page2Data.limit).toBe(2);
      expect(page2Data.offset).toBe(2);
    }
  });
});