import { test, expect } from '@playwright/test';

test('debug tasks page', async ({ page }) => {
  await page.goto('/tasks');
  await page.waitForTimeout(2000); // Wait a bit for page to load

  // Take screenshot
  await page.screenshot({ path: 'tasks-page.png' });

  // Get page content
  const content = await page.content();
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());

  // Check for specific elements
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('Headings found:', headings);

  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons);

  // Check body for text
  const bodyText = await page.locator('body').textContent();
  console.log('Body contains "Tasks"?', bodyText?.includes('Tasks'));
  console.log('Body contains "Loading"?', bodyText?.includes('Loading'));
  console.log('Body contains "No Tasks"?', bodyText?.includes('No Tasks'));
});
