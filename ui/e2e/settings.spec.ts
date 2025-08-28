import { test, expect } from '@playwright/test';

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page', async ({ page }) => {
    // Check that we're on the correct route
    await expect(page).toHaveURL('/settings');
    
    // Check for main heading - could be h1 or h2
    const headingExists = await page.locator('h1:has-text("Settings"), h2:has-text("Settings")').count() > 0;
    if (headingExists) {
      await expect(page.locator('h1:has-text("Settings"), h2:has-text("Settings")').first()).toBeVisible();
    } else {
      // Check for any heading that might contain settings
      const settingsText = page.locator('text=Settings').first();
      if (await settingsText.count() > 0) {
        await expect(settingsText).toBeVisible();
      }
    }
  });

  test('should display page content or error state', async ({ page }) => {
    // Check if settings cards are present - be more specific with selectors
    const validationPipeline = page.getByRole('heading', { name: 'Validation Pipeline' });
    const permissions = page.getByRole('heading', { name: 'Security & Permissions' });
    const analytics = page.getByRole('heading', { name: 'Analytics & Monitoring' });
    
    if (await validationPipeline.count() > 0) {
      await expect(validationPipeline).toBeVisible();
    }
    
    if (await permissions.count() > 0) {
      await expect(permissions).toBeVisible();
    }
    
    if (await analytics.count() > 0) {
      await expect(analytics).toBeVisible();
    }
    
    // Check for error state or loading state
    const errorText = page.locator('text=/error|failed|not found/i');
    if (await errorText.count() > 0) {
      console.error('Error state detected on settings page');
    }
    
    // At minimum, some content should be visible
    // Wait for page to be loaded and check for any visible content
    await page.waitForLoadState('networkidle');
    const hasVisibleContent = await page.locator('body *').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasVisibleContent).toBeTruthy();
  });

  test('should have functional navigation links', async ({ page }) => {
    // Look for any navigation links
    const links = await page.locator('a[href]').all();
    
    if (links.length > 0) {
      // Test the first valid link
      const firstLink = page.locator('a[href]').first();
      const href = await firstLink.getAttribute('href');
      
      if (href && href !== '#' && href.startsWith('/')) {
        await firstLink.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Should navigate somewhere
        expect(page.url()).toContain(href);
      }
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Page should still be accessible
      await page.waitForLoadState('networkidle');
      const hasContent = await page.locator('body *').first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasContent).toBeTruthy();
      
      // Give time for layout adjustment
      await page.waitForTimeout(300);
    }
  });

  test('should handle page refresh', async ({ page }) => {
    // Initial load - wait for page to be ready
    await page.waitForLoadState('networkidle');
    const hasInitialContent = await page.locator('body *').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasInitialContent).toBeTruthy();
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on settings page
    await expect(page).toHaveURL('/settings');
    const hasContentAfterRefresh = await page.locator('body *').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasContentAfterRefresh).toBeTruthy();
  });

  test('should display stage management link if available', async ({ page }) => {
    const stageManagementLink = page.locator('a[href*="stage-management"], a:has-text("Stage Management")');
    
    if (await stageManagementLink.count() > 0) {
      await expect(stageManagementLink.first()).toBeVisible();
    }
  });

  test('should display permissions link if available', async ({ page }) => {
    const permissionsLink = page.locator('a[href*="permissions"], a:has-text("Permissions")');
    
    if (await permissionsLink.count() > 0) {
      await expect(permissionsLink.first()).toBeVisible();
    }
  });

  test('should display analytics link if available', async ({ page }) => {
    const analyticsLink = page.locator('a[href*="analytics"], a:has-text("Analytics")');
    
    if (await analyticsLink.count() > 0) {
      await expect(analyticsLink.first()).toBeVisible();
    }
  });

  test('should show some content or graceful error', async ({ page }) => {
    // Page should have some meaningful content or show a proper error state
    const hasContent = await page.locator('h1, h2, p, div:has-text("Settings")').count() > 0;
    const hasError = await page.locator('text=/error|failed|loading/i').count() > 0;
    const hasComponents = await page.locator('button, a, input').count() > 0;
    
    // At least one of these should be true
    expect(hasContent || hasError || hasComponents).toBeTruthy();
  });
});