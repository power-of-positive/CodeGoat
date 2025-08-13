import { test, expect } from '@playwright/test';

test.describe('Data TestID Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have data-testid attributes on key UI elements', async ({ page }) => {
    // Verify main navigation elements
    await expect(page.getByTestId('add-model-button')).toBeVisible();
    await expect(page.getByTestId('refresh-models-button')).toBeVisible();
    
    // Verify model list container
    await expect(page.getByTestId('model-list-container')).toBeVisible();
    
    // Verify model cards exist with testids
    const modelCards = page.locator('[data-testid^="model-card-"]');
    await expect(modelCards.first()).toBeVisible();
    
    // Verify model action buttons
    const firstModelCard = modelCards.first();
    const modelId = await firstModelCard.getAttribute('data-testid');
    const extractedId = modelId?.replace('model-card-', '');
    
    if (extractedId) {
      await expect(page.getByTestId(`test-model-${extractedId}`)).toBeVisible();
      await expect(page.getByTestId(`edit-model-${extractedId}`)).toBeVisible();
      await expect(page.getByTestId(`delete-model-${extractedId}`)).toBeVisible();
    }
  });

  test('should have data-testid attributes in add model dialog', async ({ page }) => {
    // Wait for add model button and click it
    const addButton = page.getByTestId('add-model-button');
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Wait for dialog to appear with longer timeout
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    
    // Verify form input testids
    await expect(page.getByTestId('model-name-input')).toBeVisible();
    await expect(page.getByTestId('model-provider-select')).toBeVisible();
    await expect(page.getByTestId('model-model-input')).toBeVisible();
    await expect(page.getByTestId('model-apikey-input')).toBeVisible();
    
    // Verify dialog buttons
    await expect(page.getByTestId('cancel-model-dialog')).toBeVisible();
    await expect(page.getByTestId('submit-model-dialog')).toBeVisible();
    
    // Verify show/hide API key button
    await expect(page.getByTestId('toggle-apikey-visibility')).toBeVisible();
  });

  test('should show base URL input when other provider is selected', async ({ page }) => {
    // Open dialog and select "other" provider
    await page.getByTestId('add-model-button').click();
    
    // Base URL input should not be visible initially
    await expect(page.getByTestId('model-baseurl-input')).not.toBeVisible();
    
    // Select "other" provider
    await page.getByTestId('model-provider-select').click();
    await page.getByRole('option', { name: 'Other' }).click();
    
    // Base URL input should now be visible
    await expect(page.getByTestId('model-baseurl-input')).toBeVisible();
  });

  test('should be able to interact with model using testid selectors', async ({ page }) => {
    // Get first model using testid
    const firstModelCard = page.locator('[data-testid^="model-card-"]').first();
    const modelId = await firstModelCard.getAttribute('data-testid');
    const extractedId = modelId?.replace('model-card-', '');
    
    if (extractedId) {
      // Verify button is initially enabled
      await expect(page.getByTestId(`test-model-${extractedId}`)).toBeEnabled();
      
      // Click test button using testid
      const testButton = page.getByTestId(`test-model-${extractedId}`);
      await testButton.click();
      
      // Button should either show loading state or remain clickable
      // We just verify it's still present and can be interacted with
      await expect(testButton).toBeVisible();
    }
  });
});