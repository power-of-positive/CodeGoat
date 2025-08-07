import { test, expect } from '@playwright/test';

test.describe('OpenRouter Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForSelector('.bg-white.shadow.rounded-lg.overflow-hidden');
  });

  test('should display uptime information from OpenRouter API', async ({ page }) => {
    // Click on the first model's OpenRouter Statistics button
    const firstModelCard = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first();
    const statsButton = firstModelCard.getByRole('button', { name: /OpenRouter Statistics/i });
    
    await statsButton.click();
    
    // Wait for stats to load
    await page.waitForSelector('.grid.grid-cols-2.gap-4', { timeout: 10000 });
    
    // Currently OpenRouter API returns null uptime, so we should see "Not available"
    const uptimeElement = page.locator('text=Uptime:').locator('..').locator('span.text-slate-400');
    const uptimeText = await uptimeElement.textContent();
    expect(uptimeText).toBe('Not available');
    
    // Check that provider count is displayed
    const providerElement = page.locator('text=Providers:').locator('..').locator('span.font-medium');
    const providerCount = await providerElement.textContent();
    expect(parseInt(providerCount)).toBeGreaterThan(0);
    
    // Check individual provider uptime - should show "N/A" for null values
    const providerUptimeElements = await page.locator('.grid.grid-cols-3').locator('span.text-slate-400').all();
    
    for (const element of providerUptimeElements) {
      const text = await element.textContent();
      // Individual providers should show "N/A" when uptime is null
      expect(text).toBe('N/A');
    }
  });

  test('should handle missing uptime data gracefully', async ({ page }) => {
    // Intercept the OpenRouter stats API call
    await page.route('**/api/management/openrouter-stats/**', async route => {
      const response = await route.fetch();
      const json = await response.json();
      
      // Verify the backend is correctly handling null/missing uptime
      expect(json.endpoints).toBeDefined();
      if (json.endpoints.length > 0) {
        // Check that uptime is null when no data is available from OpenRouter API
        expect(json.endpoints[0].uptime).toBeNull();
      }
      
      await route.fulfill({ response, json });
    });
    
    // Click on OpenRouter Statistics
    const firstModelCard = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first();
    const statsButton = firstModelCard.getByRole('button', { name: /OpenRouter Statistics/i });
    
    await statsButton.click();
    
    // Wait for stats to load
    await page.waitForSelector('.grid.grid-cols-2.gap-4', { timeout: 10000 });
    
    // Should display "Not available" for null uptime values
    const uptimeElement = page.locator('text=Uptime:').locator('..').locator('span.text-slate-400');
    const uptimeText = await uptimeElement.textContent();
    
    // With null values, uptime should show "Not available"
    expect(uptimeText).toBe('Not available');
  });
});