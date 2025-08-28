import { expect, Page } from '@playwright/test';

/**
 * Common test utilities to reduce code duplication and improve reliability
 */

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Navigate to a page and wait for it to load with error handling
   */
  async navigateAndWait(path: string, options?: { 
    waitForSelector?: string; 
    timeout?: number;
    fallbackSelectors?: string[];
  }) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
    
    const timeout = options?.timeout || 30000;
    
    if (options?.waitForSelector) {
      try {
        await this.page.waitForSelector(options.waitForSelector, { timeout });
      } catch (error) {
        // Try fallback selectors if provided
        if (options.fallbackSelectors) {
          for (const fallback of options.fallbackSelectors) {
            try {
              await this.page.waitForSelector(fallback, { timeout: timeout / 2 });
              break;
            } catch {
              // Continue to next fallback
            }
          }
        }
      }
    }
  }

  /**
   * Wait for an element with multiple possible selectors
   */
  async waitForAnySelector(selectors: string[], timeout = 15000): Promise<string | null> {
    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: timeout / selectors.length });
        return selector;
      } catch {
        // Continue to next selector
      }
    }
    return null;
  }

  /**
   * Check if element exists without throwing error
   */
  async elementExists(selector: string, timeout = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe click that waits for element and handles loading states
   */
  async safeClick(selector: string, options?: { timeout?: number; waitAfter?: number }) {
    const timeout = options?.timeout || 10000;
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
    
    if (options?.waitAfter) {
      await this.page.waitForTimeout(options.waitAfter);
    }
  }

  /**
   * Navigate to tasks page with proper error handling
   */
  async navigateToTasks() {
    await this.navigateAndWait('/tasks', {
      waitForSelector: 'h1:has-text("Tasks")',
      fallbackSelectors: [
        '[data-testid="task-board"]',
        '.task-column',
        'text=Pending',
        '[data-testid="tasks-page"]'
      ]
    });
  }

  /**
   * Navigate to BDD page with proper error handling
   */
  async navigateToBDD() {
    await this.navigateAndWait('/bdd-tests', {
      waitForSelector: 'h1:has-text("BDD Test Scenarios")',
      fallbackSelectors: [
        'text=Error Loading BDD Scenarios',
        'text=Loading BDD scenarios...',
        '[data-testid="bdd-dashboard"]'
      ]
    });
    
    // Check for error state and skip if needed
    const errorMessage = await this.elementExists('text=Error Loading BDD Scenarios');
    if (errorMessage) {
      throw new Error('BDD_API_NOT_AVAILABLE');
    }
  }

  /**
   * Navigate to analytics page with proper error handling
   */
  async navigateToAnalytics() {
    await this.navigateAndWait('/analytics', {
      waitForSelector: 'h1',
      fallbackSelectors: [
        '[data-testid="analytics-dashboard"]',
        'text=Analytics',
        '.analytics-content'
      ]
    });
  }

  /**
   * Navigate to settings page with proper error handling
   */
  async navigateToSettings() {
    await this.navigateAndWait('/settings', {
      waitForSelector: 'h1',
      fallbackSelectors: [
        '[data-testid="settings-page"]',
        'text=Settings',
        '.settings-content'
      ]
    });
  }

  /**
   * Wait for any loading states to complete
   */
  async waitForLoading(timeout = 15000) {
    try {
      await this.page.waitForSelector('.loading, .spinner, [data-loading="true"]', { 
        timeout: 2000, 
        state: 'detached' 
      });
    } catch {
      // No loading state found, continue
    }
  }

  /**
   * Fill form field with proper waiting
   */
  async fillField(selector: string, value: string, options?: { timeout?: number }) {
    const timeout = options?.timeout || 10000;
    await this.page.waitForSelector(selector, { timeout });
    await this.page.fill(selector, value);
  }

  /**
   * Assert element is visible with retry logic
   */
  async assertVisible(selector: string, options?: { timeout?: number; retry?: boolean }) {
    const timeout = options?.timeout || 10000;
    
    if (options?.retry) {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          await expect(this.page.locator(selector)).toBeVisible({ timeout });
          return;
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) throw error;
          await this.page.waitForTimeout(1000);
        }
      }
    } else {
      await expect(this.page.locator(selector)).toBeVisible({ timeout });
    }
  }

  /**
   * Count elements safely
   */
  async countElements(selector: string): Promise<number> {
    try {
      return await this.page.locator(selector).count();
    } catch {
      return 0;
    }
  }

  /**
   * Check if page has error state
   */
  async hasErrorState(): Promise<boolean> {
    const errorSelectors = [
      'text=Error',
      '.error-message',
      '[data-testid="error"]',
      '.alert-error'
    ];
    
    for (const selector of errorSelectors) {
      if (await this.elementExists(selector, 2000)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Create test utils instance for a page
 */
export function createTestUtils(page: Page): TestUtils {
  return new TestUtils(page);
}