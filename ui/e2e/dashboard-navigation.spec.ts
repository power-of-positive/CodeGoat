import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test('should navigate between tabs successfully', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what's rendered
    await page.screenshot({ path: 'dashboard-initial.png' });
    
    // Check if tabs are visible (now using Links instead of buttons)
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Request Logs")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
    
    // Click on Request Logs tab
    await page.click('a:has-text("Request Logs")');
    
    // Wait for navigation and content to change
    await page.waitForTimeout(2000);
    
    // Check that URL has changed
    expect(page.url()).toContain('/logs');
    
    // Take another screenshot
    await page.screenshot({ path: 'dashboard-request-logs.png' });
    
    // Check if we're on the logs page
    const pageContent = await page.textContent('body');
    console.log('Page content after clicking Request Logs:', pageContent?.slice(0, 500));
    
    // Check for either table or some logs-related content
    const hasTable = await page.locator('table').count() > 0;
    const hasLogsContent = await page.locator('text=/logs|request|response/i').count() > 0;
    
    expect(hasTable || hasLogsContent).toBeTruthy();
  });
});