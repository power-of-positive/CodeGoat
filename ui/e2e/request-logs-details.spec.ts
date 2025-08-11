import { test, expect } from '@playwright/test';

test.describe('Request Logs Details', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the logs page
    await page.goto('/logs');
    
    // Wait for the logs page to load
    await page.waitForSelector('h2:has-text("Chat Completion Logs")', { timeout: 10000 });
    
    // Wait for the component to finish loading - either we get logs table or no logs message
    await expect(async () => {
      const hasTable = await page.locator('table').isVisible();
      const hasNoLogsMessage = await page.locator(':text("No chat completion logs found")').isVisible();
      const isLoading = await page.locator(':text("Loading logs...")').isVisible();
      
      // We should have either table OR no logs message, and NOT be loading
      expect(hasTable || hasNoLogsMessage).toBeTruthy();
      expect(isLoading).toBeFalsy();
    }).toPass({ timeout: 15000 });
  });

  test('should display request logs table or no logs message', async ({ page }) => {
    // Check if we have a table with logs OR a "no logs" message
    const hasTable = await page.locator('table').count() > 0;
    const hasNoLogsMessage = await page.locator('.text-gray-400').count() > 0 || 
                            await page.locator(':text("No chat completion logs found")').count() > 0;
    
    expect(hasTable || hasNoLogsMessage).toBeTruthy();
    
    // If we have a table, check the headers
    if (hasTable) {
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Method")')).toBeVisible();
      await expect(page.locator('th:has-text("Path")')).toBeVisible();
      await expect(page.locator('th:has-text("Duration")')).toBeVisible();
      await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
    }
  });

  test('should expand and collapse log details when clicking on a row', async ({ page }) => {
    // Check if we have any log rows
    const table = page.locator('table');
    const noLogsMessage = page.locator(':text("No chat completion logs found")');
    
    const hasTable = await table.isVisible();
    const hasNoLogsMessage = await noLogsMessage.isVisible();
    
    if (hasNoLogsMessage) {
      // If no logs, just verify the no-logs message is visible
      await expect(noLogsMessage).toBeVisible();
      console.log('No logs found - test completed successfully');
      return;
    }
    
    // We must have a table at this point (verified by beforeEach)
    expect(hasTable).toBeTruthy();
    
    // We have a table, check for rows
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} log rows`);
    
    // Click on the first row to expand it
    await rows.first().click();
    
    // Check if the expanded detail view is visible
    await expect(page.locator('.bg-gray-800.rounded-lg.p-4')).toBeVisible();
    
    // Check if basic info is displayed
    await expect(page.locator('label:has-text("Timestamp")')).toBeVisible();
    await expect(page.locator('label:has-text("Method")')).toBeVisible();
    await expect(page.locator('label:has-text("Status")')).toBeVisible();
    
    // Click again to collapse
    await rows.first().click();
    
    // Check if the detail view is no longer visible
    await expect(page.locator('.bg-gray-800.rounded-lg.p-4')).not.toBeVisible();
  });

  test('should display collapsible sections for headers and body', async ({ page }) => {
    // Check if we have table or no logs message
    const hasTable = await page.locator('table').isVisible();
    const hasNoLogsMessage = await page.locator(':text("No chat completion logs found")').isVisible();
    
    if (hasNoLogsMessage) {
      await expect(page.locator(':text("No chat completion logs found")')).toBeVisible();
      return;
    }
    
    // We must have a table at this point (verified by beforeEach)
    expect(hasTable).toBeTruthy();
    
    // We have a table
    const rowCount = await page.locator('tbody tr').count();
    console.log(`Found ${rowCount} log rows for headers test`);
    
    // Click on the first row to expand it
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for detail view
    await page.waitForSelector('.bg-gray-800.rounded-lg.p-4');
    
    // Check for collapsible sections
    const requestHeadersSection = page.locator('button:has-text("Request Headers")');
    const responseHeadersSection = page.locator('button:has-text("Response Headers")');
    
    // If headers sections exist, test them
    if (await requestHeadersSection.count() > 0) {
      // Click to expand request headers
      await requestHeadersSection.click();
      
      // Check if headers are visible
      await expect(page.locator('.font-mono.text-xs').first()).toBeVisible();
      
      // Click to collapse
      await requestHeadersSection.click();
    }
    
    if (await responseHeadersSection.count() > 0) {
      // Click to expand response headers
      await responseHeadersSection.click();
      
      // Check if headers are visible
      await expect(page.locator('.font-mono.text-xs').first()).toBeVisible();
    }
  });

  test('should show copy button for JSON data', async ({ page }) => {
    // Wait for logs to load
    await page.waitForTimeout(2000);
    
    // Check if we have table or no logs message
    const hasTable = await page.locator('table').isVisible();
    const hasNoLogsMessage = await page.locator(':text("No chat completion logs found")').isVisible();
    
    if (!hasTable && !hasNoLogsMessage) {
      throw new Error('Neither table nor no-logs message is visible');
    }
    
    if (hasNoLogsMessage) {
      await expect(page.locator(':text("No chat completion logs found")')).toBeVisible();
      return;
    }
    
    // We have a table
    const rowCount = await page.locator('tbody tr').count();
    console.log(`Found ${rowCount} log rows for copy button test`);
    
    // Click on the first row to expand it
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for detail view
    await page.waitForSelector('.bg-gray-800.rounded-lg.p-4');
    
    // Look for any collapsible section with body data
    const bodySection = page.locator('button:has-text("Body")').first();
    
    if (await bodySection.count() > 0) {
      // Click to expand body section
      await bodySection.click();
      
      // Check for copy button
      await expect(page.locator('button:has-text("Copy")')).toBeVisible();
    }
  });

  test('should display client IP and user agent info', async ({ page }) => {
    // Wait for logs to load
    await page.waitForTimeout(2000);
    
    // Check if we have table or no logs message
    const hasTable = await page.locator('table').isVisible();
    const hasNoLogsMessage = await page.locator(':text("No chat completion logs found")').isVisible();
    
    if (!hasTable && !hasNoLogsMessage) {
      throw new Error('Neither table nor no-logs message is visible');
    }
    
    if (hasNoLogsMessage) {
      await expect(page.locator(':text("No chat completion logs found")')).toBeVisible();
      return;
    }
    
    // We have a table
    const rowCount = await page.locator('tbody tr').count();
    console.log(`Found ${rowCount} log rows for client info test`);
    
    // Click on the first row to expand it
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for detail view
    await page.waitForSelector('.bg-gray-800.rounded-lg.p-4');
    
    // Check for client IP and user agent labels
    await expect(page.locator('label:has-text("Client IP")')).toBeVisible();
    await expect(page.locator('label:has-text("User Agent")')).toBeVisible();
  });
});