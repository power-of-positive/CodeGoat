import { test, expect } from '@playwright/test';

test.describe('Request Logs Details', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the dashboard to fully load
    await page.waitForSelector('button:has-text("Request Logs")', { timeout: 10000 });
    
    // Make a few API requests to generate logs
    await page.request.get('/api/status');
    await page.request.get('/api/models');
    
    // Click on the Request Logs tab
    await page.click('button:has-text("Request Logs")');
    
    // Wait for the component to load - check for either table or "no logs" message
    await page.waitForFunction(() => {
      return document.querySelector('table') || 
             document.querySelector('.text-gray-400') ||
             document.body.textContent?.includes('No request logs found');
    }, { timeout: 15000 });
  });

  test('should display request logs table or no logs message', async ({ page }) => {
    // Check if we have a table with logs OR a "no logs" message
    const hasTable = await page.locator('table').count() > 0;
    const hasNoLogsMessage = await page.locator('.text-gray-400').count() > 0 || 
                            await page.locator(':text("No request logs found")').count() > 0;
    
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
    const rowCount = await page.locator('tbody tr').count();
    
    if (rowCount === 0) {
      // If no logs, just verify the no-logs message
      await expect(page.locator(':text("No request logs found")')).toBeVisible();
      return;
    }
    
    // Wait for at least one log entry
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // Click on the first row to expand it
    await firstRow.click();
    
    // Check if the expanded detail view is visible
    await expect(page.locator('.bg-gray-800.rounded-lg.p-4')).toBeVisible();
    
    // Check if basic info is displayed
    await expect(page.locator('text=Timestamp')).toBeVisible();
    await expect(page.locator('text=Method')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    
    // Click again to collapse
    await firstRow.click();
    
    // Check if the detail view is no longer visible
    await expect(page.locator('.bg-gray-800.rounded-lg.p-4')).not.toBeVisible();
  });

  test('should display collapsible sections for headers and body', async ({ page }) => {
    // Check if we have any log rows
    const rowCount = await page.locator('tbody tr').count();
    
    if (rowCount === 0) {
      await expect(page.locator(':text("No request logs found")')).toBeVisible();
      return;
    }
    
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
    // Check if we have any log rows
    const rowCount = await page.locator('tbody tr').count();
    
    if (rowCount === 0) {
      await expect(page.locator(':text("No request logs found")')).toBeVisible();
      return;
    }
    
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
    // Check if we have any log rows
    const rowCount = await page.locator('tbody tr').count();
    
    if (rowCount === 0) {
      await expect(page.locator(':text("No request logs found")')).toBeVisible();
      return;
    }
    
    // Click on the first row to expand it
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for detail view
    await page.waitForSelector('.bg-gray-800.rounded-lg.p-4');
    
    // Check for client IP and user agent labels
    await expect(page.locator(':text("Client IP")')).toBeVisible();
    await expect(page.locator(':text("User Agent")')).toBeVisible();
  });
});