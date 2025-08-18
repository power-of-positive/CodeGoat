import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test.describe('Analytics Navigation and Layout', () => {
    test('should navigate to analytics dashboard', async ({ page }) => {
      // Should be on analytics page
      await expect(page).toHaveURL('/analytics');
      
      // Should see main analytics heading
      await expect(page.getByRole('heading', { name: 'Validation Analytics' })).toBeVisible();
    });

    test('should display analytics sections', async ({ page }) => {
      // Check for main analytics sections
      await expect(page.getByText('Track validation pipeline performance and success rates')).toBeVisible();
      
      // Check for metric cards with exact matching to avoid conflicts
      await expect(page.getByRole('heading', { name: 'Total Runs', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Success Rate', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Avg Duration', exact: true })).toBeVisible();
    });

    test('should have responsive layout', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByRole('heading', { name: 'Validation Analytics' })).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByRole('heading', { name: 'Validation Analytics' })).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.getByRole('heading', { name: 'Validation Analytics' })).toBeVisible();
    });
  });

  test.describe('Analytics Functionality', () => {
    test('should display recent validation runs', async ({ page }) => {
      // Check for recent runs section
      await expect(page.getByText('Recent Validation Runs')).toBeVisible();
    });

    test('should display validation chart', async ({ page }) => {
      // Check for chart section
      await expect(page.getByText('Stage Performance Overview')).toBeVisible();
    });

    test('should have refresh functionality', async ({ page }) => {
      // Look for refresh button
      const refreshButton = page.getByRole('button', { name: 'Refresh' });
      await expect(refreshButton).toBeVisible();
      
      // Click refresh
      await refreshButton.click();
      
      // Should still be on analytics page
      await expect(page).toHaveURL('/analytics');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to settings from analytics', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');
      await expect(page).toHaveURL('/settings');
      
      // Should see settings heading
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('should redirect root to analytics', async ({ page }) => {
      // Go to root
      await page.goto('/');
      
      // Should redirect to analytics
      await expect(page).toHaveURL('/analytics');
    });
  });
});