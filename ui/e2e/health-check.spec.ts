import { test, expect } from '@playwright/test';

/**
 * Basic health check test to verify E2E testing infrastructure
 * This test should be fast and not depend on complex server interactions
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

test.describe('E2E Health Check', () => {
  
  test('should verify servers are accessible', async ({ page }) => {
    // Set a shorter timeout for this health check
    test.setTimeout(15000);
    
    try {
      // Check if UI server is accessible
      await page.goto(UI_BASE_URL, { timeout: 5000 });
      await expect(page).toHaveURL(new RegExp(UI_BASE_URL));
      
      // Check if page loads basic content
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      // Verify we get some HTML content (not a connection error page)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText?.length).toBeGreaterThan(10);
      
      console.log('✅ UI server is accessible');
      
      // Try to make a simple API call
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          console.log('✅ API server is accessible');
        } else {
          console.log('⚠️  API server returned non-200 status:', response.status);
        }
      } catch (apiError) {
        console.log('⚠️  API server not accessible:', (apiError as Error).message);
      }
      
    } catch (error) {
      console.log('❌ Health check failed:', (error as Error).message);
      throw error;
    }
  });
  
  test('should verify playwright can interact with page elements', async ({ page }) => {
    test.setTimeout(10000);
    
    await page.goto(UI_BASE_URL, { timeout: 5000 });
    
    // Try to interact with the page (click, type, etc.)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check if we can find some common navigation elements
    const hasNavigation = await page.locator('nav, header, [role="navigation"]').count() > 0;
    const hasButtons = await page.locator('button').count() > 0;
    const hasLinks = await page.locator('a').count() > 0;
    
    expect(hasNavigation || hasButtons || hasLinks).toBe(true);
    console.log('✅ Page has interactive elements');
  });
  
  test('should handle page navigation without hanging', async ({ page }) => {
    test.setTimeout(10000);
    
    await page.goto(UI_BASE_URL, { timeout: 5000 });
    
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    
    // Try to navigate to different sections if they exist
    const links = await page.locator('a[href^="/"]').all();
    if (links.length > 0) {
      // Click the first internal link
      await links[0].click({ timeout: 2000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      console.log('✅ Page navigation works');
    } else {
      console.log('ℹ️  No internal links found for navigation test');
    }
  });
});