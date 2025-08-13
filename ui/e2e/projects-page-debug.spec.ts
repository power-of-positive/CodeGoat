import { test, expect } from '@playwright/test';

test.describe('Projects Page Debug', () => {
  test('capture console errors', async ({ page }) => {
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
    
    // Navigate to projects page
    await page.goto('/projects');
    
    // Wait a bit for errors to appear
    await page.waitForTimeout(2000);
    
    // Log all console messages
    console.log('=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Log all page errors
    console.log('\n=== Page Errors ===');
    pageErrors.forEach(error => console.log(error));
    
    // Check if page has any content
    const bodyText = await page.textContent('body');
    console.log('\n=== Page Content ===');
    console.log(bodyText?.substring(0, 200) || 'No content');
    
    // Try to find the root element
    const rootElement = await page.$('#root');
    if (rootElement) {
      const rootContent = await rootElement.textContent();
      console.log('\n=== Root Element Content ===');
      console.log(rootContent?.substring(0, 200) || 'Root element empty');
    } else {
      console.log('\n=== Root Element ===');
      console.log('Root element not found');
    }
    
    // Expect at least no errors
    expect(pageErrors.length).toBe(0);
  });
});