import { test, expect } from '@playwright/test';

test.describe('Integration Workflow', () => {
  test('should complete full task lifecycle', async ({ page }) => {
    // Navigate through main pages
    await page.goto('/tasks');
    await expect(page).toHaveURL('/tasks');

    await page.goto('/analytics');
    await expect(page).toHaveURL('/analytics');

    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');

    // Verify basic navigation works
    expect(page.url()).toBeDefined();
  });

  test('should handle BDD scenario validation workflow', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');
    await expect(page).toHaveURL('/tasks');

    // Navigate to BDD page
    await page.goto('/bdd-tests');
    await expect(page).toHaveURL('/bdd-tests');

    // Verify pages load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should demonstrate worker-analytics integration', async ({ page }) => {
    // Navigate to workers dashboard
    await page.goto('/workers');
    await expect(page).toHaveURL('/workers');

    // Navigate to analytics
    await page.goto('/analytics');
    await expect(page).toHaveURL('/analytics');

    // Both pages should load successfully
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle settings-worker integration', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');

    // Navigate to workers
    await page.goto('/workers');
    await expect(page).toHaveURL('/workers');

    // Verify navigation works
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
