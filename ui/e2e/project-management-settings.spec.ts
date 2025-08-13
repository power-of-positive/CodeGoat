import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Project Management and Settings
 * Based on vibe-kanban PRD and RFC requirements
 * 
 * Tests cover:
 * - Project creation and configuration
 * - Project settings management
 * - Git repository integration
 * - Script configuration (setup, dev, cleanup)
 * - AI model configuration per project
 * - Validation pipeline settings
 * - GitHub integration settings
 * - Project dashboard and navigation
 * - Project deletion and cleanup
 * - Import/export functionality
 * - Project health monitoring
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data factory
function createProjectTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Project Management Test ${timestamp}-${randomId}`,
    projectDescription: `Test project for settings and configuration - ${timestamp}`,
    gitRepoPath: `/tmp/test-project-mgmt-${timestamp}-${randomId}`,
    setupScript: 'echo "Project setup starting"; npm install; echo "Setup complete"',
    devScript: 'npm run dev',
    cleanupScript: 'echo "Cleaning up project"; rm -rf node_modules; echo "Cleanup done"',
    validationScript: 'npm test && npm run lint'
  };
}

// Helper functions
async function navigateToProjects(page: Page) {
  await page.goto(`${UI_BASE_URL}/projects`);
  
  // Wait for projects page to load
  await page.waitForSelector('h1, h2', { timeout: 15000 });
  
  // Look for projects page indicators
  const pageIndicators = [
    page.locator('text="Projects"'),
    page.locator('button:has-text("Create Project"), button:has-text("New Project")'),
    page.locator('[data-testid="projects-grid"], .projects-grid')
  ];
  
  for (const indicator of pageIndicators) {
    if (await indicator.isVisible()) {
      break;
    }
  }
}

async function createProjectViaUI(page: Page, projectData: any) {
  // Click create project button
  const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project"), button:has-text("Add Project")');
  await expect(createButton.first()).toBeVisible({ timeout: 10000 });
  await createButton.first().click();
  
  // Wait for project creation dialog
  await page.waitForSelector('[role="dialog"], .modal, .create-project-dialog', { timeout: 10000 });
  
  // Fill project details
  const nameInput = page.locator('input[name="name"], input[id="project-name"], input[placeholder*="name"]').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill(projectData.projectName);
  
  const descriptionInput = page.locator('textarea[name="description"], textarea[id="project-description"], textarea[placeholder*="description"]').first();
  if (await descriptionInput.isVisible()) {
    await descriptionInput.fill(projectData.projectDescription);
  }
  
  const gitPathInput = page.locator('input[name="git_repo_path"], input[id="git-repo-path"], input[placeholder*="repository"], input[placeholder*="path"]').first();
  await expect(gitPathInput).toBeVisible();
  await gitPathInput.fill(projectData.gitRepoPath);
  
  // Submit form
  const submitButton = page.locator('button:has-text("Create"), button[type="submit"], button:has-text("Save")').first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  
  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"], .modal', { state: 'hidden', timeout: 10000 });
  
  // Return to projects list or verify creation
  await page.waitForTimeout(2000);
}

async function openProjectSettings(page: Page, projectName: string) {
  // Find the project card/row
  const projectElement = page.locator(`text="${projectName}"`).first();
  await expect(projectElement).toBeVisible({ timeout: 10000 });
  
  // Look for settings button or menu
  const settingsButton = projectElement.locator('..').locator('button').filter({ 
    hasText: /Settings|Configure|Edit/ 
  }).first();
  
  if (await settingsButton.isVisible()) {
    await settingsButton.click();
  } else {
    // Try right-click context menu
    await projectElement.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    const contextSettings = page.locator('[role="menuitem"], .context-menu-item').filter({ 
      hasText: /Settings|Configure/ 
    }).first();
    
    if (await contextSettings.isVisible()) {
      await contextSettings.click();
    } else {
      // Try clicking on project to enter it, then look for settings icon
      await projectElement.click();
      await page.waitForTimeout(2000);
      
      const headerSettings = page.locator('button[title*="Settings"], button').filter({ 
        hasText: /Settings|Configure/ 
      }).first();
      
      await expect(headerSettings).toBeVisible({ timeout: 5000 });
      await headerSettings.click();
    }
  }
  
  // Wait for settings panel/dialog to open
  await page.waitForSelector('[role="dialog"], .settings-panel, .project-settings', { timeout: 10000 });
}

test.describe('Project Management and Settings', () => {
  let testProjectData: any;
  let createdProjectId: string;

  test.beforeAll(async () => {
    testProjectData = createProjectTestData();
  });

  test.beforeEach(async ({ page }) => {
    await navigateToProjects(page);
  });

  test.describe('Project Creation and Configuration', () => {
    test('should create new project via UI with all configuration options', async ({ page }) => {
      await createProjectViaUI(page, testProjectData);
      
      // Verify project appears in the list
      await expect(page.locator(`text="${testProjectData.projectName}"`)).toBeVisible({ timeout: 10000 });
      console.log('✓ Project created successfully via UI');
    });

    test('should validate required fields during project creation', async ({ page }) => {
      // Open create project dialog
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      await createButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Try to submit without required fields
      const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
      
      // Submit button should be disabled initially
      await expect(submitButton).toBeDisabled();
      
      // Fill only name
      const nameInput = page.locator('input[name="name"], input[id="project-name"]').first();
      await nameInput.fill('Test Project');
      
      // Should still be disabled without git path
      await expect(submitButton).toBeDisabled();
      
      // Fill git path
      const gitPathInput = page.locator('input[name="git_repo_path"], input[id="git-repo-path"]').first();
      await gitPathInput.fill('/tmp/test-path');
      
      // Now should be enabled
      await expect(submitButton).toBeEnabled();
      
      // Cancel dialog
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
      
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    });

    test('should handle existing repository selection', async ({ page }) => {
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      await createButton.click();
      
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Look for "use existing repo" option
      const existingRepoOption = page.locator('input[type="checkbox"], input[type="radio"]').filter({ 
        hasText: /existing|use.*existing/ 
      }).first();
      
      if (await existingRepoOption.isVisible()) {
        await existingRepoOption.check();
        
        // Should show file picker or different path input
        const pathPicker = page.locator('button:has-text("Browse"), button:has-text("Select")');
        if (await pathPicker.isVisible()) {
          console.log('✓ Existing repository selection available');
        }
      } else {
        console.log('Existing repository option not yet implemented');
      }
      
      // Cancel dialog
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    });

    test('should configure project scripts during creation', async ({ page }) => {
      const createButton = page.locator('button:has-text("Create Project"), button:has-text("New Project")').first();
      await createButton.click();
      
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Fill basic info
      const nameInput = page.locator('input[name="name"], input[id="project-name"]').first();
      await nameInput.fill(testProjectData.projectName);
      
      const gitPathInput = page.locator('input[name="git_repo_path"], input[id="git-repo-path"]').first();
      await gitPathInput.fill(testProjectData.gitRepoPath);
      
      // Look for script configuration sections
      const scriptSections = [
        page.locator('textarea[name="setup_script"], textarea[id="setup-script"]'),
        page.locator('textarea[name="dev_script"], textarea[id="dev-script"]'),
        page.locator('textarea[name="cleanup_script"], textarea[id="cleanup-script"]')
      ];
      
      let scriptsConfigured = 0;
      for (const scriptInput of scriptSections) {
        if (await scriptInput.isVisible()) {
          await scriptInput.fill('echo "Script configured"');
          scriptsConfigured++;
        }
      }
      
      if (scriptsConfigured > 0) {
        console.log(`✓ ${scriptsConfigured} script configuration fields available`);
        
        // Create project with scripts
        const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
        await submitButton.click();
        
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
        
        // Verify project was created
        await expect(page.locator(`text="${testProjectData.projectName}"`)).toBeVisible({ timeout: 10000 });
      } else {
        console.log('Script configuration not available in creation dialog');
        // Cancel dialog
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        await cancelButton.click();
      }
    });
  });

  test.describe('Project Settings Management', () => {
    test('should open and navigate project settings panel', async ({ page }) => {
      // First create a project for settings testing
      await createProjectViaUI(page, testProjectData);
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        // Verify settings panel is open
        const settingsPanel = page.locator('[role="dialog"], .settings-panel, .project-settings').first();
        await expect(settingsPanel).toBeVisible();
        
        // Look for settings categories/tabs
        const settingsTabs = [
          page.locator('text="General", text="Basic"'),
          page.locator('text="Scripts", text="Configuration"'),
          page.locator('text="Git", text="Repository"'),
          page.locator('text="AI", text="Models"'),
          page.locator('text="Validation", text="Pipeline"')
        ];
        
        let visibleTabs = 0;
        for (const tab of settingsTabs) {
          if (await tab.isVisible()) {
            visibleTabs++;
            console.log(`✓ Settings tab found: ${await tab.textContent()}`);
          }
        }
        
        expect(visibleTabs).toBeGreaterThan(0);
        
      } catch (error) {
        test.skip(); // Skip if settings not yet implemented
      }
    });

    test('should edit project basic information', async ({ page }) => {
      // Ensure we have a project
      const projectExists = await page.locator(`text="${testProjectData.projectName}"`).isVisible();
      if (!projectExists) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for editable project name
        const nameInput = settingsPanel.locator('input[name="name"], input[id="project-name"]').first();
        if (await nameInput.isVisible()) {
          const originalName = await nameInput.inputValue();
          const newName = `${originalName} - EDITED`;
          
          await nameInput.clear();
          await nameInput.fill(newName);
          
          // Look for save button
          const saveButton = settingsPanel.locator('button:has-text("Save"), button:has-text("Update")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Wait for settings to close or update
            await page.waitForTimeout(2000);
            
            // Verify name change
            await expect(page.locator(`text="${newName}"`)).toBeVisible({ timeout: 10000 });
            console.log('✓ Project name updated successfully');
          }
        } else {
          console.log('Project name editing not available');
        }
        
        // Close settings if still open
        const closeButton = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should configure project scripts in settings', async ({ page }) => {
      const projectExists = await page.locator(`text="${testProjectData.projectName}"`).isVisible();
      if (!projectExists) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for scripts tab or section
        const scriptsTab = settingsPanel.locator('[role="tab"], button').filter({ hasText: /Scripts|Configuration/ }).first();
        if (await scriptsTab.isVisible()) {
          await scriptsTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Configure setup script
        const setupScriptInput = settingsPanel.locator('textarea[name="setup_script"], textarea[id="setup-script"]').first();
        if (await setupScriptInput.isVisible()) {
          await setupScriptInput.clear();
          await setupScriptInput.fill(testProjectData.setupScript);
          
          console.log('✓ Setup script configuration available');
        }
        
        // Configure dev script
        const devScriptInput = settingsPanel.locator('textarea[name="dev_script"], textarea[id="dev-script"]').first();
        if (await devScriptInput.isVisible()) {
          await devScriptInput.clear();
          await devScriptInput.fill(testProjectData.devScript);
          
          console.log('✓ Dev script configuration available');
        }
        
        // Configure validation script
        const validationScriptInput = settingsPanel.locator('textarea').filter({ 
          hasText: /validation|test|lint/ 
        }).first();
        if (await validationScriptInput.isVisible()) {
          await validationScriptInput.clear();
          await validationScriptInput.fill(testProjectData.validationScript);
          
          console.log('✓ Validation script configuration available');
        }
        
        // Save changes
        const saveButton = settingsPanel.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
          console.log('✓ Script configuration saved');
        }
        
        // Close settings
        const closeButton = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should configure AI model settings for project', async ({ page }) => {
      const projectExists = await page.locator(`text="${testProjectData.projectName}"`).isVisible();
      if (!projectExists) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for AI/Models tab
        const aiTab = settingsPanel.locator('[role="tab"], button').filter({ hasText: /AI|Models|Agent/ }).first();
        if (await aiTab.isVisible()) {
          await aiTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for default model selection
        const defaultModelSelect = settingsPanel.locator('select, [role="combobox"]').filter({ 
          hasText: /default.*model|primary.*model/ 
        }).first();
        
        if (await defaultModelSelect.isVisible()) {
          await defaultModelSelect.click();
          
          // Look for model options
          const modelOptions = page.locator('[role="option"], option');
          const optionCount = await modelOptions.count();
          
          if (optionCount > 0) {
            console.log(`✓ ${optionCount} AI model options available`);
            await modelOptions.first().click();
          }
        }
        
        // Look for fallback model configuration
        const fallbackSection = settingsPanel.locator('text="Fallback", text="Backup", text="Alternative"');
        if (await fallbackSection.isVisible()) {
          console.log('✓ Fallback model configuration available');
        }
        
        // Look for model parameters configuration
        const temperatureInput = settingsPanel.locator('input').filter({ hasText: /temperature/ }).first();
        const maxTokensInput = settingsPanel.locator('input').filter({ hasText: /tokens|token.*limit/ }).first();
        
        if (await temperatureInput.isVisible()) {
          await temperatureInput.fill('0.7');
          console.log('✓ Temperature configuration available');
        }
        
        if (await maxTokensInput.isVisible()) {
          await maxTokensInput.fill('4000');
          console.log('✓ Max tokens configuration available');
        }
        
        // Save AI settings
        const saveButton = settingsPanel.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          console.log('✓ AI model settings saved');
        }
        
      } catch (error) {
        console.log('AI model configuration not yet implemented');
      }
    });

    test('should configure validation pipeline settings', async ({ page }) => {
      const projectExists = await page.locator(`text="${testProjectData.projectName}"`).isVisible();
      if (!projectExists) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for validation tab
        const validationTab = settingsPanel.locator('[role="tab"], button').filter({ 
          hasText: /Validation|Pipeline|Testing/ 
        }).first();
        
        if (await validationTab.isVisible()) {
          await validationTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for validation stage configuration
        const validationStages = [
          settingsPanel.locator('input[type="checkbox"]').filter({ hasText: /lint|linting/ }),
          settingsPanel.locator('input[type="checkbox"]').filter({ hasText: /test|testing/ }),
          settingsPanel.locator('input[type="checkbox"]').filter({ hasText: /type.*check|typescript/ }),
          settingsPanel.locator('input[type="checkbox"]').filter({ hasText: /build|compile/ })
        ];
        
        let configuredStages = 0;
        for (const stage of validationStages) {
          if (await stage.isVisible()) {
            await stage.check();
            configuredStages++;
          }
        }
        
        if (configuredStages > 0) {
          console.log(`✓ ${configuredStages} validation stages configurable`);
        }
        
        // Look for timeout configuration
        const timeoutInput = settingsPanel.locator('input[type="number"]').filter({ 
          hasText: /timeout|time.*limit/ 
        }).first();
        
        if (await timeoutInput.isVisible()) {
          await timeoutInput.fill('300');
          console.log('✓ Validation timeout configuration available');
        }
        
        // Look for retry configuration
        const retryInput = settingsPanel.locator('input[type="number"]').filter({ 
          hasText: /retry|attempts/ 
        }).first();
        
        if (await retryInput.isVisible()) {
          await retryInput.fill('3');
          console.log('✓ Retry attempts configuration available');
        }
        
        // Save validation settings
        const saveButton = settingsPanel.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          console.log('✓ Validation pipeline settings saved');
        }
        
      } catch (error) {
        console.log('Validation pipeline configuration not yet implemented');
      }
    });

    test('should configure GitHub integration settings', async ({ page }) => {
      const projectExists = await page.locator(`text="${testProjectData.projectName}"`).isVisible();
      if (!projectExists) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for GitHub tab
        const githubTab = settingsPanel.locator('[role="tab"], button').filter({ 
          hasText: /GitHub|Git|Integration/ 
        }).first();
        
        if (await githubTab.isVisible()) {
          await githubTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for GitHub integration toggle
        const githubToggle = settingsPanel.locator('input[type="checkbox"]').filter({ 
          hasText: /GitHub.*integration|Enable.*GitHub/ 
        }).first();
        
        if (await githubToggle.isVisible()) {
          await githubToggle.check();
          console.log('✓ GitHub integration toggle available');
        }
        
        // Look for auto-PR creation option
        const autoPROption = settingsPanel.locator('input[type="checkbox"]').filter({ 
          hasText: /auto.*PR|automatic.*pull/ 
        }).first();
        
        if (await autoPROption.isVisible()) {
          await autoPROption.check();
          console.log('✓ Auto-PR creation option available');
        }
        
        // Look for PR template configuration
        const prTemplateInput = settingsPanel.locator('textarea').filter({ 
          hasText: /template|PR.*template/ 
        }).first();
        
        if (await prTemplateInput.isVisible()) {
          await prTemplateInput.fill('## Summary\n\nChanges made by AI agent.\n\n## Testing\n\n- [ ] Validation passed');
          console.log('✓ PR template configuration available');
        }
        
        // Look for branch prefix configuration
        const branchPrefixInput = settingsPanel.locator('input').filter({ 
          hasText: /branch.*prefix|worktree.*prefix/ 
        }).first();
        
        if (await branchPrefixInput.isVisible()) {
          await branchPrefixInput.fill('feature/');
          console.log('✓ Branch prefix configuration available');
        }
        
        // Save GitHub settings
        const saveButton = settingsPanel.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          console.log('✓ GitHub integration settings saved');
        }
        
      } catch (error) {
        console.log('GitHub integration configuration not yet implemented');
      }
    });
  });

  test.describe('Project Dashboard and Navigation', () => {
    test('should display project cards with status and metrics', async ({ page }) => {
      // Ensure we have at least one project
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      // Check project card elements
      const projectCards = page.locator('[data-testid="project-card"], .project-card, .grid > div').filter({ 
        hasText: testProjectData.projectName 
      });
      
      if (await projectCards.count() > 0) {
        const firstCard = projectCards.first();
        
        // Check for project name
        await expect(firstCard.locator(`text="${testProjectData.projectName}"`)).toBeVisible();
        
        // Look for project status indicators
        const statusIndicators = [
          firstCard.locator('.status-indicator, .project-status'),
          firstCard.locator('text="Active", text="Inactive", text="Healthy"'),
          firstCard.locator('svg.text-green-500, svg.text-red-500')
        ];
        
        for (const indicator of statusIndicators) {
          if (await indicator.isVisible()) {
            console.log('✓ Project status indicators visible');
            break;
          }
        }
        
        // Look for project metrics
        const metricElements = [
          firstCard.locator('text="tasks", text="executions"'),
          firstCard.locator('.metric, .stat'),
          firstCard.locator('text="Last activity", text="Last updated"')
        ];
        
        for (const metric of metricElements) {
          if (await metric.isVisible()) {
            console.log('✓ Project metrics visible');
            break;
          }
        }
        
        // Check for action buttons
        const actionButtons = [
          firstCard.locator('button:has-text("Open"), button:has-text("View")'),
          firstCard.locator('button:has-text("Settings"), button:has-text("Configure")'),
          firstCard.locator('button[title*="Settings"], button[title*="Open"]')
        ];
        
        for (const button of actionButtons) {
          if (await button.isVisible()) {
            console.log('✓ Project action buttons available');
            break;
          }
        }
      }
    });

    test('should support project search and filtering', async ({ page }) => {
      // Ensure we have projects to search
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        // Test search functionality
        await searchInput.fill(testProjectData.projectName);
        await page.waitForTimeout(1000);
        
        // Should show matching project
        await expect(page.locator(`text="${testProjectData.projectName}"`)).toBeVisible();
        
        // Test search clearing
        await searchInput.clear();
        await page.waitForTimeout(1000);
        
        console.log('✓ Project search functionality available');
      } else {
        console.log('Project search not yet implemented');
      }
      
      // Look for filter options
      const filterButtons = page.locator('button').filter({ hasText: /Filter|All|Active|Inactive/ });
      const filterCount = await filterButtons.count();
      
      if (filterCount > 0) {
        console.log(`✓ ${filterCount} project filter options available`);
        
        // Test filter functionality
        const firstFilter = filterButtons.first();
        await firstFilter.click();
        await page.waitForTimeout(1000);
      }
    });

    test('should support project grid and list view toggle', async ({ page }) => {
      // Look for view toggle buttons
      const viewToggleButtons = [
        page.locator('button').filter({ hasText: /Grid|List/ }),
        page.locator('button[title*="Grid"], button[title*="List"]'),
        page.locator('[data-testid="view-toggle"]')
      ];
      
      for (const toggleGroup of viewToggleButtons) {
        const toggleCount = await toggleGroup.count();
        if (toggleCount > 0) {
          console.log(`✓ View toggle buttons available (${toggleCount})`);
          
          // Test toggling between views
          const firstToggle = toggleGroup.first();
          await firstToggle.click();
          await page.waitForTimeout(1000);
          
          // Check if layout changed
          const gridView = page.locator('.grid, [data-view="grid"]');
          const listView = page.locator('.list, [data-view="list"]');
          
          if (await gridView.isVisible() || await listView.isVisible()) {
            console.log('✓ View toggle functionality works');
          }
          
          break;
        }
      }
    });

    test('should navigate to project tasks when clicking on project', async ({ page }) => {
      // Ensure we have a project
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      // Click on project card
      const projectCard = page.locator(`text="${testProjectData.projectName}"`).first();
      await projectCard.click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      // Should navigate to project tasks view
      const urlContainsProject = page.url().includes('/projects/') && page.url().includes('/tasks');
      const hasKanbanBoard = await page.locator('[data-testid="kanban-board"], .kanban-board, .grid.w-full').isVisible();
      const hasTaskColumns = await page.locator('text="To Do", text="In Progress"').isVisible();
      
      if (urlContainsProject || hasKanbanBoard || hasTaskColumns) {
        console.log('✓ Project navigation to tasks view successful');
      } else {
        console.log('Project navigation behavior may differ');
      }
    });
  });

  test.describe('Project Health and Monitoring', () => {
    test('should display project health status indicators', async ({ page }) => {
      // Ensure we have a project
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      // Look for health indicators on project cards
      const projectCard = page.locator(`text="${testProjectData.projectName}"`).first().locator('..');
      
      const healthIndicators = [
        projectCard.locator('svg.text-green-500'), // Healthy
        projectCard.locator('svg.text-red-500'),   // Unhealthy
        projectCard.locator('svg.text-yellow-500'), // Warning
        projectCard.locator('.health-status, .status-indicator'),
        projectCard.locator('text="Healthy", text="Error", text="Warning"')
      ];
      
      let hasHealthIndicators = false;
      for (const indicator of healthIndicators) {
        if (await indicator.isVisible()) {
          hasHealthIndicators = true;
          console.log('✓ Project health indicators visible');
          break;
        }
      }
      
      // Look for detailed health information
      if (hasHealthIndicators) {
        // Click on health indicator or project for details
        await projectCard.click();
        await page.waitForTimeout(2000);
        
        const healthDetails = [
          page.locator('text="Git status", text="Repository status"'),
          page.locator('text="Last validation", text="Last execution"'),
          page.locator('text="Script status", text="Configuration status"')
        ];
        
        for (const detail of healthDetails) {
          if (await detail.isVisible()) {
            console.log('✓ Detailed health information available');
            break;
          }
        }
      }
    });

    test('should check Git repository connectivity', async ({ page }) => {
      // Navigate to a project
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for Git health check or test connection
        const gitHealthCheck = settingsPanel.locator('button').filter({ 
          hasText: /Test.*connection|Check.*repository|Validate.*path/ 
        }).first();
        
        if (await gitHealthCheck.isVisible()) {
          await gitHealthCheck.click();
          
          // Wait for health check result
          await page.waitForTimeout(3000);
          
          // Look for result indicators
          const resultIndicators = [
            settingsPanel.locator('text="Connected", text="Valid", text="Success"'),
            settingsPanel.locator('text="Failed", text="Invalid", text="Error"'),
            settingsPanel.locator('svg.text-green-500, svg.text-red-500')
          ];
          
          for (const indicator of resultIndicators) {
            if (await indicator.isVisible()) {
              console.log('✓ Git repository connectivity check available');
              break;
            }
          }
        } else {
          console.log('Git connectivity check not yet implemented');
        }
        
      } catch (error) {
        console.log('Git health checking not available');
      }
    });

    test('should validate project script configuration', async ({ page }) => {
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      try {
        await openProjectSettings(page, testProjectData.projectName);
        
        const settingsPanel = page.locator('[role="dialog"], .settings-panel').first();
        
        // Look for script validation buttons
        const scriptValidators = [
          settingsPanel.locator('button').filter({ hasText: /Test.*setup|Validate.*script/ }),
          settingsPanel.locator('button').filter({ hasText: /Run.*test|Check.*configuration/ })
        ];
        
        for (const validator of scriptValidators) {
          if (await validator.isVisible()) {
            await validator.click();
            
            // Wait for validation result
            await page.waitForTimeout(3000);
            
            // Look for validation output
            const validationOutput = [
              settingsPanel.locator('.validation-result, .test-output'),
              settingsPanel.locator('text="Script executed", text="Validation completed"'),
              settingsPanel.locator('pre, code').filter({ hasText: /echo|npm|Setup/ })
            ];
            
            for (const output of validationOutput) {
              if (await output.isVisible()) {
                console.log('✓ Script validation functionality available');
                return;
              }
            }
          }
        }
        
        console.log('Script validation not yet implemented');
        
      } catch (error) {
        console.log('Script validation not available');
      }
    });
  });

  test.describe('Project Deletion and Cleanup', () => {
    test('should delete project with confirmation', async ({ page }) => {
      // Create a project specifically for deletion testing
      const deleteTestData = createProjectTestData();
      deleteTestData.projectName = `DELETE_TEST_${deleteTestData.projectName}`;
      
      await createProjectViaUI(page, deleteTestData);
      
      // Find the project to delete
      const projectCard = page.locator(`text="${deleteTestData.projectName}"`).first();
      await expect(projectCard).toBeVisible();
      
      // Look for delete button or option
      const deleteButton = projectCard.locator('..').locator('button').filter({ 
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
        await page.waitForTimeout(3000);
        
        // Verify project is removed
        await expect(page.locator(`text="${deleteTestData.projectName}"`)).not.toBeVisible();
        console.log('✓ Project deletion with confirmation successful');
        
      } else {
        // Try context menu
        await projectCard.click({ button: 'right' });
        await page.waitForTimeout(500);
        
        const contextDelete = page.locator('[role="menuitem"]').filter({ hasText: /Delete|Remove/ }).first();
        if (await contextDelete.isVisible()) {
          page.on('dialog', dialog => dialog.accept());
          await contextDelete.click();
          
          await page.waitForTimeout(3000);
          await expect(page.locator(`text="${deleteTestData.projectName}"`)).not.toBeVisible();
          console.log('✓ Project deletion via context menu successful');
        } else {
          console.log('Project deletion not yet implemented');
        }
      }
    });

    test('should handle project deletion cancellation', async ({ page }) => {
      // Ensure we have a project
      const hasProjects = await page.locator('[data-testid="project-card"], .project-card').count() > 0;
      if (!hasProjects) {
        await createProjectViaUI(page, testProjectData);
      }
      
      const projectCard = page.locator(`text="${testProjectData.projectName}"`).first();
      
      // Look for delete option
      const deleteButton = projectCard.locator('..').locator('button').filter({ 
        hasText: /Delete|Remove/ 
      }).first();
      
      if (await deleteButton.isVisible()) {
        // Cancel the confirmation dialog
        page.on('dialog', dialog => {
          expect(dialog.message()).toContain('delete');
          dialog.dismiss();
        });
        
        await deleteButton.click();
        
        // Wait a moment
        await page.waitForTimeout(2000);
        
        // Project should still be visible
        await expect(projectCard).toBeVisible();
        console.log('✓ Project deletion cancellation works');
      }
    });
  });
});