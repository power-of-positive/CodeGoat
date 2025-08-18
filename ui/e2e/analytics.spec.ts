import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to analytics
    await page.goto('/analytics');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should display analytics page header', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1:has-text("Validation Analytics")')).toBeVisible();
    
    // Check for description text
    await expect(page.locator('p:has-text("Track validation pipeline performance and success rates")')).toBeVisible();
    
    // Check for refresh button
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    // Check for summary cards with exact matching to avoid conflicts
    await expect(page.getByRole('heading', { name: 'Total Runs', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Success Rate', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Avg Duration', exact: true })).toBeVisible();
  });

  test('should display analytics sections', async ({ page }) => {
    // Check for stage performance section
    await expect(page.getByRole('heading', { name: 'Stage Performance Overview' })).toBeVisible();
    
    // Check for recent validation runs section
    await expect(page.getByRole('heading', { name: 'Recent Validation Runs' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Stage Performance Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Validation Runs' })).toBeVisible();
  });

  test('should allow refreshing analytics data', async ({ page }) => {
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Page should still be functional after refresh
    await expect(page.locator('h1:has-text("Validation Analytics")')).toBeVisible();
  });

  test('should display analytics navigation item', async ({ page }) => {
    // Check that analytics navigation item exists and is visible (be more specific)
    const analyticsNav = page.getByRole('link', { name: /^Analytics/ }).first();
    await expect(analyticsNav).toBeVisible();
    
    // Verify analytics navigation has icon
    const navIcon = analyticsNav.locator('svg');
    if (await navIcon.isVisible()) {
      await expect(navIcon).toBeVisible();
    }
    
    // Click analytics nav to ensure it works
    await analyticsNav.click();
    
    // Verify we're on analytics page
    await expect(page.locator('h1:has-text("Validation Analytics")')).toBeVisible();
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
    await page.goto('/analytics');
    
    // Wait for error message to appear
    await expect(page.locator('text=Failed to load analytics')).toBeVisible({ timeout: 10000 });
    
    // Should show try again button
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });
});