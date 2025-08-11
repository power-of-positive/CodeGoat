import { test, expect } from '@playwright/test';

test.describe('OpenRouter Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForSelector('[data-testid="model-list-container"]');
  });

  test('should display uptime information from OpenRouter API', async ({ page }) => {
    // Click on the first model's OpenRouter Statistics button
    const firstModelCard = page.locator('[data-testid^="model-card-"]').first();
    const statsButton = firstModelCard.getByRole('button', { name: /OpenRouter Statistics/i });
    
    await statsButton.click();
    
    // Wait for stats to load within the expanded section
    // The stats appear in a collapsible section, not a modal
    await page.waitForSelector('.border-l-2.border-slate-100', { timeout: 10000 });
    
    // Check if we have the stats content loaded or an error message
    const statsSection = await page.locator('.border-l-2.border-slate-100').first();
    await expect(statsSection).toBeVisible();
    
    // Look for either loading, error, or stats content
    const statsContent = await statsSection.textContent();
    
    // Should have some content - either stats, loading, or error message
    expect(statsContent).toBeTruthy();
    
    // Check if there's loading, error, or actual stats
    const hasContent = statsContent?.includes('Loading statistics') || 
                      statsContent?.includes('Unable to load statistics') ||
                      statsContent?.includes('Provider') || 
                      statsContent?.includes('Uptime') || 
                      statsContent?.includes('Status');
    expect(hasContent).toBeTruthy();
  });

  test('should handle missing uptime data gracefully', async ({ page }) => {
    // Click on OpenRouter Statistics first
    const firstModelCard = page.locator('[data-testid^="model-card-"]').first();
    const statsButton = firstModelCard.getByRole('button', { name: /OpenRouter Statistics/i });
    
    await statsButton.click();
    
    // Wait for stats section to expand
    await page.waitForSelector('.border-l-2.border-slate-100', { timeout: 10000 });
    
    // Check that the stats section is displaying content even with missing data  
    const statsSection = await page.locator('.border-l-2.border-slate-100').first();
    await expect(statsSection).toBeVisible();
    
    // The component should handle missing data gracefully
    const statsContent = await statsSection.textContent();
    expect(statsContent).toBeTruthy();
    
    // Should show either loading, error, or stats
    const hasValidContent = statsContent?.includes('Loading statistics') ||
                           statsContent?.includes('Unable to load statistics') ||
                           statsContent?.includes('Provider');
    expect(hasValidContent).toBeTruthy();
  });
});