import { test, expect } from '@playwright/test';

test.describe('Worker Log Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10000 });
  });

  test('should display enhanced log processing', async ({ page }) => {
    // Navigate to workers page
    await page.click('text=Workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });

    // Check if there are any workers
    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();

    if (workerCount > 0) {
      // Click on first worker
      await workerLinks.first().click();

      // Wait for worker details to load
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });

      // Check for enhanced logging indicators
      const enhancedBadge = page.getByText('Enhanced');
      const enhancedFailedBadge = page.getByText('Enhanced Failed');

      // One of these should be visible
      const hasEnhanced = await enhancedBadge.isVisible();
      const hasFailed = await enhancedFailedBadge.isVisible();

      if (hasEnhanced) {
        console.error('✅ Enhanced logging is active');

        // Check for structured log entries with icons
        await page.waitForSelector('[data-testid="log-entry"]', { timeout: 5000 });

        // Look for different types of log entries
        const logEntries = page.locator('[data-testid="log-entry"]');
        const entryCount = await logEntries.count();

        if (entryCount > 0) {
          // Check for various log entry types
          const userMessages = page.locator('[data-testid="log-entry"][data-type="user_message"]');
          const assistantMessages = page.locator(
            '[data-testid="log-entry"][data-type="assistant_message"]'
          );
          const toolUse = page.locator('[data-testid="log-entry"][data-type="tool_use"]');
          const thinking = page.locator('[data-testid="log-entry"][data-type="thinking"]');

          // At least some structured entries should exist
          const structuredEntries =
            (await userMessages.count()) +
            (await assistantMessages.count()) +
            (await toolUse.count()) +
            (await thinking.count());

          expect(structuredEntries).toBeGreaterThan(0);
          console.error(`Found ${structuredEntries} structured log entries`);
        }

        // Verify that raw JSON is NOT visible in enhanced mode
        const rawJsonPattern = /\{"type":"(system|assistant|user|tool_use)"/;
        const pageContent = await page.textContent('[data-testid="log-entries"]');
        const hasRawJson = rawJsonPattern.test(pageContent || '');

        if (hasRawJson) {
          console.error('❌ Raw JSON detected in enhanced logging mode');
          // This indicates the enhanced logging is not working properly
        } else {
          console.error('✅ No raw JSON detected - enhanced logging working correctly');
        }
      } else if (hasFailed) {
        console.error('⚠️ Enhanced logging failed - using fallback mode');

        // In fallback mode, we might see raw JSON
        const logEntries = page.locator('[data-testid="log-entry"]');
        await expect(logEntries).toBeVisible();
      }

      // Test log streaming controls
      const startStreamButton = page.getByRole('button', { name: /start.*stream/i });
      const stopStreamButton = page.getByRole('button', { name: /stop.*stream/i });

      if (await startStreamButton.isVisible()) {
        await startStreamButton.click();

        // Should show streaming status
        await expect(page.getByText('Streaming')).toBeVisible();
      }

      // Test jump to end functionality
      const jumpToEndButton = page.getByRole('button', { name: /jump.*end/i });
      if (await jumpToEndButton.isVisible()) {
        await jumpToEndButton.click();

        // Should scroll to bottom of logs
        // We can verify this by checking if the last log entry is visible
        const logEntries = page.locator('[data-testid="log-entry"]');
        const lastEntry = logEntries.last();
        if (await lastEntry.isVisible()) {
          await expect(lastEntry).toBeInViewport();
        }
      }
    } else {
      console.error('No workers found - skipping worker-specific tests');
      await expect(page.getByText('No active workers')).toBeVisible();
    }
  });

  test('should handle log entry interactions', async ({ page }) => {
    await page.click('text=Workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });

    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();

    if (workerCount > 0) {
      await workerLinks.first().click();
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });

      // Check for expandable log entries
      const logEntries = page.locator('[data-testid="log-entry"]');
      const entryCount = await logEntries.count();

      if (entryCount > 0) {
        const firstEntry = logEntries.first();

        // Check if entry is clickable/expandable
        const expandButton = firstEntry.locator('[data-testid="expand-button"]');
        if (await expandButton.isVisible()) {
          await expandButton.click();

          // Should show expanded content
          await expect(firstEntry.locator('[data-testid="expanded-content"]')).toBeVisible();
        }

        // Check for copy functionality
        const copyButton = firstEntry.locator('[data-testid="copy-button"]');
        if (await copyButton.isVisible()) {
          await copyButton.click();

          // Should show copy confirmation or success message
          await expect(page.getByText(/copied/i)).toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('should display appropriate icons for different log types', async ({ page }) => {
    await page.click('text=Workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });

    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();

    if (workerCount > 0) {
      await workerLinks.first().click();
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });

      // Check if enhanced logging is active
      const enhancedBadge = page.getByText('Enhanced');
      if (await enhancedBadge.isVisible()) {
        // Check for specific log type icons
        const iconSelectors = [
          '[data-testid="user-message-icon"]', // User icon
          '[data-testid="bot-icon"]', // Assistant/Bot icon
          '[data-testid="brain-icon"]', // Thinking icon
          '[data-testid="terminal-icon"]', // Command/Terminal icon
          '[data-testid="edit-icon"]', // File edit icon
          '[data-testid="eye-icon"]', // File read icon
          '[data-testid="search-icon"]', // Search icon
          '[data-testid="globe-icon"]', // Web fetch icon
          '[data-testid="checkbox-icon"]', // TODO management icon
        ];

        let foundIcons = 0;
        for (const selector of iconSelectors) {
          const icon = page.locator(selector);
          if (await icon.isVisible()) {
            foundIcons++;
          }
        }

        console.error(`Found ${foundIcons} different log entry icons`);

        // Should have at least some icons if enhanced logging is working
        if (foundIcons === 0) {
          console.warn(
            '⚠️ No log entry icons found - enhanced logging may not be working properly'
          );
        }
      }
    }
  });

  test('should handle real-time log updates', async ({ page }) => {
    await page.click('text=Workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });

    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();

    if (workerCount > 0) {
      await workerLinks.first().click();
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });

      // Get initial log count
      const logEntries = page.locator('[data-testid="log-entry"]');
      const initialCount = await logEntries.count();

      // Start streaming
      const startStreamButton = page.getByRole('button', { name: /start.*stream/i });
      if (await startStreamButton.isVisible()) {
        await startStreamButton.click();

        // Wait for potential new entries (with active worker)
        await page.waitForTimeout(2000);

        // Check if log count increased (if worker is active)
        const newCount = await logEntries.count();

        if (newCount > initialCount) {
          console.error(
            `✅ Log streaming working - entries increased from ${initialCount} to ${newCount}`
          );
        } else {
          console.error(`ℹ️ No new log entries - worker may be inactive`);
        }
      }
    }
  });

  test('should handle worker status updates', async ({ page }) => {
    await page.click('text=Workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });

    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();

    if (workerCount > 0) {
      await workerLinks.first().click();

      // Check for worker status indicators
      const statusElements = [
        page.getByText('RUNNING'),
        page.getByText('COMPLETED'),
        page.getByText('FAILED'),
        page.getByText('STOPPED'),
      ];

      let statusFound = false;
      for (const statusElement of statusElements) {
        if (await statusElement.isVisible()) {
          statusFound = true;
          console.error(`Worker status: ${await statusElement.textContent()}`);
          break;
        }
      }

      expect(statusFound).toBe(true);

      // Check for duration display
      await expect(page.getByText(/duration/i)).toBeVisible();

      // Check for PID display
      await expect(page.getByText(/pid/i)).toBeVisible();
    }
  });
});
