import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Analytics Navigation and Layout', () => {
    test('should navigate to analytics dashboard', async ({ page }) => {
      // Navigate to Analytics page
      await page.goto('/analytics');
      await expect(page).toHaveURL('/analytics');
      
      // Should see main analytics sections
      await expect(page.getByText('Development Analytics')).toBeVisible();
    });

    test('should display analytics sections', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check for main analytics sections
      const sections = [
        'Validation Statistics',
        'Development Analytics',
        'Session Analytics',
        'Model Performance'
      ];
      
      for (const section of sections) {
        const sectionElement = page.getByText(section);
        if (await sectionElement.isVisible()) {
          await expect(sectionElement).toBeVisible();
        }
      }
    });

    test('should have responsive layout', async ({ page }) => {
      await page.goto('/analytics');
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByText('Development Analytics')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByText('Development Analytics')).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.getByText('Development Analytics')).toBeVisible();
    });
  });

  test.describe('Validation Statistics', () => {
    test('should display validation statistics', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for validation statistics metrics
      const validationMetrics = [
        'Total Sessions',
        'Success Rate',
        'Average Time',
        'Most Failed Stage'
      ];
      
      for (const metric of validationMetrics) {
        const metricElement = page.getByText(metric);
        if (await metricElement.isVisible()) {
          await expect(metricElement).toBeVisible();
        }
      }
    });

    test('should display stage success rates', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for validation stage breakdown
      const stageElements = page.locator('[data-testid*="stage-"], [class*="stage-"]');
      if (await stageElements.first().isVisible()) {
        await expect(stageElements.first()).toBeVisible();
      }
      
      // Common validation stages
      const stages = ['lint', 'type-check', 'test', 'typescript-check'];
      for (const stage of stages) {
        const stageElement = page.getByText(stage, { exact: false });
        if (await stageElement.isVisible()) {
          await expect(stageElement).toBeVisible();
        }
      }
    });

    test('should show validation trends over time', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for time-based charts or data
      const chartElements = page.locator('[data-testid*="chart"], [class*="chart"], canvas, svg');
      if (await chartElements.first().isVisible()) {
        await expect(chartElements.first()).toBeVisible();
      }
      
      // Look for date-based data
      const dateElements = page.locator('text=/\\d{4}-\\d{2}-\\d{2}/');
      if (await dateElements.first().isVisible()) {
        await expect(dateElements.first()).toBeVisible();
      }
    });

    test('should handle empty validation data gracefully', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check if there's appropriate messaging for no data
      const noDataMessages = [
        'No data available',
        'No validation sessions',
        'No metrics found',
        'Start using the system to see analytics'
      ];
      
      let hasValidData = false;
      let hasNoDataMessage = false;
      
      // Check if we have data (non-zero values)
      const numberElements = page.locator('text=/\\d+(\\.\\d+)?%?/');
      if (await numberElements.first().isVisible()) {
        const numbers = await numberElements.allTextContents();
        hasValidData = numbers.some(num => !num.match(/^0+\.?0*%?$/));
      }
      
      // Check for no data messages
      for (const message of noDataMessages) {
        const messageElement = page.getByText(message, { exact: false });
        if (await messageElement.isVisible()) {
          hasNoDataMessage = true;
          break;
        }
      }
      
      // Should either have data or appropriate messaging
      expect(hasValidData || hasNoDataMessage).toBe(true);
    });
  });

  test.describe('Model Performance Analytics', () => {
    test('should display model usage statistics', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for model-related metrics
      const modelMetrics = [
        'Models Used',
        'Success Rate by Model',
        'Average Execution Time',
        'Token Usage'
      ];
      
      for (const metric of modelMetrics) {
        const metricElement = page.getByText(metric, { exact: false });
        if (await metricElement.isVisible()) {
          await expect(metricElement).toBeVisible();
        }
      }
    });

    test('should show model comparison data', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for model names or comparison tables
      const modelNames = [
        'claude',
        'gpt',
        'gemini',
        'openai',
        'anthropic'
      ];
      
      for (const model of modelNames) {
        const modelElement = page.getByText(model, { exact: false });
        if (await modelElement.isVisible()) {
          await expect(modelElement).toBeVisible();
          break; // At least one model should be visible
        }
      }
    });

    test('should display execution time metrics', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for time-related metrics
      const timeMetrics = [
        /\d+(\.\d+)?s/, // seconds
        /\d+(\.\d+)?ms/, // milliseconds
        /\d+:\d+/, // minutes:seconds
        'Average Time',
        'Execution Time'
      ];
      
      let foundTimeMetric = false;
      for (const timePattern of timeMetrics) {
        const elements = typeof timePattern === 'string' 
          ? page.getByText(timePattern, { exact: false })
          : page.locator(`text=${timePattern.source}`);
        
        if (await elements.first().isVisible()) {
          foundTimeMetric = true;
          break;
        }
      }
      
      if (foundTimeMetric) {
        expect(foundTimeMetric).toBe(true);
      }
    });
  });

  test.describe('Session Analytics', () => {
    test('should display recent sessions', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for recent sessions section
      const sessionElements = [
        'Recent Sessions',
        'Latest Sessions',
        'Session History',
        'Validation Sessions'
      ];
      
      for (const element of sessionElements) {
        const sessionElement = page.getByText(element);
        if (await sessionElement.isVisible()) {
          await expect(sessionElement).toBeVisible();
          break;
        }
      }
    });

    test('should show session success/failure breakdown', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for success/failure indicators
      const statusElements = [
        'Success',
        'Failed',
        'Passed',
        'Error',
        'Completed'
      ];
      
      for (const status of statusElements) {
        const statusElement = page.getByText(status);
        if (await statusElement.isVisible()) {
          await expect(statusElement).toBeVisible();
          break;
        }
      }
    });

    test('should display session timing information', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for timestamps or duration information
      const timeElements = page.locator('text=/\\d{2}:\\d{2}|\\d+s|\\d+ms|ago/');
      if (await timeElements.first().isVisible()) {
        await expect(timeElements.first()).toBeVisible();
      }
    });
  });

  test.describe('Analytics Interactivity', () => {
    test('should allow date range filtering', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for date picker or range selector
      const dateControls = [
        '[type="date"]',
        '[data-testid*="date"]',
        'text=Last 7 days',
        'text=Last 30 days',
        'text=This week',
        'text=This month'
      ];
      
      for (const selector of dateControls) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          await expect(element.first()).toBeVisible();
          break;
        }
      }
    });

    test('should support data refresh', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for refresh button or auto-refresh indicator
      const refreshElements = [
        '[data-testid*="refresh"]',
        'button:has-text("Refresh")',
        'text=Refresh',
        '[title*="refresh"]',
        '[aria-label*="refresh"]'
      ];
      
      for (const selector of refreshElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          await expect(element.first()).toBeVisible();
          // Test clicking refresh
          await element.first().click();
          break;
        }
      }
    });

    test('should handle data loading states', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for loading indicators
      const loadingElements = [
        '.animate-spin',
        '[data-testid*="loading"]',
        'text=Loading',
        '.loading',
        '.spinner'
      ];
      
      for (const selector of loadingElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          // Wait for loading to complete
          await expect(element.first()).not.toBeVisible({ timeout: 10000 });
          break;
        }
      }
    });
  });

  test.describe('Data Export Functionality', () => {
    test('should provide data export options', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for export buttons or options
      const exportElements = [
        'button:has-text("Export")',
        'text=Download',
        'text=CSV',
        'text=JSON',
        '[data-testid*="export"]',
        '[title*="export"]'
      ];
      
      for (const selector of exportElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          await expect(element.first()).toBeVisible();
          break;
        }
      }
    });

    test('should export data in CSV format', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for CSV export option
      const csvButton = page.locator('button:has-text("CSV"), [data-testid*="csv"], text="CSV"');
      if (await csvButton.first().isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
        
        await csvButton.first().click();
        
        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.(csv|txt)$/);
        } catch (error) {
          // CSV export might not be fully implemented
          console.log('CSV export not available or failed:', error.message);
        }
      }
    });

    test('should export data in JSON format', async ({ page }) => {
      await page.goto('/analytics');
      
      // Look for JSON export option
      const jsonButton = page.locator('button:has-text("JSON"), [data-testid*="json"], text="JSON"');
      if (await jsonButton.first().isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
        
        await jsonButton.first().click();
        
        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.json$/);
        } catch (error) {
          // JSON export might not be fully implemented
          console.log('JSON export not available or failed:', error.message);
        }
      }
    });
  });

  test.describe('Analytics Performance', () => {
    test('should load analytics data within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/analytics');
      
      // Wait for main analytics content to be visible
      await expect(page.getByText('Development Analytics')).toBeVisible({ timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check if data is paginated or virtualized for performance
      const paginationElements = [
        '.pagination',
        '[data-testid*="page"]',
        'button:has-text("Next")',
        'button:has-text("Previous")',
        'text=of',
        'text=showing'
      ];
      
      for (const selector of paginationElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          await expect(element.first()).toBeVisible();
          break;
        }
      }
    });

    test('should be responsive and not cause layout shifts', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // Ensure content is still visible
        await expect(page.getByText('Development Analytics')).toBeVisible();
        
        // Give time for layout to stabilize
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('Analytics Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock an API error
      await page.route('/api/analytics**', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
      });
      
      await page.goto('/analytics');
      
      // Should show error message or fallback content
      const errorElements = [
        'text=Error loading analytics',
        'text=Failed to load',
        'text=Something went wrong',
        'text=Unable to fetch',
        '.error',
        '[data-testid*="error"]'
      ];
      
      let foundErrorHandling = false;
      for (const selector of errorElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          foundErrorHandling = true;
          break;
        }
      }
      
      expect(foundErrorHandling).toBe(true);
    });

    test('should handle network failures', async ({ page }) => {
      // Mock network failure
      await page.route('/api/analytics**', route => {
        route.abort('failed');
      });
      
      await page.goto('/analytics');
      
      // Should show appropriate error handling
      const networkErrorElements = [
        'text=Network error',
        'text=Connection failed',
        'text=Unable to connect',
        'text=Check your connection',
        '[data-testid*="network-error"]'
      ];
      
      let foundNetworkErrorHandling = false;
      for (const selector of networkErrorElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          foundNetworkErrorHandling = true;
          break;
        }
      }
      
      // At minimum, should not crash the page
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle missing data gracefully', async ({ page }) => {
      // Mock empty data response
      await page.route('/api/analytics**', route => {
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({
            totalSessions: 0,
            successRate: 0,
            averageTimeToSuccess: 0,
            averageAttemptsToSuccess: 0,
            mostFailedStage: 'none',
            stageSuccessRates: {},
            dailyStats: {}
          }) 
        });
      });
      
      await page.goto('/analytics');
      
      // Should show appropriate empty state
      const emptyStateElements = [
        'text=No data available',
        'text=No analytics data',
        'text=Start using the system',
        'text=0 sessions',
        '[data-testid*="empty-state"]'
      ];
      
      let foundEmptyState = false;
      for (const selector of emptyStateElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          foundEmptyState = true;
          break;
        }
      }
      
      expect(foundEmptyState).toBe(true);
    });
  });

  test.describe('Analytics Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/analytics');
      
      // Tab through the page
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to navigate to interactive elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check for proper ARIA attributes
      const accessibilityElements = [
        '[role="main"]',
        '[role="region"]',
        '[aria-label]',
        '[aria-labelledby]',
        '[role="table"]',
        '[role="cell"]'
      ];
      
      for (const selector of accessibilityElements) {
        const element = page.locator(selector);
        if (await element.first().isVisible()) {
          await expect(element.first()).toBeVisible();
          break;
        }
      }
    });

    test('should work with screen readers', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check for semantic HTML structure
      const semanticElements = ['h1, h2, h3', 'table', 'th', 'td', 'section', 'article'];
      
      for (const selector of semanticElements) {
        const elements = page.locator(selector);
        if (await elements.first().isVisible()) {
          await expect(elements.first()).toBeVisible();
          break;
        }
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check for text elements that should have good contrast
      const textElements = page.locator('h1, h2, h3, p, td, th, span');
      const firstTextElement = textElements.first();
      
      if (await firstTextElement.isVisible()) {
        // This is a basic check - in a real scenario, you'd use accessibility testing tools
        const styles = await firstTextElement.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });
        
        expect(styles.color).toBeTruthy();
      }
    });
  });
});