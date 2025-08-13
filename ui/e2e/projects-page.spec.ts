import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page first
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to projects page from navigation menu', async ({ page }) => {
    // Look for the projects link in navigation
    const projectsLink = page.locator('a[href="/projects"], [data-testid="nav-projects"]').first();
    
    // Check if the link is visible
    await expect(projectsLink).toBeVisible();
    
    // Click on the projects link
    await projectsLink.click();
    
    // Wait for navigation
    await page.waitForURL('**/projects', { timeout: 10000 });
    
    // Verify we're on the projects page
    expect(page.url()).toContain('/projects');
    
    // Check for projects page content
    await expect(page.locator('h1, h2').filter({ hasText: /projects/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display projects page content correctly', async ({ page }) => {
    // Navigate directly to projects page
    await page.goto('/projects');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Debug: log the page content
    const pageText = await page.textContent('body');
    console.log('Page content:', pageText?.substring(0, 500));
    
    // Check for any indication we're on the projects page
    const projectsIndicators = [
      page.locator('text=/projects/i'),
      page.locator('h1:has-text("Projects")'),
      page.locator('h2:has-text("Projects")'),
      page.locator('[data-testid*="project"]'),
      page.locator('.project-list'),
      page.locator('text=/no projects/i'),
      page.locator('text=/create.*project/i')
    ];
    
    let foundIndicator = false;
    for (const indicator of projectsIndicators) {
      const count = await indicator.count();
      if (count > 0) {
        foundIndicator = true;
        console.log('Found indicator:', await indicator.first().textContent());
        break;
      }
    }
    
    expect(foundIndicator).toBeTruthy();
  });

  test('should handle page refresh on projects page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Reload the page
    await page.reload();
    
    // Verify we're still on projects page
    expect(page.url()).toContain('/projects');
    
    // Content should still be visible after reload
    await expect(page.locator('text=/projects/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should not show error state on projects page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that there are no error messages
    const errorSelectors = ['.error', '[class*="error"]'];
    const errorTexts = page.locator('text=/error/i').or(page.locator('text=/failed/i')).or(page.locator('text=/could not/i'));
    
    let errorCount = 0;
    for (const selector of errorSelectors) {
      errorCount += await page.locator(selector).count();
    }
    errorCount += await errorTexts.count();
    
    // Log any errors found for debugging
    if (errorCount > 0) {
      console.log('Found', errorCount, 'error elements on page');
    }
    
    // There should be no error messages
    expect(errorCount).toBe(0);
  });

  test('should have working navigation from projects page', async ({ page }) => {
    // Navigate to projects page first
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate back to dashboard
    const dashboardLink = page.locator('a[href="/"]').or(page.locator('[data-testid="nav-dashboard"]')).or(page.locator('text=/dashboard/i')).first();
    
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForURL('**/', { timeout: 10000 });
      expect(page.url()).toMatch(/\/$|\/dashboard/);
    }
  });
});