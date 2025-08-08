import { test, expect } from '@playwright/test';

test.describe('UI Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display models from config file', async ({ page }) => {
    // Wait for the model list container to be visible
    await expect(page.locator('[data-testid="model-list-container"]')).toBeVisible();
    
    // Check that we have models displayed
    const modelCards = page.locator('[data-testid^="model-card-"]');
    await expect(modelCards).toHaveCount(8); // We have 8 models in config.default.yaml

    // Check first model details - be more specific to avoid duplicates
    await expect(page.getByRole('heading', { name: 'kimi-k2:free' })).toBeVisible();
    await expect(page.getByText('openrouter/moonshotai/kimi-k2:free').first()).toBeVisible();
    
    // Check for buttons on each model
    const firstModelCard = modelCards.first();
    await expect(firstModelCard.getByRole('button', { name: /test/i })).toBeVisible();
    await expect(firstModelCard.getByRole('button', { name: /edit/i })).toBeVisible();
    await expect(firstModelCard.getByRole('button', { name: /delete/i })).toBeVisible();
  });


  test('should open add model dialog', async ({ page }) => {
    // Click Add Model button
    await page.getByRole('button', { name: /add model/i }).click();
    
    // Check dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Model')).toBeVisible();
    
    // Check form fields using data-testid selectors
    await expect(page.getByTestId('model-name-input')).toBeVisible();
    await expect(page.getByTestId('model-model-input')).toBeVisible();
    await expect(page.getByTestId('model-apikey-input')).toBeVisible();
    
    // Base URL should only be visible when 'other' provider is selected
    await expect(page.getByTestId('model-baseurl-input')).not.toBeVisible();
    
    // Select 'other' provider to see Base URL field
    // Click the select trigger to open the dropdown
    await page.getByTestId('model-provider-select').click();
    // Click the 'Other' option
    await page.getByRole('option', { name: 'Other' }).click();
    await expect(page.getByTestId('model-baseurl-input')).toBeVisible();
  });

  test('should refresh model list', async ({ page }) => {
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/models') && response.status() === 200
    );
    
    // Click refresh button
    await page.getByRole('button', { name: /refresh/i }).click();
    
    // Wait for API call
    await responsePromise;
  });

  test('should maintain UI state after refresh', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="model-list-container"]');
    
    // Count initial models (may be more than 8 if previous tests added user models)
    const initialCount = await page.locator('[data-testid^="model-card-"]').count();
    expect(initialCount).toBeGreaterThanOrEqual(8); // At least 8 default models
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Count should be the same after refresh
    const afterRefreshCount = await page.locator('[data-testid^="model-card-"]').count();
    expect(afterRefreshCount).toBe(initialCount);
  });
});