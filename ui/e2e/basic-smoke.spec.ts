import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  test('playwright can create a basic page', async ({ page }) => {
    // Create a simple HTML page in memory - no server required
    await page.setContent(`
      <html>
        <head><title>E2E Test</title></head>
        <body>
          <div id="root">
            <h1>Test Page</h1>
            <p>This is a basic test to verify Playwright is working</p>
          </div>
        </body>
      </html>
    `);

    // Verify basic functionality
    await expect(page).toHaveTitle('E2E Test');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Test Page');
    await expect(page.locator('p')).toContainText('This is a basic test');
  });

  test('playwright can interact with DOM elements', async ({ page }) => {
    // Create interactive content
    await page.setContent(`
      <html>
        <body>
          <button id="test-button">Click me</button>
          <div id="output">Not clicked</div>
          <script>
            document.getElementById('test-button').addEventListener('click', () => {
              document.getElementById('output').textContent = 'Clicked!';
            });
          </script>
        </body>
      </html>
    `);

    // Test interaction
    await expect(page.locator('#output')).toContainText('Not clicked');
    await page.click('#test-button');
    await expect(page.locator('#output')).toContainText('Clicked!');
  });

  test('playwright environment is properly configured', async ({ page, browserName }) => {
    // Just verify we can access browser info and create page
    expect(browserName).toBeTruthy();
    expect(page).toBeTruthy();
    
    await page.setContent('<html><body><h1>Config Test</h1></body></html>');
    await expect(page.locator('h1')).toContainText('Config Test');
  });
});