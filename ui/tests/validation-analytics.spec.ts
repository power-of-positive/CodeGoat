import { test, expect } from '@playwright/test';

test.describe('Validation Analytics E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the analytics page
    await page.goto('/analytics');
  });

  test('should display validation analytics page', async ({ page }) => {
    // Check that the main analytics heading is visible
    await expect(page.locator('h2')).toContainText('Validation Analytics');
    
    // Check that the description is present
    await expect(page.locator('p')).toContainText('Track validation pipeline performance and success rates');
  });

  test('should display metrics summary cards', async ({ page }) => {
    // Check for the three main metric cards
    await expect(page.locator('text=Total Runs')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();
    await expect(page.locator('text=Avg Duration')).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    // Check that refresh button is present and clickable
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
    
    // Click refresh button
    await refreshButton.click();
  });

  test('should display recent validation runs section', async ({ page }) => {
    // Check for recent runs section
    await expect(page.locator('text=Recent Validation Runs')).toBeVisible();
  });

  test('should display validation chart section', async ({ page }) => {
    // Check for stage performance overview section
    await expect(page.locator('text=Stage Performance Overview')).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    
    // Check settings page loads
    await expect(page.locator('h2')).toContainText('Validation Settings');
  });

  test('should display validation stages management', async ({ page }) => {
    await page.goto('/settings');
    
    // Check for validation stages section
    await expect(page.locator('text=Validation Stages')).toBeVisible();
    
    // Check for add stage button
    await expect(page.locator('button:has-text("Add Stage")')).toBeVisible();
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Check that loading states are handled (page doesn't crash)
    await page.goto('/analytics');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Ensure no error messages are displayed
    await expect(page.locator('text=Failed to load')).not.toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');
    
    // Check that main content is still visible
    await expect(page.locator('h2')).toContainText('Validation Analytics');
    
    // Check that cards are stacked vertically (responsive design)
    const cards = page.locator('[class*="grid"]').first();
    await expect(cards).toBeVisible();
  });

  test('should handle navigation between pages', async ({ page }) => {
    // Start at analytics
    await page.goto('/analytics');
    await expect(page.locator('h2')).toContainText('Validation Analytics');
    
    // Navigate to settings
    await page.goto('/settings');
    await expect(page.locator('h2')).toContainText('Validation Settings');
    
    // Navigate back to analytics
    await page.goto('/analytics');
    await expect(page.locator('h2')).toContainText('Validation Analytics');
  });

  test('should redirect root path to analytics', async ({ page }) => {
    // Navigate to root
    await page.goto('/');
    
    // Should redirect to analytics
    await expect(page).toHaveURL(/.*\/analytics/);
    await expect(page.locator('h2')).toContainText('Validation Analytics');
  });
});