import { test, expect } from '@playwright/test';

/**
 * E2E tests for sidebar collapse functionality
 * Tests the ability to collapse and expand the navigation sidebar
 */

test.describe('Sidebar Collapse Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page that has the sidebar layout
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display sidebar in expanded state by default', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Sidebar should be visible and expanded
    await expect(sidebar).toBeVisible();

    // Should show the CodeGoat title (only visible when expanded)
    await expect(page.getByText('CodeGoat')).toBeVisible();
    await expect(page.getByText('AI-powered project management')).toBeVisible();

    // Toggle button should be visible with X icon (collapse icon)
    await expect(toggleButton).toBeVisible();

    // Navigation items should show text labels
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Projects')).toBeVisible();
    await expect(page.getByText('Request Logs')).toBeVisible();
  });

  test('should collapse sidebar when toggle button is clicked', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Click the toggle button to collapse
    await toggleButton.click();

    // Wait for animation to complete
    await page.waitForTimeout(500);

    // Sidebar should still be visible but narrower
    await expect(sidebar).toBeVisible();

    // Title and description should be hidden when collapsed
    await expect(page.getByText('CodeGoat')).not.toBeVisible();
    await expect(page.getByText('AI-powered project management')).not.toBeVisible();

    // Navigation text labels should be hidden, but icons should remain
    const dashboardLink = page.locator('[data-testid="nav-dashboard"]');
    await expect(dashboardLink).toBeVisible();

    // The text "Dashboard" should not be visible when collapsed
    await expect(dashboardLink.getByText('Dashboard')).not.toBeVisible();

    // Toggle button should now show Menu icon (expand icon)
    await expect(toggleButton).toBeVisible();
  });

  test('should expand sidebar when toggle button is clicked twice', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // First collapse
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Then expand again
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Should be back to expanded state
    await expect(page.getByText('CodeGoat')).toBeVisible();
    await expect(page.getByText('AI-powered project management')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Projects')).toBeVisible();
  });

  test('should maintain navigation functionality when collapsed', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Collapse the sidebar
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Click on Projects icon to navigate
    const projectsLink = page.locator('[data-testid="nav-projects"]');
    await projectsLink.click();

    // Should navigate to projects page
    await expect(page).toHaveURL(/\/projects/);

    // Sidebar should remain collapsed after navigation
    await expect(page.getByText('CodeGoat')).not.toBeVisible();

    // But the projects link should be active (highlighted)
    await expect(projectsLink).toHaveClass(/bg-gray-700/);
  });

  test('should show tooltips for navigation items when collapsed', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Collapse the sidebar
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Navigation items should have title attributes for tooltips
    const dashboardLink = page.locator('[data-testid="nav-dashboard"]');
    const projectsLink = page.locator('[data-testid="nav-projects"]');

    // Check that title attributes are present
    await expect(dashboardLink).toHaveAttribute('title', 'Dashboard');
    await expect(projectsLink).toHaveAttribute('title', 'Projects');
  });

  test('should persist collapse state during navigation', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Collapse the sidebar
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Navigate to different pages
    await page.locator('[data-testid="nav-analytics"]').click();
    await page.waitForLoadState('networkidle');

    // Sidebar should still be collapsed
    await expect(page.getByText('CodeGoat')).not.toBeVisible();

    // Navigate to settings
    await page.locator('[data-testid="nav-settings"]').click();
    await page.waitForLoadState('networkidle');

    // Sidebar should still be collapsed
    await expect(page.getByText('CodeGoat')).not.toBeVisible();
  });

  test('should handle keyboard accessibility', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Focus on the toggle button
    await toggleButton.focus();

    // Press Enter to toggle
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should collapse the sidebar
    await expect(page.getByText('CodeGoat')).not.toBeVisible();

    // Press Enter again to expand
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should expand the sidebar
    await expect(page.getByText('CodeGoat')).toBeVisible();
  });

  test('should work across different pages', async ({ page }) => {
    const pages = ['/dashboard', '/projects', '/logs', '/analytics', '/settings'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      const sidebar = page.locator('[data-testid="sidebar"]');

      // Should be able to toggle on any page
      await expect(sidebar).toBeVisible();
      await expect(toggleButton).toBeVisible();

      // Test collapse
      await toggleButton.click();
      await page.waitForTimeout(300);
      await expect(page.getByText('CodeGoat')).not.toBeVisible();

      // Test expand
      await toggleButton.click();
      await page.waitForTimeout(300);
      await expect(page.getByText('CodeGoat')).toBeVisible();
    }
  });

  test('should have smooth animation transitions', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Check that sidebar has transition classes
    await expect(sidebar).toHaveClass(/transition-all/);
    await expect(sidebar).toHaveClass(/duration-300/);

    // Test collapse animation
    await toggleButton.click();

    // During animation, sidebar should still be visible
    await expect(sidebar).toBeVisible();

    // After animation completes
    await page.waitForTimeout(500);
    await expect(page.getByText('CodeGoat')).not.toBeVisible();
  });

  test('should maintain active state highlighting when collapsed', async ({ page }) => {
    // Start on dashboard (should be active)
    const dashboardLink = page.locator('[data-testid="nav-dashboard"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    // Verify dashboard is active when expanded
    await expect(dashboardLink).toHaveClass(/bg-gray-700/);

    // Collapse sidebar
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Dashboard should still be highlighted as active when collapsed
    await expect(dashboardLink).toHaveClass(/bg-gray-700/);

    // Navigate to analytics while collapsed (analytics should definitely exist)
    const analyticsLink = page.locator('[data-testid="nav-analytics"]');
    await analyticsLink.click();
    await page.waitForLoadState('networkidle');

    // Wait a bit for the active state to update
    await page.waitForTimeout(500);

    // Analytics should now be active
    await expect(analyticsLink).toHaveClass(/bg-gray-700/);

    // Dashboard should no longer be active - check it doesn't have active styling
    const dashboardClasses = (await dashboardLink.getAttribute('class')) || '';
    const analyticsClasses = (await analyticsLink.getAttribute('class')) || '';

    // Analytics should be active, dashboard should be inactive
    expect(analyticsClasses).toMatch(/bg-gray-700 text-gray-100/);
    expect(dashboardClasses).not.toMatch(/bg-gray-700 text-gray-100/);
  });
});
