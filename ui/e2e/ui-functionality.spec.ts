import { test, expect } from '@playwright/test';

test.describe('UI Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display models from config file', async ({ page }) => {
    // Wait for the model list container to be visible
    await expect(page.locator('.bg-white.shadow.rounded-lg.overflow-hidden')).toBeVisible();
    
    // Check that we have models displayed
    const modelCards = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div');
    await expect(modelCards).toHaveCount(8); // We have 8 models in config.yaml

    // Check first model details - be more specific to avoid duplicates
    await expect(page.getByRole('heading', { name: 'kimi-k2:free' })).toBeVisible();
    await expect(page.getByText('openrouter/moonshotai/kimi-k2:free').first()).toBeVisible();
    
    // Check for buttons on each model
    const firstModelCard = modelCards.first();
    await expect(firstModelCard.getByRole('button', { name: /test/i })).toBeVisible();
    await expect(firstModelCard.getByRole('button', { name: /edit/i })).toBeVisible();
    await expect(firstModelCard.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should show server status', async ({ page }) => {
    // Check server status section exists
    await expect(page.getByText('Server Status')).toBeVisible();
    
    // Check that status section contains some status indicators (simplified)
    const statusSection = page.locator('h2:has-text("Server Status")').locator('..').locator('..');
    await expect(statusSection).toBeVisible();
  });

  test('should open add model dialog', async ({ page }) => {
    // Click Add Model button
    await page.getByRole('button', { name: /add model/i }).click();
    
    // Check dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Model')).toBeVisible();
    
    // Check form fields
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Model' })).toBeVisible();
    await expect(page.getByLabel('API Key')).toBeVisible();
    
    // Base URL should only be visible when 'other' provider is selected
    await expect(page.getByLabel('Base URL')).not.toBeVisible();
    
    // Select 'other' provider to see Base URL field
    await page.getByLabel('Provider').selectOption('other');
    await expect(page.getByLabel('Base URL')).toBeVisible();
  });

  test('should refresh model list', async ({ page }) => {
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/management/models') && response.status() === 200
    );
    
    // Click refresh button
    await page.getByRole('button', { name: /refresh/i }).click();
    
    // Wait for API call
    await responsePromise;
  });

  test('should maintain UI state after refresh', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('.bg-white.shadow.rounded-lg.overflow-hidden');
    
    // Count initial models
    const initialCount = await page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').count();
    expect(initialCount).toBe(8);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Count should be the same
    const afterRefreshCount = await page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').count();
    expect(afterRefreshCount).toBe(initialCount);
  });
});