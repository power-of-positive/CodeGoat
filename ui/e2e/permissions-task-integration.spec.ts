import { test, expect } from '@playwright/test';

test.describe('Permissions and Tasks Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the dashboard
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should navigate between permissions and tasks pages', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Navigate to permissions
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/permissions');

    // Wait for the permission editor page to load
    const permissionEditor = page.locator('h1').filter({ hasText: 'Permission Editor' });
    await expect(permissionEditor).toBeVisible({ timeout: 15000 });

    // Navigate to tasks
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/tasks');

    // Should show tasks page (check for any heading)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();

    // Navigate back to permissions
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/permissions');

    await expect(page.locator('h1').filter({ hasText: 'Permission Editor' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should maintain layout consistency across pages', async ({ page }) => {
    // Check permissions page
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');

    // Should have main content area
    const mainContent = page.locator('main, .container, #root > div').first();
    await expect(mainContent).toBeVisible();

    // Should have the permission editor heading
    await expect(page.locator('h1').filter({ hasText: 'Permission Editor' })).toBeVisible({
      timeout: 10000,
    });

    // Check tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Should have main content area
    await expect(mainContent).toBeVisible();

    // Should have some heading
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should handle URL navigation correctly', async ({ page }) => {
    // Direct navigation to permissions
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').filter({ hasText: 'Permission Editor' })).toBeVisible({
      timeout: 15000,
    });

    // Direct navigation to tasks
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Should load tasks page successfully
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate to permissions
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/permissions');

    // Navigate to tasks
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/tasks');

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/permissions');
    await expect(page.locator('h1').filter({ hasText: 'Permission Editor' })).toBeVisible({
      timeout: 10000,
    });

    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL('/tasks');

    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should allow navigation to analytics page', async ({ page }) => {
    // Navigate to analytics (the default route)
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/analytics');

    // Should show analytics content
    const content = page.locator('main, .container, #root > div').first();
    await expect(content).toBeVisible();
  });

  test('should redirect root path to analytics', async ({ page }) => {
    // Go to root path
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to analytics
    await expect(page).toHaveURL('/analytics');
  });

  test('should maintain responsive design across pages', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check permissions page on mobile
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').filter({ hasText: 'Permission Editor' })).toBeVisible({
      timeout: 15000,
    });

    // Check tasks page on mobile
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle page reload gracefully on both pages', async ({ page }) => {
    // Test permissions page reload
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').filter({ hasText: 'Permission Editor' })).toBeVisible({
      timeout: 15000,
    });

    // Test tasks page reload
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
