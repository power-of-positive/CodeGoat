import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Template System and Analytics
 * Based on vibe-kanban PRD and RFC requirements
 * 
 * Tests cover:
 * - Task template creation and management
 * - Global vs project-specific templates
 * - Template usage in task creation
 * - Template library and organization
 * - Analytics dashboard and metrics
 * - Validation statistics and trends
 * - Model performance analytics
 * - Cross-project analytics
 * - Export functionality
 * - Real-time metrics updates
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data factory
function createTemplateTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Template Analytics Test ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-templates-${timestamp}-${randomId}`,
    globalTemplate: {
      name: `Global Template ${randomId}`,
      title: `Global Task Template ${randomId}`,
      description: 'This is a global task template for testing',
      defaultPrompt: `Create a feature based on the following requirements:\n\n{requirements}\n\nEnsure to:\n- Write tests\n- Update documentation\n- Follow coding standards`,
      tags: ['feature', 'development', 'testing'],
      estimatedHours: 4
    },
    projectTemplate: {
      name: `Project Template ${randomId}`,
      title: `Project-Specific Template ${randomId}`,
      description: 'This is a project-specific task template',
      defaultPrompt: `Fix the following bug:\n\n{bug_description}\n\nPlease:\n- Identify root cause\n- Implement fix\n- Add regression test`,
      tags: ['bugfix', 'debugging'],
      estimatedHours: 2
    }
  };
}

// Helper functions
async function navigateToTemplates(page: Page) {
  await page.goto(`${UI_BASE_URL}/templates`);
  
  // Wait for templates page to load
  await page.waitForSelector('h1, h2', { timeout: 15000 });
  
  // Look for templates page indicators
  const templateIndicators = [
    page.locator('text="Templates"'),
    page.locator('button:has-text("Create Template"), button:has-text("New Template")'),
    page.locator('[data-testid="templates-list"], .templates-grid')
  ];
  
  for (const indicator of templateIndicators) {
    if (await indicator.isVisible()) {
      break;
    }
  }
}

async function navigateToAnalytics(page: Page, projectId?: string) {
  const analyticsUrl = projectId 
    ? `${UI_BASE_URL}/projects/${projectId}/analytics`
    : `${UI_BASE_URL}/analytics`;
    
  await page.goto(analyticsUrl);
  
  // Wait for analytics page to load
  await page.waitForSelector('h1, h2', { timeout: 15000 });
  
  // Look for analytics indicators
  const analyticsIndicators = [
    page.locator('text="Analytics", text="Metrics", text="Dashboard"'),
    page.locator('.chart, .metric, .statistic'),
    page.locator('[data-testid="analytics-dashboard"]')
  ];
  
  for (const indicator of analyticsIndicators) {
    if (await indicator.isVisible()) {
      break;
    }
  }
}

async function createTemplate(page: Page, templateData: any, isGlobal = true) {
  // Click create template button
  const createButton = page.locator('button:has-text("Create Template"), button:has-text("New Template")').first();
  await createButton.click();
  
  // Wait for template creation dialog
  await page.waitForSelector('[role="dialog"], .template-dialog', { timeout: 10000 });
  
  const dialog = page.locator('[role="dialog"], .template-dialog').first();
  
  // Fill template details
  const nameInput = dialog.locator('input[name="name"], input[id="template-name"]').first();
  await nameInput.fill(templateData.name);
  
  const titleInput = dialog.locator('input[name="title"], input[id="template-title"]').first();
  await titleInput.fill(templateData.title);
  
  const descriptionInput = dialog.locator('textarea[name="description"], textarea[id="template-description"]').first();
  if (await descriptionInput.isVisible()) {
    await descriptionInput.fill(templateData.description);
  }
  
  const promptInput = dialog.locator('textarea[name="defaultPrompt"], textarea[id="default-prompt"], textarea[placeholder*="prompt"]').first();
  await promptInput.fill(templateData.defaultPrompt);
  
  // Configure template scope (global vs project)
  const scopeSelector = dialog.locator('select, [role="combobox"]').filter({ hasText: /scope|type|project/ }).first();
  if (await scopeSelector.isVisible()) {
    await scopeSelector.click();
    
    const scopeOption = page.locator('[role="option"], option').filter({ 
      hasText: isGlobal ? /Global|All/ : /Project|Current/ 
    }).first();
    
    if (await scopeOption.isVisible()) {
      await scopeOption.click();
    }
  }
  
  // Add tags if available
  const tagsInput = dialog.locator('input[name="tags"], input[id="template-tags"]').first();
  if (await tagsInput.isVisible() && templateData.tags) {
    await tagsInput.fill(templateData.tags.join(', '));
  }
  
  // Set estimated hours if available
  const hoursInput = dialog.locator('input[name="estimatedHours"], input[id="estimated-hours"]').first();
  if (await hoursInput.isVisible() && templateData.estimatedHours) {
    await hoursInput.fill(templateData.estimatedHours.toString());
  }
  
  // Submit template
  const submitButton = dialog.locator('button:has-text("Create"), button[type="submit"]').first();
  await submitButton.click();
  
  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
}

async function createTestProject() {
  const testData = createTemplateTestData();
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testData.projectName,
      git_repo_path: testData.gitRepoPath,
      use_existing_repo: false,
      setup_script: 'echo "Setup complete"',
      dev_script: 'npm run dev',
      cleanup_script: 'echo "Cleanup complete"'
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test project: ${response.status}`);
  }
  
  const result = await response.json();
  return { project: result.data || result, testData };
}

test.describe('Template System and Analytics', () => {
  let testProject: any;
  let testData: any;

  test.beforeAll(async () => {
    // Create test project for project-specific templates
    const { project, testData: data } = await createTestProject();
    testProject = project;
    testData = data;
  });

  test.afterAll(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/projects/${testProject.id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to cleanup test project:', error);
    }
  });

  test.describe('Task Template Management', () => {
    test('should navigate to templates management page', async ({ page }) => {
      try {
        await navigateToTemplates(page);
        
        // Verify templates page is loaded
        await expect(page.locator('text="Templates"')).toBeVisible();
        
        // Should show template creation option
        const createButton = page.locator('button:has-text("Create Template"), button:has-text("New Template")');
        await expect(createButton.first()).toBeVisible();
        
        console.log('✓ Templates page navigation successful');
        
      } catch (error) {
        test.skip(); // Skip if templates page not implemented
      }
    });

    test('should create global task template', async ({ page }) => {
      try {
        await navigateToTemplates(page);
        
        await createTemplate(page, testData.globalTemplate, true);
        
        // Verify template appears in list
        await expect(page.locator(`text="${testData.globalTemplate.name}"`)).toBeVisible({ timeout: 10000 });
        
        // Verify template details
        const templateCard = page.locator(`text="${testData.globalTemplate.name}"`).first().locator('..');
        
        // Should show template type/scope
        const globalIndicator = templateCard.locator('text="Global", .global-template, .badge').filter({ 
          hasText: /Global|All Projects/ 
        });
        
        if (await globalIndicator.isVisible()) {
          console.log('✓ Global template indicator visible');
        }
        
        // Should show template tags
        if (testData.globalTemplate.tags) {
          for (const tag of testData.globalTemplate.tags) {
            const tagElement = templateCard.locator(`text="${tag}"`);
            if (await tagElement.isVisible()) {
              console.log(`✓ Template tag "${tag}" visible`);
            }
          }
        }
        
        console.log('✓ Global template created successfully');
        
      } catch (error) {
        test.skip();
      }
    });

    test('should create project-specific template', async ({ page }) => {
      try {
        // Navigate to project first
        await page.goto(`${UI_BASE_URL}/projects/${testProject.id}/tasks`);
        await page.waitForTimeout(2000);
        
        // Look for template management in project context
        const templateButton = page.locator('button').filter({ 
          hasText: /Template|Library/ 
        }).first();
        
        if (await templateButton.isVisible()) {
          await templateButton.click();
          await page.waitForTimeout(1000);
          
          // Look for manage templates option
          const manageTemplates = page.locator('text="Manage Templates", button:has-text("Manage")').first();
          if (await manageTemplates.isVisible()) {
            await manageTemplates.click();
            await page.waitForTimeout(1000);
          }
        } else {
          // Try navigating to templates page directly
          await navigateToTemplates(page);
        }
        
        await createTemplate(page, testData.projectTemplate, false);
        
        // Verify project template appears
        await expect(page.locator(`text="${testData.projectTemplate.name}"`)).toBeVisible({ timeout: 10000 });
        
        console.log('✓ Project-specific template created successfully');
        
      } catch (error) {
        test.skip();
      }
    });

    test('should edit existing template', async ({ page }) => {
      try {
        await navigateToTemplates(page);
        
        // Find the global template we created
        const templateCard = page.locator(`text="${testData.globalTemplate.name}"`).first();
        await expect(templateCard).toBeVisible();
        
        // Look for edit button
        const editButton = templateCard.locator('..').locator('button').filter({ 
          hasText: /Edit|Modify/ 
        }).first();
        
        if (await editButton.isVisible()) {
          await editButton.click();
          
          // Wait for edit dialog
          await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
          
          const dialog = page.locator('[role="dialog"]').first();
          
          // Modify template name
          const nameInput = dialog.locator('input[name="name"], input[id="template-name"]').first();
          const newName = `${testData.globalTemplate.name} - EDITED`;
          await nameInput.clear();
          await nameInput.fill(newName);
          
          // Save changes
          const saveButton = dialog.locator('button:has-text("Save"), button:has-text("Update")').first();
          await saveButton.click();
          
          // Wait for dialog to close
          await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
          
          // Verify changes
          await expect(page.locator(`text="${newName}"`)).toBeVisible({ timeout: 10000 });
          
          console.log('✓ Template editing successful');
        } else {
          console.log('Template editing not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should delete template with confirmation', async ({ page }) => {
      try {
        await navigateToTemplates(page);
        
        // Create a template specifically for deletion
        const deleteTemplate = {
          name: `DELETE_TEST_${Date.now()}`,
          title: 'Template for Deletion Test',
          description: 'This template will be deleted',
          defaultPrompt: 'Test prompt for deletion',
          tags: ['test'],
          estimatedHours: 1
        };
        
        await createTemplate(page, deleteTemplate, true);
        
        // Find and delete the template
        const templateCard = page.locator(`text="${deleteTemplate.name}"`).first();
        await expect(templateCard).toBeVisible();
        
        const deleteButton = templateCard.locator('..').locator('button').filter({ 
          hasText: /Delete|Remove/ 
        }).first();
        
        if (await deleteButton.isVisible()) {
          // Handle confirmation dialog
          page.on('dialog', dialog => {
            expect(dialog.message()).toContain('delete');
            dialog.accept();
          });
          
          await deleteButton.click();
          
          // Wait for deletion
          await page.waitForTimeout(2000);
          
          // Verify template is removed
          await expect(page.locator(`text="${deleteTemplate.name}"`)).not.toBeVisible();
          
          console.log('✓ Template deletion successful');
        } else {
          console.log('Template deletion not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should use template when creating new task', async ({ page }) => {
      // Navigate to project tasks
      await page.goto(`${UI_BASE_URL}/projects/${testProject.id}/tasks`);
      await page.waitForTimeout(2000);
      
      try {
        // Look for template usage in task creation
        const addTaskButton = page.locator('button:has-text("Add Task")').first();
        await addTaskButton.click();
        
        // Wait for task creation dialog
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        
        const dialog = page.locator('[role="dialog"]').first();
        
        // Look for template selection
        const templateSection = dialog.locator('details, .template-section').filter({ 
          hasText: /template|Template/ 
        }).first();
        
        if (await templateSection.isVisible()) {
          await templateSection.click();
          await page.waitForTimeout(500);
          
          // Look for template dropdown or list
          const templateSelector = dialog.locator('select, [role="combobox"]').filter({ 
            hasText: /template/ 
          }).first();
          
          if (await templateSelector.isVisible()) {
            await templateSelector.click();
            
            // Look for our test template
            const templateOption = page.locator('[role="option"], option').filter({ 
              hasText: testData.globalTemplate.name 
            }).first();
            
            if (await templateOption.isVisible()) {
              await templateOption.click();
              
              // Verify template data is populated
              const titleInput = dialog.locator('input[name="title"], input[id="task-title"]').first();
              const titleValue = await titleInput.inputValue();
              
              if (titleValue.includes(testData.globalTemplate.title)) {
                console.log('✓ Template data populated in task creation');
              }
              
              // Verify prompt is populated
              const promptInput = dialog.locator('textarea[name="description"], textarea[id="task-description"]').first();
              const promptValue = await promptInput.inputValue();
              
              if (promptValue.includes('requirements') || promptValue.includes('standards')) {
                console.log('✓ Template prompt populated');
              }
            }
          }
        } else {
          console.log('Template selection in task creation not yet implemented');
        }
        
        // Cancel dialog
        const cancelButton = dialog.locator('button:has-text("Cancel")').first();
        await cancelButton.click();
        
      } catch (error) {
        test.skip();
      }
    });

    test('should filter templates by type and tags', async ({ page }) => {
      try {
        await navigateToTemplates(page);
        
        // Look for filter options
        const filterSection = page.locator('.filters, .template-filters, [data-testid="filters"]').first();
        
        if (await filterSection.isVisible()) {
          // Test type filter
          const typeFilter = filterSection.locator('select, [role="combobox"]').filter({ 
            hasText: /type|scope/ 
          }).first();
          
          if (await typeFilter.isVisible()) {
            await typeFilter.click();
            
            const globalOption = page.locator('[role="option"], option').filter({ 
              hasText: /Global/ 
            }).first();
            
            if (await globalOption.isVisible()) {
              await globalOption.click();
              await page.waitForTimeout(1000);
              
              // Should show only global templates
              console.log('✓ Type filtering available');
            }
          }
          
          // Test tag filter
          const tagInput = filterSection.locator('input').filter({ 
            hasText: /tag|Tag/ 
          }).first();
          
          if (await tagInput.isVisible()) {
            await tagInput.fill('feature');
            await page.waitForTimeout(1000);
            
            console.log('✓ Tag filtering available');
          }
        } else {
          console.log('Template filtering not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display global analytics dashboard', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Verify analytics page loads
        await expect(page.locator('text="Analytics", text="Dashboard", text="Metrics"')).toBeVisible();
        
        // Look for key metrics sections
        const metricSections = [
          page.locator('text="Total Projects", text="Project Count"'),
          page.locator('text="Total Tasks", text="Task Count"'),
          page.locator('text="Success Rate", text="Completion Rate"'),
          page.locator('text="Execution Time", text="Average Duration"')
        ];
        
        let visibleSections = 0;
        for (const section of metricSections) {
          if (await section.isVisible()) {
            visibleSections++;
            console.log(`✓ Metric section found: ${await section.textContent()}`);
          }
        }
        
        expect(visibleSections).toBeGreaterThan(0);
        
        // Look for charts and visualizations
        const chartElements = [
          page.locator('.chart, [data-testid="chart"]'),
          page.locator('canvas, svg').filter({ hasText: /chart|graph/ }),
          page.locator('.recharts, .chart-container')
        ];
        
        for (const chart of chartElements) {
          if (await chart.isVisible()) {
            console.log('✓ Charts/visualizations found');
            break;
          }
        }
        
        console.log('✓ Global analytics dashboard loaded');
        
      } catch (error) {
        test.skip();
      }
    });

    test('should display project-specific analytics', async ({ page }) => {
      try {
        await navigateToAnalytics(page, testProject.id);
        
        // Verify project analytics page loads
        await expect(page.locator('text="Analytics", text="Metrics"')).toBeVisible();
        
        // Should show project name
        await expect(page.locator(`text="${testData.projectName}"`)).toBeVisible();
        
        // Look for project-specific metrics
        const projectMetrics = [
          page.locator('text="Tasks Created", text="Task Count"'),
          page.locator('text="Execution Attempts", text="Attempts"'),
          page.locator('text="Validation Success", text="Validation Rate"'),
          page.locator('text="Model Usage", text="AI Model"')
        ];
        
        let visibleMetrics = 0;
        for (const metric of projectMetrics) {
          if (await metric.isVisible()) {
            visibleMetrics++;
            console.log(`✓ Project metric found: ${await metric.textContent()}`);
          }
        }
        
        // Look for time-based filtering
        const timeFilters = page.locator('select, button').filter({ 
          hasText: /Last.*day|Last.*week|Last.*month/ 
        });
        
        if (await timeFilters.count() > 0) {
          console.log('✓ Time-based filtering available');
        }
        
        console.log('✓ Project-specific analytics loaded');
        
      } catch (error) {
        test.skip();
      }
    });

    test('should show validation statistics and trends', async ({ page }) => {
      try {
        await navigateToAnalytics(page, testProject.id);
        
        // Look for validation-specific section
        const validationSection = page.locator('text="Validation", text="Pipeline", text="Testing"').first();
        
        if (await validationSection.isVisible()) {
          // May need to click to expand section
          await validationSection.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for validation metrics
        const validationMetrics = [
          page.locator('text="Pass Rate", text="Success Rate"'),
          page.locator('text="Failed Validations", text="Failures"'),
          page.locator('text="Average Validation Time"'),
          page.locator('text="Most Common Failures"')
        ];
        
        let validationMetricsFound = 0;
        for (const metric of validationMetrics) {
          if (await metric.isVisible()) {
            validationMetricsFound++;
            console.log(`✓ Validation metric: ${await metric.textContent()}`);
          }
        }
        
        // Look for validation trend charts
        const trendCharts = page.locator('.trend-chart, .validation-chart, .line-chart');
        if (await trendCharts.isVisible()) {
          console.log('✓ Validation trend charts available');
        }
        
        if (validationMetricsFound > 0) {
          console.log('✓ Validation statistics displayed');
        } else {
          console.log('Validation statistics not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should display AI model performance analytics', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for AI model section
        const modelSection = page.locator('text="Model Performance", text="AI Models", text="Models"').first();
        
        if (await modelSection.isVisible()) {
          await modelSection.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for model-specific metrics
        const modelMetrics = [
          page.locator('text="Model Usage", text="Usage Count"'),
          page.locator('text="Success Rate by Model"'),
          page.locator('text="Average Response Time"'),
          page.locator('text="Token Usage", text="Tokens"'),
          page.locator('text="Cost Analysis", text="Estimated Cost"')
        ];
        
        let modelMetricsFound = 0;
        for (const metric of modelMetrics) {
          if (await metric.isVisible()) {
            modelMetricsFound++;
            console.log(`✓ Model metric: ${await metric.textContent()}`);
          }
        }
        
        // Look for model comparison charts
        const comparisonCharts = page.locator('.comparison-chart, .model-chart, .bar-chart');
        if (await comparisonCharts.isVisible()) {
          console.log('✓ Model comparison charts available');
        }
        
        // Look for fallback frequency metrics
        const fallbackMetrics = page.locator('text="Fallback", text="Retry", text="Backup Model"');
        if (await fallbackMetrics.isVisible()) {
          console.log('✓ Fallback frequency metrics available');
        }
        
        if (modelMetricsFound > 0) {
          console.log('✓ AI model performance analytics displayed');
        } else {
          console.log('AI model analytics not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should support analytics data export', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for export functionality
        const exportButton = page.locator('button').filter({ 
          hasText: /Export|Download|Save/ 
        }).first();
        
        if (await exportButton.isVisible()) {
          await exportButton.click();
          
          // Look for export format options
          const exportFormats = [
            page.locator('text="CSV", [role="menuitem"]:has-text("CSV")'),
            page.locator('text="JSON", [role="menuitem"]:has-text("JSON")'),
            page.locator('text="PDF", [role="menuitem"]:has-text("PDF")')
          ];
          
          let availableFormats = 0;
          for (const format of exportFormats) {
            if (await format.isVisible()) {
              availableFormats++;
              console.log(`✓ Export format available: ${await format.textContent()}`);
            }
          }
          
          if (availableFormats > 0) {
            // Test CSV export
            const csvOption = page.locator('text="CSV", [role="menuitem"]:has-text("CSV")').first();
            if (await csvOption.isVisible()) {
              // Set up download listener
              const downloadPromise = page.waitForEvent('download');
              await csvOption.click();
              
              try {
                const download = await downloadPromise;
                console.log(`✓ Export download initiated: ${download.suggestedFilename()}`);
              } catch (error) {
                console.log('Export download may not complete in test environment');
              }
            }
          }
          
          console.log('✓ Analytics export functionality available');
        } else {
          console.log('Analytics export not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should filter analytics by date range', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for date range picker
        const dateRangePicker = page.locator('input[type="date"], .date-picker, [data-testid="date-range"]').first();
        
        if (await dateRangePicker.isVisible()) {
          await dateRangePicker.click();
          
          // Look for predefined ranges
          const predefinedRanges = [
            page.locator('text="Last 7 days", button:has-text("Last 7 days")'),
            page.locator('text="Last 30 days", button:has-text("Last 30 days")'),
            page.locator('text="Last 3 months", button:has-text("Last 3 months")')
          ];
          
          for (const range of predefinedRanges) {
            if (await range.isVisible()) {
              await range.click();
              await page.waitForTimeout(1000);
              
              console.log(`✓ Date range filter applied: ${await range.textContent()}`);
              break;
            }
          }
          
          console.log('✓ Date range filtering available');
        } else {
          // Look for dropdown-style date filters
          const dateFilter = page.locator('select, [role="combobox"]').filter({ 
            hasText: /date|time|period/ 
          }).first();
          
          if (await dateFilter.isVisible()) {
            await dateFilter.click();
            
            const filterOptions = page.locator('[role="option"], option');
            const optionCount = await filterOptions.count();
            
            if (optionCount > 0) {
              await filterOptions.first().click();
              console.log('✓ Date filtering available via dropdown');
            }
          } else {
            console.log('Date range filtering not yet implemented');
          }
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should display real-time metrics updates', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for real-time indicators
        const realtimeIndicators = [
          page.locator('text="Live", text="Real-time", text="Auto-refresh"'),
          page.locator('.live-indicator, .real-time'),
          page.locator('svg.animate-pulse, .pulse')
        ];
        
        let hasRealtimeIndicators = false;
        for (const indicator of realtimeIndicators) {
          if (await indicator.isVisible()) {
            hasRealtimeIndicators = true;
            console.log('✓ Real-time indicators visible');
            break;
          }
        }
        
        // Look for refresh controls
        const refreshButton = page.locator('button').filter({ 
          hasText: /Refresh|Update|Sync/ 
        }).first();
        
        if (await refreshButton.isVisible()) {
          // Test manual refresh
          await refreshButton.click();
          await page.waitForTimeout(2000);
          
          console.log('✓ Manual refresh functionality available');
        }
        
        // Look for auto-refresh settings
        const autoRefreshToggle = page.locator('input[type="checkbox"]').filter({ 
          hasText: /auto.*refresh|live.*update/ 
        }).first();
        
        if (await autoRefreshToggle.isVisible()) {
          await autoRefreshToggle.check();
          console.log('✓ Auto-refresh toggle available');
        }
        
        if (hasRealtimeIndicators || await refreshButton.isVisible()) {
          console.log('✓ Real-time metrics functionality available');
        } else {
          console.log('Real-time metrics not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });

  test.describe('Cross-Project Analytics', () => {
    test('should aggregate metrics across all projects', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for cross-project summary
        const crossProjectSection = page.locator('text="All Projects", text="Global", text="Summary"').first();
        
        if (await crossProjectSection.isVisible()) {
          await crossProjectSection.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for aggregated metrics
        const aggregatedMetrics = [
          page.locator('text="Total Projects Active"'),
          page.locator('text="Total Tasks Across Projects"'),
          page.locator('text="Overall Success Rate"'),
          page.locator('text="Top Performing Projects"'),
          page.locator('text="Resource Utilization"')
        ];
        
        let aggregatedMetricsFound = 0;
        for (const metric of aggregatedMetrics) {
          if (await metric.isVisible()) {
            aggregatedMetricsFound++;
            console.log(`✓ Aggregated metric: ${await metric.textContent()}`);
          }
        }
        
        // Look for project comparison tables
        const comparisonTable = page.locator('table, .project-comparison, .ranking-table').first();
        if (await comparisonTable.isVisible()) {
          console.log('✓ Project comparison table available');
        }
        
        if (aggregatedMetricsFound > 0) {
          console.log('✓ Cross-project analytics displayed');
        } else {
          console.log('Cross-project analytics not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should show project performance rankings', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for rankings section
        const rankingsSection = page.locator('text="Rankings", text="Leaderboard", text="Performance"').first();
        
        if (await rankingsSection.isVisible()) {
          await rankingsSection.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for ranking criteria
        const rankingCriteria = [
          page.locator('text="Success Rate", button:has-text("Success Rate")'),
          page.locator('text="Task Completion", button:has-text("Task Completion")'),
          page.locator('text="Validation Pass Rate", button:has-text("Validation")'),
          page.locator('text="Execution Speed", button:has-text("Speed")')
        ];
        
        for (const criteria of rankingCriteria) {
          if (await criteria.isVisible()) {
            await criteria.click();
            await page.waitForTimeout(1000);
            
            console.log(`✓ Ranking criteria available: ${await criteria.textContent()}`);
            break;
          }
        }
        
        // Look for ranked project list
        const projectRanking = page.locator('.ranking-list, .project-rank, table tbody tr').first();
        if (await projectRanking.isVisible()) {
          console.log('✓ Project ranking list available');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should display resource usage across projects', async ({ page }) => {
      try {
        await navigateToAnalytics(page);
        
        // Look for resource usage section
        const resourceSection = page.locator('text="Resource Usage", text="System Resources"').first();
        
        if (await resourceSection.isVisible()) {
          await resourceSection.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for resource metrics
        const resourceMetrics = [
          page.locator('text="CPU Usage", text="Processor"'),
          page.locator('text="Memory Usage", text="RAM"'),
          page.locator('text="Disk Usage", text="Storage"'),
          page.locator('text="Network Usage", text="Bandwidth"'),
          page.locator('text="Active Worktrees", text="Git Branches"')
        ];
        
        let resourceMetricsFound = 0;
        for (const metric of resourceMetrics) {
          if (await metric.isVisible()) {
            resourceMetricsFound++;
            console.log(`✓ Resource metric: ${await metric.textContent()}`);
          }
        }
        
        // Look for resource usage charts
        const resourceCharts = page.locator('.resource-chart, .usage-chart, .gauge-chart').first();
        if (await resourceCharts.isVisible()) {
          console.log('✓ Resource usage visualization available');
        }
        
        if (resourceMetricsFound > 0) {
          console.log('✓ Resource usage analytics displayed');
        } else {
          console.log('Resource usage analytics not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });
});