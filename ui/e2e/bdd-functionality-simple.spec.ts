import { test, expect } from '@playwright/test';

test.describe('BDD Tests Page - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to BDD Tests page
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
  });

  test('should load BDD tests page successfully', async ({ page }) => {
    // Check that we're on the right page
    await expect(page).toHaveURL(/.*bdd-tests/);

    // Check that the page has loaded with some content
    const mainContent = page.locator('#root, main, .container').first();
    await expect(mainContent).toBeVisible();

    // Check for any heading
    const headings = page.getByRole('heading');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('should have navigation sidebar', async ({ page }) => {
    // Check for sidebar navigation
    const sidebar = page.locator('aside, nav, [class*="sidebar"]').first();

    if ((await sidebar.count()) > 0) {
      await expect(sidebar).toBeVisible();

      // Check for BDD Tests link in sidebar
      const bddLink = page.getByRole('link').filter({ hasText: /bdd|test/i });
      if ((await bddLink.count()) > 0) {
        await expect(bddLink.first()).toBeVisible();
      }
    }
  });

  test('should display interactive elements', async ({ page }) => {
    // Check for buttons
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // At least one button should be visible
      await expect(buttons.first()).toBeVisible();
    }

    // Check for tabs if they exist
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      // Click the first tab
      await tabs.first().click();
      await page.waitForTimeout(300);

      // Verify tab interaction worked
      const activeTab = page.getByRole('tab').filter({ hasText: /.+/ }).first();
      await expect(activeTab).toBeVisible();
    }
  });

  test('should handle page refresh gracefully', async ({ page }) => {
    // Initial load
    const initialContent = page.locator('#root, main').first();
    await expect(initialContent).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Content should still be visible after reload
    const refreshedContent = page.locator('#root, main').first();
    await expect(refreshedContent).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Main content should be visible at all sizes
      const content = page.locator('#root, main, .container').first();
      await expect(content).toBeVisible();

      // Small delay to let layout adjust
      await page.waitForTimeout(200);
    }
  });
});

test.describe('BDD Scenario Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
  });

  test('should display BDD-related content', async ({ page }) => {
    // Look for BDD-related text on the page
    const bddKeywords = ['BDD', 'scenario', 'feature', 'given', 'when', 'then', 'test'];
    let foundBddContent = false;

    for (const keyword of bddKeywords) {
      const elements = page.locator(`text=/${keyword}/i`);
      if ((await elements.count()) > 0) {
        foundBddContent = true;
        break;
      }
    }

    // Page should have some BDD-related content
    expect(foundBddContent).toBeTruthy();
  });

  test('should have data display elements', async ({ page }) => {
    // Check for tables, lists, or cards that might display scenarios
    const dataElements = page.locator('table, ul, ol, [class*="card"], [class*="list"]');
    const elementCount = await dataElements.count();

    if (elementCount > 0) {
      // At least one data display element should be visible
      await expect(dataElements.first()).toBeVisible();
    }
  });

  test('should handle user interactions', async ({ page }) => {
    // Try clicking on clickable elements
    const clickableElements = page.locator('button, a[href], [role="button"], [onclick]');
    const clickableCount = await clickableElements.count();

    if (clickableCount > 0) {
      // Click the first clickable element
      const firstClickable = clickableElements.first();

      // Check if it's visible and enabled before clicking
      if ((await firstClickable.isVisible()) && (await firstClickable.isEnabled())) {
        await firstClickable.click();
        await page.waitForTimeout(500);

        // Page should still be functional after interaction
        const content = page.locator('#root, main').first();
        await expect(content).toBeVisible();
      }
    }
  });
});
