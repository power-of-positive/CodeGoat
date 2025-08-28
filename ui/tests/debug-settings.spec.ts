import { test, expect } from '@playwright/test';

test.describe('Debug Settings Page', () => {
  test('should debug settings page loading', async ({ page }) => {
    // Navigate to settings with more debugging
    console.error('Navigating to /settings...');
    await page.goto('/settings');

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Take a screenshot to see what's happening
    await page.screenshot({ path: 'debug-settings.png' });

    // Check what's actually on the page
    const content = await page.content();
    console.error('Page content length:', content.length);
    console.error('Page title:', await page.title());

    // Look for any h1, h2, h3 elements
    const headings = await page.locator('h1, h2, h3').all();
    console.error('Found headings:', headings.length);

    for (let i = 0; i < headings.length; i++) {
      const text = await headings[i].textContent();
      console.error(`Heading ${i}:`, text);
    }

    // Look for any error messages
    const errors = await page.locator('text=error').all();
    console.error('Found errors:', errors.length);

    // Look for loading states
    const loading = await page.locator('text=loading').all();
    console.error('Found loading:', loading.length);

    // Check if React is mounted
    const root = await page.locator('#root').innerHTML();
    console.error('Root element content length:', root.length);
    console.error('Root element content:', root.substring(0, 200));
  });
});
