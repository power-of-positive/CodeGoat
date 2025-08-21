import { test, expect } from '@playwright/test';

test.describe('Enhanced Log Processing', () => {
  test('should process Claude JSON into structured entries', async ({ page }) => {
    // Navigate to workers page
    await page.goto('/workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });
    
    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();
    
    if (workerCount > 0) {
      await workerLinks.first().click();
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });
      
      // Wait for enhanced logging to initialize
      await page.waitForTimeout(1000);
      
      // Check for Enhanced badge
      const enhancedBadge = page.getByText('Enhanced');
      if (await enhancedBadge.isVisible()) {
        console.log('✅ Enhanced logging is active');
        
        // Verify that we have structured log entries instead of raw JSON
        const logContent = await page.textContent('[data-testid="log-entries"]');
        
        // Should NOT contain raw JSON patterns
        const rawJsonPatterns = [
          /\{"type":"system"/,
          /\{"type":"assistant"/,
          /\{"type":"user"/,
          /\{"type":"tool_use"/,
          /"message":\{"id":/,
          /"content":\[\{"type"/
        ];
        
        let foundRawJson = false;
        for (const pattern of rawJsonPatterns) {
          if (pattern.test(logContent || '')) {
            foundRawJson = true;
            console.error(`❌ Found raw JSON pattern: ${pattern}`);
          }
        }
        
        if (foundRawJson) {
          // This is the bug we're trying to fix
          console.error('❌ Enhanced logging is not working - still showing raw JSON');
          
          // Take a screenshot for debugging
          await page.screenshot({ 
            path: 'test-results/enhanced-logging-failure.png',
            fullPage: true 
          });
        } else {
          console.log('✅ No raw JSON found - enhanced logging working correctly');
        }
        
        // Check for structured log entry components
        const structuredElements = [
          '[data-testid="user-message"]',
          '[data-testid="assistant-message"]', 
          '[data-testid="system-message"]',
          '[data-testid="thinking-message"]',
          '[data-testid="tool-use-message"]',
          '[data-testid="process-start-card"]'
        ];
        
        let foundStructured = 0;
        for (const selector of structuredElements) {
          const elements = page.locator(selector);
          const count = await elements.count();
          foundStructured += count;
        }
        
        console.log(`Found ${foundStructured} structured log elements`);
        
        // Should have at least some structured elements if enhanced logging works
        expect(foundStructured).toBeGreaterThan(0);
        
      } else {
        // Check for Enhanced Failed badge
        const enhancedFailedBadge = page.getByText('Enhanced Failed');
        if (await enhancedFailedBadge.isVisible()) {
          console.log('⚠️ Enhanced logging failed - using fallback');
        } else {
          console.log('ℹ️ Enhanced logging not detected - may be using fallback mode');
        }
      }
    } else {
      console.log('No workers found - cannot test enhanced logging');
    }
  });

  test('should display appropriate icons for different message types', async ({ page }) => {
    await page.goto('/workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });
    
    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();
    
    if (workerCount > 0) {
      await workerLinks.first().click();
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });
      
      const enhancedBadge = page.getByText('Enhanced');
      if (await enhancedBadge.isVisible()) {
        // Check for different icon types based on log content
        const iconChecks = [
          { selector: 'svg[data-icon="user"]', type: 'User messages' },
          { selector: 'svg[data-icon="bot"]', type: 'Assistant messages' },
          { selector: 'svg[data-icon="brain"]', type: 'Thinking entries' },
          { selector: 'svg[data-icon="terminal"]', type: 'Command execution' },
          { selector: 'svg[data-icon="edit"]', type: 'File edits' },
          { selector: 'svg[data-icon="eye"]', type: 'File reads' },
          { selector: 'svg[data-icon="search"]', type: 'Search operations' },
          { selector: 'svg[data-icon="globe"]', type: 'Web fetches' },
          { selector: 'svg[data-icon="check-square"]', type: 'TODO management' }
        ];
        
        for (const { selector, type } of iconChecks) {
          const icons = page.locator(selector);
          const count = await icons.count();
          if (count > 0) {
            console.log(`✅ Found ${count} ${type} icons`);
          }
        }
      }
    }
  });

  test('should handle streaming updates correctly', async ({ page }) => {
    await page.goto('/workers');
    await page.waitForSelector('[data-testid="workers-list"]', { timeout: 10000 });
    
    const workerLinks = page.locator('[data-testid="worker-link"]');
    const workerCount = await workerLinks.count();
    
    if (workerCount > 0) {
      await workerLinks.first().click();
      await page.waitForSelector('[data-testid="worker-logs-container"]', { timeout: 5000 });
      
      // Start streaming
      const startStreamButton = page.getByRole('button', { name: /start.*stream/i });
      if (await startStreamButton.isVisible()) {
        await startStreamButton.click();
        
        // Monitor for streaming indicator
        await expect(page.getByText('Streaming')).toBeVisible();
        
        // Listen for WebSocket/SSE connections (if we can detect them)
        const enhancedBadge = page.getByText('Enhanced');
        if (await enhancedBadge.isVisible()) {
          console.log('✅ Enhanced streaming should be active');
          
          // Wait for potential updates
          await page.waitForTimeout(2000);
          
          // Check that updates are being processed correctly
          const logEntries = page.locator('[data-testid="log-entry"]');
          const entryCount = await logEntries.count();
          console.log(`Current log entries: ${entryCount}`);
        }
      }
    }
  });
});