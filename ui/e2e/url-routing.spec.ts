import { test, expect } from '@playwright/test';

test.describe('URL Routing', () => {
  test('should navigate directly to dashboard page via URL', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should see the dashboard content
    await expect(page.locator('h2:has-text("Model Configurations")')).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('should navigate directly to logs page via URL', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('domcontentloaded');
    
    // Should see the logs content header
    await expect(page.locator('h2:has-text("Chat Completion Logs")')).toBeVisible();
    expect(page.url()).toContain('/logs');
  });

  test('should navigate directly to analytics page via URL', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    
    // Should see the analytics content header
    await expect(page.locator('h2:has-text("Development Analytics")')).toBeVisible();
    expect(page.url()).toContain('/analytics');
  });

  test('should navigate directly to settings page via URL', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    
    // Should see the settings content header
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();
    expect(page.url()).toContain('/settings');
  });

  test('should redirect root path to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for the dashboard content to load (which indicates redirect happened)
    await expect(page.locator('h2:has-text("Model Configurations")')).toBeVisible();
    
    // Then check that the URL contains /dashboard
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'));
    expect(page.url()).toContain('/dashboard');
  });

  test('should show active tab styling based on current URL', async ({ page }) => {
    // Go to logs page
    await page.goto('/logs');
    await page.waitForLoadState('domcontentloaded');
    
    // The Request Logs tab should be active (have blue styling)
    const activeTab = page.locator('a:has-text("Request Logs")');
    await expect(activeTab).toHaveClass(/text-blue-400/);
    
    // Other tabs should not be active
    const dashboardTab = page.locator('a:has-text("Dashboard")');
    await expect(dashboardTab).toHaveClass(/text-gray-500/);
  });
});