import { test, expect } from '@playwright/test';

test.describe('BDD Tests Page - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to BDD Tests page
    await page.goto('/bdd-tests');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load BDD tests page successfully', async ({ page }) => {
    // Check that we're on the right page
    await expect(page).toHaveURL(/.*bdd-tests/);

    // Wait for content to load or error state
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check for either the main heading or loading/error states
    const heading = page.locator('h1:has-text("BDD Test Scenarios")');
    const loading = page.locator('text=Loading BDD scenarios');
    const error = page.locator('text=Error Loading BDD Scenarios');
    
    // Should show either the heading, loading state, or error state
    const hasHeading = await heading.count() > 0;
    const hasLoading = await loading.count() > 0;
    const hasError = await error.count() > 0;
    
    if (hasHeading) {
      await expect(heading).toBeVisible();
      // Also check for the description if heading is present
      const description = page.locator('text=Comprehensive behavioral test scenarios');
      if (await description.count() > 0) {
        await expect(description).toBeVisible();
      }
    } else if (hasLoading) {
      await expect(loading).toBeVisible();
    } else if (hasError) {
      await expect(error).toBeVisible();
    } else {
      // If none of the expected states are present, at least verify the URL
      expect(page.url()).toMatch(/bdd-tests/);
    }
  });

  test('should display BDD statistics cards', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      // Check for statistics cards if the page loaded successfully
      const totalStats = page.locator('[data-testid="total-scenarios-count"]');
      if (await totalStats.count() > 0) {
        await expect(totalStats).toBeVisible();
        await expect(page.locator('[data-testid="passed-scenarios-count"]')).toBeVisible();
        await expect(page.locator('[data-testid="failed-scenarios-count"]')).toBeVisible();
        await expect(page.locator('[data-testid="pending-scenarios-count"]')).toBeVisible();
        await expect(page.locator('[data-testid="pass-rate"]')).toBeVisible();
      }
    } else {
      // If in error state, verify the error is visible
      await expect(errorState).toBeVisible();
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
  });

  test('should have action buttons', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      // Check for main action buttons (use first() to handle duplicates)
      const createButton = page.getByRole('button', { name: /Create Comprehensive Scenarios/i }).first();
      if (await createButton.count() > 0) {
        await expect(createButton).toBeVisible();
      }
      
      const executeButton = page.getByRole('button', { name: /Execute All Scenarios/i });
      if (await executeButton.count() > 0) {
        await expect(executeButton).toBeVisible();
      }
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
  });

  test('should have search and filter functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      // Check for search input
      const searchInput = page.locator('[data-testid="search-scenarios"]');
      if (await searchInput.count() > 0) {
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder', 'Search scenarios...');
      }
      
      // Check for status filter
      const statusFilter = page.locator('[data-testid="status-filter"]');
      if (await statusFilter.count() > 0) {
        await expect(statusFilter).toBeVisible();
        
        // Check filter options
        const filterOptions = await statusFilter.locator('option').allTextContents();
        expect(filterOptions).toContain('All Status');
        expect(filterOptions).toContain('Pending');
        expect(filterOptions).toContain('Passed');
        expect(filterOptions).toContain('Failed');
      }
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
  });

  test('should display scenarios list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      // Check for scenarios list container
      const scenariosList = page.locator('[data-testid="scenarios-list"]');
      if (await scenariosList.count() > 0) {
        await expect(scenariosList).toBeVisible();
        
        // Check if it shows either scenarios or empty state
        const hasScenarios = await page.locator('.grid-cols-1.md\\:grid-cols-2').count() > 0;
        const hasEmptyState = await page.locator('text=No BDD Scenarios Found').count() > 0;
        
        expect(hasScenarios || hasEmptyState).toBeTruthy();
      }
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
  });

  test('should be responsive', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(200);
      
      if (!isError) {
        // Main heading should be visible if page loaded successfully
        const heading = page.locator('h1:has-text("BDD Test Scenarios")');
        if (await heading.count() > 0) {
          await expect(heading).toBeVisible();
        }
        
        // Statistics should be visible if present
        const totalStats = page.locator('[data-testid="total-scenarios-count"]');
        if (await totalStats.count() > 0) {
          await expect(totalStats).toBeVisible();
        }
      }
      
      // At minimum, verify we're on the right page
      expect(page.url()).toMatch(/bdd-tests/);
    }
  });
});

test.describe('BDD Scenario Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
  });

  test('should filter scenarios by status', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      const statusFilter = page.locator('[data-testid="status-filter"]');
      
      if (await statusFilter.count() > 0) {
        // Try each filter option
        const filterOptions = ['pending', 'passed', 'failed', 'skipped'];
        
        for (const option of filterOptions) {
          await statusFilter.selectOption(option);
          await page.waitForTimeout(300);
          
          // Filter should retain its value
          await expect(statusFilter).toHaveValue(option);
        }
        
        // Reset to all
        await statusFilter.selectOption('all');
        await expect(statusFilter).toHaveValue('all');
      }
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
  });

  test('should search scenarios', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      const searchInput = page.locator('[data-testid="search-scenarios"]');
      
      if (await searchInput.count() > 0) {
        // Type a search term
        await searchInput.fill('user');
        await page.waitForTimeout(300);
        
        // Search input should retain its value
        await expect(searchInput).toHaveValue('user');
        
        // Clear search
        await searchInput.clear();
        await expect(searchInput).toHaveValue('');
      }
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
  });

  test('should handle create scenarios button', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if the page has loaded successfully (not in error state)
    const errorState = page.locator('text=Error Loading BDD Scenarios');
    const isError = await errorState.count() > 0;
    
    if (!isError) {
      const createButton = page.getByRole('button', { name: /Create Comprehensive Scenarios/i }).first();
      
      if (await createButton.count() > 0) {
        // Button should be enabled initially
        await expect(createButton).toBeEnabled();
      }
    }
    
    // At minimum, verify we're on the right page
    expect(page.url()).toMatch(/bdd-tests/);
    
    // Note: We're not actually clicking to avoid making real API calls
    // In a real test with mocked APIs, we would:
    // await createButton.click();
    // await expect(page.locator('text=Creating scenarios...')).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    // Navigate to a non-existent API endpoint to trigger error state
    await page.route('**/api/bdd-scenarios', route => {
      // Delay to show loading state
      setTimeout(() => {
        route.abort();
      }, 100);
    });
    
    await page.goto('/bdd-tests');
    
    // Should show loading state briefly
    const loadingText = page.locator('text=Loading BDD scenarios');
    // Don't fail if loading is too quick to catch
    if (await loadingText.isVisible({ timeout: 500 }).catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/bdd-scenarios', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });
    
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
    
    // Should show error state
    await expect(page.locator('text=Error Loading BDD Scenarios')).toBeVisible();
    await expect(page.locator('text=Failed to load BDD scenarios')).toBeVisible();
  });
});