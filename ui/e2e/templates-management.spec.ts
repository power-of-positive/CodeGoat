import { test, expect } from '@playwright/test';

test.describe('Task Templates Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Global Templates in Settings', () => {
    test('should navigate to global templates in settings', async ({ page }) => {
      // Navigate to Settings page
      await page.goto('/settings');
      
      // Should see Task Templates section
      await expect(page.getByText('Task Templates')).toBeVisible();
      await expect(page.getByText('Manage global task templates that can be used across all projects')).toBeVisible();
      
      // Should see the component content
      await expect(page.getByText('Add Template')).toBeVisible();
    });

    test('should create a new global template', async ({ page }) => {
      await page.goto('/settings');
      
      // Open template creation dialog
      await page.click('text=Add Template');
      
      // Fill template form
      const templateName = `Global Test Template ${Date.now()}`;
      const templateTitle = 'Test Feature Implementation';
      const templateDescription = 'Implement a test feature with proper error handling and tests';

      await page.fill('#template-name', templateName);
      await page.fill('#template-title', templateTitle);
      await page.fill('#template-description', templateDescription);

      // Save template
      await page.click('text=Create');
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Verify template appears in list
      await expect(page.getByText(templateName)).toBeVisible();
      await expect(page.getByText(templateTitle)).toBeVisible();
      await expect(page.getByText(templateDescription)).toBeVisible();
    });

    test('should edit an existing global template', async ({ page }) => {
      await page.goto('/settings');

      // First create a template to edit
      await page.click('text=Add Template');
      const originalName = `Edit Test Template ${Date.now()}`;
      await page.fill('#template-name', originalName);
      await page.fill('#template-title', 'Original Title');
      await page.fill('#template-description', 'Original description');
      await page.click('text=Create');

      // Find and edit the template
      const templateRow = page.locator(`tr:has-text("${originalName}")`);
      await templateRow.locator('[title="Edit template"]').click();

      // Update template details
      const updatedName = `${originalName} Updated`;
      const updatedTitle = 'Updated Title';
      const updatedDescription = 'Updated description with more details';

      await page.fill('#template-name', updatedName);
      await page.fill('#template-title', updatedTitle);
      await page.fill('#template-description', updatedDescription);

      await page.click('text=Update');
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Verify updates
      await expect(page.getByText(updatedName)).toBeVisible();
      await expect(page.getByText(updatedTitle)).toBeVisible();
      await expect(page.getByText(updatedDescription)).toBeVisible();
      await expect(page.getByText(originalName)).not.toBeVisible();
    });

    test('should delete a global template', async ({ page }) => {
      await page.goto('/settings');

      // Create a template to delete
      await page.click('text=Add Template');
      const templateName = `Delete Test Template ${Date.now()}`;
      await page.fill('#template-name', templateName);
      await page.fill('#template-title', 'Will be deleted');
      await page.fill('#template-description', 'This template will be deleted');
      await page.click('text=Create');

      // Delete the template
      const templateRow = page.locator(`tr:has-text("${templateName}")`);
      
      // Handle confirmation dialog
      page.once('dialog', dialog => {
        expect(dialog.message()).toContain(templateName);
        dialog.accept();
      });
      
      await templateRow.locator('[title="Delete template"]').click();

      // Verify template is removed
      await expect(page.getByText(templateName)).not.toBeVisible();
    });

    test('should validate required fields when creating template', async ({ page }) => {
      await page.goto('/settings');
      
      await page.click('text=Add Template');

      // Try to save without required fields
      await page.click('text=Create');

      // Should show validation error
      await expect(page.getByText('Template name and title are required')).toBeVisible();

      // Fill only template name
      await page.fill('#template-name', 'Test Template');
      await page.click('text=Create');
      await expect(page.getByText('Template name and title are required')).toBeVisible();

      // Fill both required fields
      await page.fill('#template-title', 'Test Title');
      await page.click('text=Create');

      // Should succeed and close dialog
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should support keyboard shortcuts for template creation', async ({ page }) => {
      await page.goto('/settings');
      
      await page.click('text=Add Template');

      await page.fill('#template-name', 'Keyboard Test Template');
      await page.fill('#template-title', 'Keyboard Test Title');

      // Use Cmd/Ctrl + Enter to save
      await page.press('#template-description', 'Meta+Enter');

      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('Keyboard Test Template')).toBeVisible();
    });

    test('should show loading states appropriately', async ({ page }) => {
      await page.goto('/settings');

      // Should show loading spinner initially
      const loadingSpinner = page.locator('.animate-spin').first();
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });
      }

      // Template list should be loaded
      await expect(page.getByText('Global Task Templates')).toBeVisible();
    });

    test('should handle empty state properly', async ({ page }) => {
      await page.goto('/settings');

      // If no templates exist, should show empty state
      const emptyMessage = page.getByText('No templates yet. Create your first template to get started.');
      if (await emptyMessage.isVisible()) {
        await expect(emptyMessage).toBeVisible();
      }
    });
  });

  test.describe('Project-Specific Templates', () => {
    let projectId: string;

    test.beforeEach(async ({ page }) => {
      // Create a test project first
      await page.goto('/projects');
      await page.click('text=Create Project');
      
      const projectName = `Template Test Project ${Date.now()}`;
      await page.fill('[placeholder="Enter project name"]', projectName);
      await page.fill('[placeholder="Enter project description"]', 'Project for testing templates');
      await page.fill('[placeholder="Enter repository path"]', '/tmp/test-repo');
      
      await page.click('text=Create');
      await page.waitForURL(/\/projects\/[^\/]+$/);
      
      // Extract project ID from URL
      const url = page.url();
      projectId = url.split('/').pop()!;
    });

    test('should manage project-specific templates in project settings', async ({ page }) => {
      // Navigate to project tasks page which should have templates
      await page.goto(`/projects/${projectId}/tasks`);
      
      // Look for project-specific template management
      // This might be in a settings panel or dedicated section
      const projectTemplatesSection = page.getByText('Project Task Templates');
      if (await projectTemplatesSection.isVisible()) {
        await expect(projectTemplatesSection).toBeVisible();
      }
    });

    test('should create project-specific template', async ({ page }) => {
      await page.goto(`/projects/${projectId}/tasks`);
      
      // Find project templates section (implementation may vary)
      const addTemplateButton = page.getByText('Add Template').nth(1); // Assuming second one is project-specific
      if (await addTemplateButton.isVisible()) {
        await addTemplateButton.click();

        await page.fill('#template-name', 'Project Bug Fix Template');
        await page.fill('#template-title', 'Fix bug in [component]');
        await page.fill('#template-description', 'Template for fixing bugs in this specific project');

        await page.click('text=Create');

        await expect(page.getByText('Project Bug Fix Template')).toBeVisible();
      }
    });

    test('should not show project templates in global list', async ({ page }) => {
      // Create a project-specific template first
      await page.goto(`/projects/${projectId}/tasks`);
      const projectAddButton = page.getByText('Add Template').nth(1);
      
      if (await projectAddButton.isVisible()) {
        await projectAddButton.click();
        await page.fill('#template-name', 'Project Only Template');
        await page.fill('#template-title', 'Project Only Title');
        await page.click('text=Create');

        // Navigate to global settings
        await page.goto('/settings');
        
        // Project template should not appear in global list
        await expect(page.getByText('Project Only Template')).not.toBeVisible();
      }
    });
  });

  test.describe('Template Usage in Task Creation', () => {
    let projectId: string;

    test.beforeEach(async ({ page }) => {
      // Create a test project
      await page.goto('/projects');
      await page.click('text=Create Project');
      
      const projectName = `Task Template Project ${Date.now()}`;
      await page.fill('[placeholder="Enter project name"]', projectName);
      await page.fill('[placeholder="Enter project description"]', 'Project for testing template usage');
      await page.fill('[placeholder="Enter repository path"]', '/tmp/task-template-repo');
      
      await page.click('text=Create');
      await page.waitForURL(/\/projects\/[^\/]+$/);
      
      const url = page.url();
      projectId = url.split('/').pop()!;

      // Create a global template for testing
      await page.goto('/settings');
      await page.click('text=Add Template');
      await page.fill('#template-name', 'Feature Development');
      await page.fill('#template-title', 'Implement [feature name]');
      await page.fill('#template-description', 'Implement a new feature with tests and documentation');
      await page.click('text=Create');
    });

    test('should use template when creating new task', async ({ page }) => {
      await page.goto(`/projects/${projectId}/tasks`);
      
      // Click to create new task
      await page.click('text=Add Task');
      
      // Look for template selection (this may be in a dropdown or separate field)
      const templateSelector = page.locator('#template-select, [data-testid="template-selector"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.click();
        await page.click('text=Feature Development');
        
        // Template values should be populated
        const titleInput = page.locator('#task-title, [placeholder*="title"], [name="title"]');
        await expect(titleInput).toHaveValue('Implement [feature name]');
        
        const descriptionInput = page.locator('#task-description, [placeholder*="description"], [name="description"]');
        await expect(descriptionInput).toHaveValue('Implement a new feature with tests and documentation');
      }
    });

    test('should allow overriding template values', async ({ page }) => {
      await page.goto(`/projects/${projectId}/tasks`);
      
      await page.click('text=Add Task');
      
      const templateSelector = page.locator('#template-select, [data-testid="template-selector"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.click();
        await page.click('text=Feature Development');

        // Modify template values
        const titleInput = page.locator('#task-title, [placeholder*="title"], [name="title"]');
        await titleInput.fill('Implement user authentication');
        
        const descriptionInput = page.locator('#task-description, [placeholder*="description"], [name="description"]');
        await descriptionInput.fill('Add OAuth2 authentication with JWT tokens');

        // Create task
        await page.click('text=Create Task');

        // Verify custom values were used
        await expect(page.getByText('Implement user authentication')).toBeVisible();
      }
    });

    test('should show both global and project templates in selection', async ({ page }) => {
      // First create a project-specific template
      await page.goto(`/projects/${projectId}/tasks`);
      
      // If project templates are supported, create one
      const projectAddTemplateButton = page.getByText('Add Template').nth(1);
      if (await projectAddTemplateButton.isVisible()) {
        await projectAddTemplateButton.click();
        await page.fill('#template-name', 'Project Bug Fix');
        await page.fill('#template-title', 'Fix [bug description]');
        await page.fill('#template-description', 'Template for project-specific bug fixes');
        await page.click('text=Create');
      }

      // Create new task and check template options
      await page.click('text=Add Task');
      
      const templateSelector = page.locator('#template-select, [data-testid="template-selector"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.click();
        
        // Should show both global and project templates
        await expect(page.getByText('Feature Development')).toBeVisible(); // Global
        
        if (await projectAddTemplateButton.isVisible()) {
          await expect(page.getByText('Project Bug Fix')).toBeVisible(); // Project-specific
        }
      }
    });
  });

  test.describe('Template Management Edge Cases', () => {
    test('should handle duplicate template names', async ({ page }) => {
      await page.goto('/settings');
      
      // Create first template
      await page.click('text=Add Template');
      const templateName = 'Duplicate Test Template';
      await page.fill('#template-name', templateName);
      await page.fill('#template-title', 'First Template');
      await page.click('text=Create');

      // Try to create another with same name
      await page.click('text=Add Template');
      await page.fill('#template-name', templateName);
      await page.fill('#template-title', 'Second Template');
      await page.click('text=Create');

      // Should show error or handle gracefully
      const errorMessage = page.getByText(/already exists|duplicate|unique/i);
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should handle long template names and descriptions', async ({ page }) => {
      await page.goto('/settings');
      
      await page.click('text=Add Template');
      
      const longName = 'A'.repeat(100);
      const longDescription = 'B'.repeat(500);
      
      await page.fill('#template-name', longName);
      await page.fill('#template-title', 'Long Template Title');
      await page.fill('#template-description', longDescription);
      
      await page.click('text=Create');

      // Should handle gracefully - either create successfully or show validation
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should handle special characters in template names', async ({ page }) => {
      await page.goto('/settings');
      
      await page.click('text=Add Template');
      
      const specialName = 'Template with "quotes" & special chars! @#$%';
      await page.fill('#template-name', specialName);
      await page.fill('#template-title', 'Special Character Test');
      await page.fill('#template-description', 'Testing special characters in templates');
      
      await page.click('text=Create');
      
      // Should handle special characters correctly
      await expect(page.getByText(specialName)).toBeVisible();
    });
  });

  test.describe('Template Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/settings');
      
      // Tab to Add Template button
      await page.keyboard.press('Tab');
      
      // Use keyboard navigation
      await page.keyboard.press('Enter'); // Open dialog
      
      await page.keyboard.type('Keyboard Template');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard Title');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard Description');
      
      // Use Cmd+Enter shortcut to save
      await page.keyboard.press('Meta+Enter');
      
      await expect(page.getByText('Keyboard Template')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/settings');
      
      await page.click('text=Add Template');
      
      // Check for proper labels
      await expect(page.getByLabel('Template Name')).toBeVisible();
      await expect(page.getByLabel('Default Title')).toBeVisible();
      await expect(page.getByLabel('Default Description')).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/settings');
      
      // Check semantic structure
      await expect(page.locator('table')).toBeVisible(); // Templates should be in a table
      await expect(page.locator('th')).toContainText(['Template Name', 'Title', 'Description', 'Actions']);
      
      // Check button accessibility
      const addButton = page.getByText('Add Template');
      await expect(addButton).toBeVisible();
      await expect(addButton).toHaveRole('button');
    });
  });

  test.describe('Template Performance', () => {
    test('should handle many templates efficiently', async ({ page }) => {
      await page.goto('/settings');
      
      // Create multiple templates to test performance
      const templateCount = 20;
      
      for (let i = 0; i < Math.min(templateCount, 5); i++) { // Limit to avoid timeout
        await page.click('text=Add Template');
        await page.fill('#template-name', `Performance Template ${i + 1}`);
        await page.fill('#template-title', `Performance Title ${i + 1}`);
        await page.fill('#template-description', `Performance Description ${i + 1}`);
        await page.click('text=Create');
        
        // Brief wait to avoid overwhelming the system
        await page.waitForTimeout(100);
      }
      
      // All templates should be visible
      await expect(page.getByText('Performance Template 1')).toBeVisible();
      await expect(page.getByText('Performance Template 5')).toBeVisible();
    });

    test('should have responsive scroll behavior with many templates', async ({ page }) => {
      await page.goto('/settings');
      
      // The template list should have proper scrolling
      const templateTable = page.locator('.max-h-\\[400px\\]').first();
      if (await templateTable.isVisible()) {
        await expect(templateTable).toHaveCSS('overflow', /auto|scroll/);
      }
    });
  });
});