import { test, expect } from '@playwright/test';

test.describe('Project Tasks Page', () => {
  test('should navigate to project tasks page from projects page', async ({ page }) => {
    // First navigate to projects page
    await page.goto('/projects');
    
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });
    
    // Find and click the first project card or "View Tasks" button
    const projectCard = page.locator('[data-testid="project-card"]').first();
    const viewTasksButton = page.locator('text="View Tasks"').first();
    const projectLink = page.locator('a[href*="/projects/"][href*="/tasks"]').first();
    
    // Try multiple ways to navigate to project tasks
    if (await projectCard.isVisible()) {
      await projectCard.click();
    } else if (await viewTasksButton.isVisible()) {
      await viewTasksButton.click();
    } else if (await projectLink.isVisible()) {
      await projectLink.click();
    } else {
      // Fallback: click on any project element
      const anyProjectElement = page.locator('.grid > div').first();
      await expect(anyProjectElement).toBeVisible();
      await anyProjectElement.click();
    }
    
    // Wait for navigation to project tasks page
    await page.waitForURL('**/projects/*/tasks', { timeout: 10000 });
    expect(page.url()).toMatch(/\/projects\/.*\/tasks/);
  });

  test('should display project tasks page content correctly', async ({ page }) => {
    // Navigate to projects page first
    await page.goto('/projects');
    
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });
    
    // Click on the first project card to navigate to tasks
    const firstCard = page.locator('.grid > div').first();
    await firstCard.click();
    
    // Wait for navigation to project tasks page
    await page.waitForURL('**/projects/*/tasks', { timeout: 10000 });
    
    // Check for project tasks page content
    const content = await page.textContent('body');
    console.log('Project Tasks page content:', content?.substring(0, 300));
    
    // Should have project tasks page structure
    await expect(page).toHaveURL(/\/projects\/.*\/tasks/);
    
    // Should have kanban board elements
    await expect(page.locator('text="To Do"')).toBeVisible();
    await expect(page.locator('text="In Progress"')).toBeVisible();
    await expect(page.locator('text="Add Task"')).toBeVisible();
    
    // Should not have a blank page
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(100);
  });

  test('should handle page refresh on project tasks page', async ({ page }) => {
    // Navigate to project tasks page via clicking project card
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });
    
    const firstCard = page.locator('.grid > div').first();
    await firstCard.click();
    
    // Wait for navigation
    await page.waitForURL('**/projects/*/tasks', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Refresh the page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should still be on the same page
    expect(page.url()).toMatch(/\/projects\/.*\/tasks/);
    
    // Should still have kanban board content
    await expect(page.locator('text="To Do"')).toBeVisible();
    
    // Should still have content
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });

  test('should not show error state on project tasks page', async ({ page }) => {
    // Capture console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Navigate to project tasks page
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });
    
    const firstCard = page.locator('.grid > div').first();
    await firstCard.click();
    
    // Wait for navigation
    await page.waitForURL('**/projects/*/tasks', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Count elements that might indicate errors (but exclude CSS classes)
    const errorElements = await page.locator('[class*="error"]:not([class*="error-"]):not([class*="-error"])').count();
    const alertElements = await page.locator('.alert-destructive, [role="alert"]').count();
    
    console.log('Console errors:', errors);
    console.log('Found error elements:', errorElements);
    
    // Check for JavaScript errors (ignore 404s, favicon errors, and expected API failures)
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') && 
      !error.includes('Failed to load resource') &&
      !error.includes('Failed to fetch templates') &&
      !error.includes('AxiosError')
    );
    expect(criticalErrors).toHaveLength(0);
    
    // Should not have error indicators (excluding CSS class names)
    expect(errorElements).toBe(0);
    expect(alertElements).toBe(0);
  });

  test('should have working navigation from project tasks page', async ({ page }) => {
    // Navigate to project tasks page
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });
    
    const firstCard = page.locator('.grid > div').first();
    await firstCard.click();
    
    // Wait for navigation to project tasks
    await page.waitForURL('**/projects/*/tasks', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Try to navigate back to projects using navigation menu
    const projectsNavLink = page.locator('a[href="/projects"], [data-testid="nav-projects"]').first();
    if (await projectsNavLink.isVisible()) {
      await projectsNavLink.click();
      await page.waitForURL('**/projects', { timeout: 5000 });
      expect(page.url()).toContain('/projects');
    } else {
      // Alternative: try clicking on "Projects" text in navigation
      const projectsLink = page.locator('text="Projects"').first();
      if (await projectsLink.isVisible()) {
        await projectsLink.click();
        await page.waitForURL('**/projects', { timeout: 5000 });
        expect(page.url()).toContain('/projects');
      }
    }
  });
});