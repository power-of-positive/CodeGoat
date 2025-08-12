import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.skip('should navigate between tabs successfully', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard content to be visible and stable
    await expect(page.locator('h1:has-text("Proxy Management")')).toBeVisible();
    await expect(page.locator('text="Server Status"')).toBeVisible();
    
    // Wait a moment for any dynamic content to stabilize
    await page.waitForTimeout(1000);
    
    // Visual regression test - compare against baseline screenshot  
    // Mask dynamic content that changes between runs
    await expect(page).toHaveScreenshot('dashboard-initial.png', {
      mask: [
        // Mask timestamps and dynamic numbers that change between test runs
        page.locator('[data-testid="server-uptime"]'),
        page.locator('text=/\\d+h \\d+m \\d+s/'),
        page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/'),
        page.locator('text=/Memory: \\d+MB/'),
      ]
    });
    
    // Check if tabs are visible (now using Links instead of buttons)
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Request Logs")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
    
    // Click on Request Logs tab
    await page.click('a:has-text("Request Logs")');
    
    // Wait for navigation and content to load
    await page.waitForLoadState('networkidle');
    
    // Check that URL has changed
    expect(page.url()).toContain('/logs');
    
    // Wait for logs content to be stable
    await expect(page.locator('h2:has-text("Chat Completion Logs")')).toBeVisible();
    await page.waitForTimeout(1000);
    
    // Visual regression test for request logs page
    // Mask dynamic log data that changes between test runs
    await expect(page).toHaveScreenshot('dashboard-request-logs.png', {
      mask: [
        // Mask timestamps, durations, and other dynamic log data
        page.locator('table td:nth-child(4)'), // Duration column
        page.locator('table td:nth-child(5)'), // Timestamp column 
        page.locator('text=/\\d+ms/'),
        page.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/'),
        page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/'),
      ]
    });
    
    // Check if we're on the logs page
    const pageContent = await page.textContent('body');
    console.log('Page content after clicking Request Logs:', pageContent?.slice(0, 500));
    
    // Check for either table or some logs-related content
    const hasTable = await page.locator('table').count() > 0;
    const hasLogsContent = await page.locator('text=/logs|request|response/i').count() > 0;
    
    expect(hasTable || hasLogsContent).toBeTruthy();
  });
});