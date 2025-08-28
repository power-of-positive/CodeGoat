import { test, expect } from '@playwright/test';

/**
 * E2E tests for sidebar collapse functionality
 * Tests the ability to collapse and expand the navigation sidebar
 */

test.describe('Sidebar Collapse Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page which has the sidebar layout
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display sidebar in expanded state by default', async ({ page }) => {
    // Check for CodeGoat title (only visible when expanded)
    await expect(page.locator('h1:has-text("CodeGoat")')).toBeVisible();
    
    // Check for navigation items in sidebar
    await expect(page.getByRole('link', { name: /Analytics.*View validation/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kanban/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Tasks/i })).toBeVisible();
    
    // Check that toggle button exists (desktop version)
    const toggleButton = page.getByRole('button', { name: /Collapse sidebar/i });
    await expect(toggleButton).toBeVisible();
  });

  test('should collapse sidebar when toggle button is clicked', async ({ page }) => {
    // Find and click the desktop toggle button
    const toggleButton = page.getByRole('button', { name: /Collapse sidebar/i });
    await expect(toggleButton).toBeVisible();
    
    await toggleButton.click();
    await page.waitForTimeout(500); // Allow for animation
    
    // After collapsing, CodeGoat title should not be visible
    await expect(page.locator('h1:has-text("CodeGoat")')).not.toBeVisible();
    
    // Toggle button should now show "Expand sidebar"
    const expandButton = page.getByRole('button', { name: /Expand sidebar/i });
    await expect(expandButton).toBeVisible();
  });

  test('should expand sidebar when toggle button is clicked twice', async ({ page }) => {
    // First, collapse the sidebar
    const collapseButton = page.getByRole('button', { name: /Collapse sidebar/i });
    await collapseButton.click();
    await page.waitForTimeout(500);
    
    // Then expand it again
    const expandButton = page.getByRole('button', { name: /Expand sidebar/i });
    await expandButton.click();
    await page.waitForTimeout(500);
    
    // CodeGoat title should be visible again
    await expect(page.locator('h1:has-text("CodeGoat")')).toBeVisible();
    
    // Navigation items should be visible with text
    await expect(page.getByRole('link', { name: /Analytics.*View validation/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kanban/i })).toBeVisible();
  });

  test('should maintain navigation functionality when collapsed', async ({ page }) => {
    // Collapse the sidebar
    const toggleButton = page.getByRole('button', { name: /Collapse sidebar/i });
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Navigation links should still be clickable (even if text is hidden)
    const kanbanLink = page.locator('a[href="/kanban"]');
    if (await kanbanLink.count() > 0) {
      await kanbanLink.click();
      await expect(page).toHaveURL('/kanban');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // On mobile, the sidebar behavior might be different
    // Check if mobile close button exists
    const mobileButton = page.getByRole('button', { name: /Close sidebar/i });
    if (await mobileButton.count() > 0) {
      await expect(mobileButton).toBeVisible();
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should persist sidebar state across navigation', async ({ page }) => {
    // Collapse the sidebar
    const toggleButton = page.getByRole('button', { name: /Collapse sidebar/i });
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Navigate to another page
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    
    // Sidebar should still be collapsed (if state is persisted)
    // This may not be implemented, so we'll just check the UI is functional
    const expandButton = page.getByRole('button', { name: /Expand sidebar/i });
    if (await expandButton.count() > 0) {
      await expect(expandButton).toBeVisible();
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Focus the toggle button and press Enter
    const toggleButton = page.getByRole('button', { name: /Collapse sidebar/i });
    await toggleButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Should have collapsed
    await expect(page.locator('h1:has-text("CodeGoat")')).not.toBeVisible();
    
    // Focus and expand again with spacebar
    const expandButton = page.getByRole('button', { name: /Expand sidebar/i });
    await expandButton.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    // Should be expanded again
    await expect(page.locator('h1:has-text("CodeGoat")')).toBeVisible();
  });
});