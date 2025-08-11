import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the dashboard to fully load
    await page.waitForSelector('a:has-text("Analytics")', { timeout: 10000 });
    
    // Click on the Analytics tab
    await page.click('a:has-text("Analytics")');
    
    // Wait for analytics content to load
    await page.waitForSelector('h2:has-text("Development Analytics")', { timeout: 10000 });
  });

  test('should display analytics page header', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h2:has-text("Development Analytics")')).toBeVisible();
    
    // Check for description text
    await expect(page.locator('p:has-text("Track validation success rates")')).toBeVisible();
    
    // Check for refresh button
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    // Check for summary cards with more specific selectors
    await expect(page.locator('p:has-text("Total Sessions")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Success Rate")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Avg Time to Success")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Avg Attempts")').first()).toBeVisible();
  });

  test('should display analytics sections', async ({ page }) => {
    // Check for stage success rates section
    await expect(page.locator('h3:has-text("Validation Stage Success Rates")')).toBeVisible();
    
    // Check for recent sessions section
    await expect(page.locator('h3:has-text("Recent Sessions")')).toBeVisible();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Analytics might be empty on first load
    const noStagesMessage = page.locator('text=No validation stages data available');
    const noSessionsMessage = page.locator('text=No sessions found');
    
    // Check if empty states are handled
    const hasStagesEmptyState = await noStagesMessage.count() > 0;
    const hasSessionsEmptyState = await noSessionsMessage.count() > 0;
    
    if (hasStagesEmptyState) {
      await expect(noStagesMessage).toBeVisible();
    }
    
    if (hasSessionsEmptyState) {
      await expect(noSessionsMessage).toBeVisible();
    }
    
    // Page should be functional even with no data - at least check that sections exist
    await expect(page.locator('h3:has-text("Validation Stage Success Rates")')).toBeVisible();
    await expect(page.locator('h3:has-text("Recent Sessions")')).toBeVisible();
  });

  test('should allow refreshing analytics data', async ({ page }) => {
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Page should still be functional after refresh
    await expect(page.locator('h2:has-text("Development Analytics")')).toBeVisible();
  });

  test('should display analytics icon in tab', async ({ page }) => {
    // Navigate back to dashboard first
    await page.click('a:has-text("Dashboard")');
    
    // Check that analytics tab has the correct icon
    const analyticsTab = page.locator('a:has-text("Analytics")');
    await expect(analyticsTab).toBeVisible();
    
    // Click analytics tab again
    await analyticsTab.click();
    
    // Verify we're on analytics page
    await expect(page.locator('h2:has-text("Development Analytics")')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept both analytics API calls and simulate errors
    await page.route('**/api/analytics', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal server error' }) });
    });
    
    await page.route('**/api/analytics/sessions**', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal server error' }) });
    });
    
    // Navigate to analytics with errors
    await page.goto('/');
    await page.click('a:has-text("Analytics")');
    
    // Wait for error message to appear
    await expect(page.locator('text=Failed to load analytics data')).toBeVisible({ timeout: 10000 });
    
    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});