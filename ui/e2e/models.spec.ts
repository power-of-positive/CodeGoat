import { test, expect } from '@playwright/test';

test.describe('Model Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial API calls to complete
    await page.waitForLoadState('networkidle');
  });

  test('should display models from config file', async ({ page }) => {
    // Wait for the model list container to be visible
    await expect(page.locator('.bg-white.shadow.rounded-lg.overflow-hidden')).toBeVisible();
    
    // Check that we have models displayed - each model is in a div with p-6 class
    const modelCards = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div');
    await expect(modelCards).toHaveCount(7); // We have 7 models in config.yaml

    // Check first model details
    await expect(page.getByText('kimi-k2:free')).toBeVisible();
    await expect(page.getByText('openrouter/moonshotai/kimi-k2:free')).toBeVisible();
    
    // Check for buttons on each model
    const firstModelCard = modelCards.first();
    await expect(firstModelCard.getByRole('button', { name: /test/i })).toBeVisible();
    await expect(firstModelCard.getByRole('button', { name: /edit/i })).toBeVisible();
    await expect(firstModelCard.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should show server status', async ({ page }) => {
    // Check server status section
    await expect(page.getByText('Server Status')).toBeVisible();
    await expect(page.getByText('Healthy')).toBeVisible();
    await expect(page.getByText('Models:')).toBeVisible();
    await expect(page.getByText('Active:')).toBeVisible();
  });

  test('should test model connectivity', async ({ page }) => {
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/management/test/0') && response.status() === 200
    );
    
    // Click test button on first model
    const firstTestButton = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first()
      .getByRole('button', { name: /test/i });
    
    await firstTestButton.click();
    
    // Wait for API response
    await responsePromise;
  });

  test('should open add model dialog', async ({ page }) => {
    // Click Add Model button
    await page.getByRole('button', { name: /add model/i }).click();
    
    // Check dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Model')).toBeVisible();
    
    // Check form fields
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Base URL')).toBeVisible();
    await expect(page.getByLabel('Model')).toBeVisible();
    await expect(page.getByLabel('API Key')).toBeVisible();
  });

  test('should handle model deletion', async ({ page }) => {
    // Mock the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/management/models/0') && 
      response.request().method() === 'DELETE'
    );
    
    // Click delete on first model
    const firstDeleteButton = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first()
      .getByRole('button', { name: /delete/i });
    
    await firstDeleteButton.click();
    
    // Wait for API response
    await responsePromise;
  });

  test('should refresh model list', async ({ page }) => {
    // Set up response listeners before clicking
    const modelsResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/management/models') && response.status() === 200
    );
    const statusResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/management/status') && response.status() === 200
    );
    
    // Click refresh button
    await page.getByRole('button', { name: /refresh/i }).click();
    
    // Wait for API calls
    await Promise.all([modelsResponsePromise, statusResponsePromise]);
  });
});