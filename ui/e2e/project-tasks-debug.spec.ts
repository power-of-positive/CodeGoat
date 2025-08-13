import { test, expect } from '@playwright/test';

test.describe('Project Tasks Debug', () => {
  test('debug project tasks navigation', async ({ page }) => {
    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    // Navigate to projects page first
    await page.goto('/projects');
    await page.waitForTimeout(2000);
    
    console.log('=== Projects Page Analysis ===');
    
    // Check what project cards exist
    const projectCards = await page.locator('[data-testid="project-card"], .grid > div').count();
    console.log(`Found ${projectCards} project cards`);
    
    if (projectCards > 0) {
      // Get the text content of the first project card
      const firstCard = page.locator('.grid > div').first();
      const cardContent = await firstCard.textContent();
      console.log('First card content:', cardContent);
      
      // Check for any data attributes
      const cardHtml = await firstCard.innerHTML();
      console.log('First card HTML structure:', cardHtml.substring(0, 200));
      
      // Try clicking the first project card
      console.log('Attempting to click first project card...');
      await firstCard.click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      console.log('Current URL after click:', page.url());
      
      // Check page content
      const bodyText = await page.textContent('body');
      console.log('Page content after navigation:', bodyText?.substring(0, 500));
    }
    
    // Log all console messages
    console.log('\\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Log all page errors
    console.log('\\n=== Page Errors ===');
    pageErrors.forEach(error => console.log(error));
    
    // Expect at least no errors
    expect(pageErrors.length).toBe(0);
  });
  
  test('direct navigation to project tasks', async ({ page }) => {
    // Capture errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    // Try direct navigation to a project tasks URL
    console.log('=== Direct Navigation Test ===');
    
    // Try navigating directly to project tasks URL
    await page.goto('/projects/test/tasks');
    await page.waitForTimeout(3000);
    
    console.log('URL after direct navigation:', page.url());
    
    // Check page content
    const bodyText = await page.textContent('body');
    console.log('Page content:', bodyText?.substring(0, 500));
    
    // Check for any error indicators
    const errorElements = await page.locator('.text-destructive, [class*="error"]').count();
    console.log('Error elements found:', errorElements);
    
    // Log page errors
    console.log('\\n=== Page Errors ===');
    pageErrors.forEach(error => console.log(error));
    
    // Should navigate without critical errors
    expect(pageErrors.length).toBe(0);
  });
});