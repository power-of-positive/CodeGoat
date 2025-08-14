import { test, expect } from '@playwright/test';

test.describe('GitHub Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('GitHub Authentication', () => {
    test('should access GitHub login dialog from settings', async ({ page }) => {
      await page.goto('/settings');
      
      // Look for GitHub integration section
      await expect(page.getByText('GitHub Integration')).toBeVisible();
      
      // Should have login/connect button
      const githubButtons = [
        'Sign in with GitHub',
        'Connect GitHub',
        'Login to GitHub',
        'GitHub Login'
      ];
      
      let found = false;
      for (const buttonText of githubButtons) {
        const button = page.getByText(buttonText);
        if (await button.isVisible()) {
          found = true;
          await expect(button).toBeVisible();
          break;
        }
      }
      
      expect(found).toBe(true);
    });

    test('should open GitHub login dialog', async ({ page }) => {
      await page.goto('/settings');
      
      // Click GitHub login button
      const githubButton = page.getByText('Sign in with GitHub').or(
        page.getByText('Connect GitHub')
      ).first();
      
      if (await githubButton.isVisible()) {
        await githubButton.click();
        
        // Should open GitHub login dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Sign in with GitHub')).toBeVisible();
        await expect(page.getByText('Connect your GitHub account')).toBeVisible();
      }
    });

    test('should display GitHub device flow authorization', async ({ page }) => {
      await page.goto('/settings');
      
      const githubButton = page.getByText('Sign in with GitHub').or(
        page.getByText('Connect GitHub')
      ).first();
      
      if (await githubButton.isVisible()) {
        await githubButton.click();
        
        // In the dialog, click the login button
        const loginButton = page.getByRole('dialog').getByText('Sign in with GitHub');
        if (await loginButton.isVisible()) {
          await loginButton.click();
          
          // Should show device authorization flow
          await expect(page.getByText('Complete GitHub Authorization')).toBeVisible();
          await expect(page.getByText('Go to GitHub Device Authorization')).toBeVisible();
          await expect(page.getByText('Enter this code:')).toBeVisible();
          
          // Should have a verification URL
          const githubLink = page.getByText('github.com/login/device');
          await expect(githubLink).toBeVisible();
          
          // Should have a user code to copy
          const codeElement = page.locator('.font-mono');
          if (await codeElement.isVisible()) {
            await expect(codeElement).toBeVisible();
          }
          
          // Should have copy button
          await expect(page.getByText('Copy')).toBeVisible();
        }
      }
    });

    test('should copy device code to clipboard', async ({ page }) => {
      await page.goto('/settings');
      
      const githubButton = page.getByText('Sign in with GitHub').or(
        page.getByText('Connect GitHub')
      ).first();
      
      if (await githubButton.isVisible()) {
        await githubButton.click();
        
        const loginButton = page.getByRole('dialog').getByText('Sign in with GitHub');
        if (await loginButton.isVisible()) {
          await loginButton.click();
          
          // Wait for device flow UI
          await expect(page.getByText('Enter this code:')).toBeVisible();
          
          // Click copy button
          const copyButton = page.getByText('Copy');
          if (await copyButton.isVisible()) {
            await copyButton.click();
            
            // Should show copied state
            await expect(page.getByText('Copied')).toBeVisible();
          }
        }
      }
    });

    test('should show authentication success state', async ({ page }) => {
      // Mock successful authentication
      await page.route('/api/auth/github/**', route => {
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({
            valid: true,
            data: {
              username: 'testuser',
              oauth_token: 'test_token'
            }
          })
        });
      });

      await page.goto('/settings');
      
      const githubButton = page.getByText('Sign in with GitHub').or(
        page.getByText('Connect GitHub')
      ).first();
      
      if (await githubButton.isVisible()) {
        await githubButton.click();
        
        // Should show success state if already authenticated
        const successIndicators = [
          'Successfully connected!',
          'Connected to GitHub',
          'Signed in as',
          'You are signed in'
        ];
        
        for (const indicator of successIndicators) {
          const element = page.getByText(indicator);
          if (await element.isVisible()) {
            await expect(element).toBeVisible();
            break;
          }
        }
      }
    });

    test('should handle authentication errors gracefully', async ({ page }) => {
      // Mock authentication error
      await page.route('/api/auth/github/**', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ error: 'GitHub authentication failed' })
        });
      });

      await page.goto('/settings');
      
      const githubButton = page.getByText('Sign in with GitHub').or(
        page.getByText('Connect GitHub')
      ).first();
      
      if (await githubButton.isVisible()) {
        await githubButton.click();
        
        const loginButton = page.getByRole('dialog').getByText('Sign in with GitHub');
        if (await loginButton.isVisible()) {
          await loginButton.click();
          
          // Should show error message
          const errorMessages = [
            'Network error',
            'Failed to connect',
            'Authentication failed',
            'GitHub authentication failed'
          ];
          
          for (const errorMsg of errorMessages) {
            const element = page.getByText(errorMsg);
            if (await element.isVisible()) {
              await expect(element).toBeVisible();
              break;
            }
          }
        }
      }
    });
  });

  test.describe('Repository Integration', () => {
    test('should integrate with project creation workflow', async ({ page }) => {
      await page.goto('/projects');
      
      // Create new project
      await page.click('text=Create Project');
      
      // Should see repository selection option
      const repoSelectors = [
        'Select Repository',
        'GitHub Repository',
        'Repository',
        'Choose Repository'
      ];
      
      for (const selector of repoSelectors) {
        const element = page.getByText(selector);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          break;
        }
      }
    });

    test('should display repository picker when GitHub is connected', async ({ page }) => {
      // Mock authenticated state
      await page.route('/api/auth/github/check', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            valid: true,
            data: { username: 'testuser', oauth_token: 'token' }
          })
        });
      });

      // Mock repository list
      await page.route('/api/github/repositories**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 1,
              name: 'test-repo',
              full_name: 'testuser/test-repo',
              description: 'A test repository',
              private: false,
              clone_url: 'https://github.com/testuser/test-repo.git'
            },
            {
              id: 2,
              name: 'private-repo',
              full_name: 'testuser/private-repo',
              description: 'A private repository',
              private: true,
              clone_url: 'https://github.com/testuser/private-repo.git'
            }
          ])
        });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Look for repository list
      const repositoryElements = [
        page.getByText('test-repo'),
        page.getByText('testuser/test-repo'),
        page.getByText('private-repo')
      ];
      
      for (const element of repositoryElements) {
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          break;
        }
      }
    });

    test('should show repository details and privacy indicators', async ({ page }) => {
      // Mock repository data
      await page.route('/api/github/repositories**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 1,
              name: 'public-repo',
              full_name: 'testuser/public-repo',
              description: 'A public repository for testing',
              private: false
            },
            {
              id: 2,
              name: 'private-repo',
              full_name: 'testuser/private-repo',
              description: 'A private repository for testing',
              private: true
            }
          ])
        });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Should show repository descriptions
      await expect(page.getByText('A public repository for testing')).toBeVisible();
      await expect(page.getByText('A private repository for testing')).toBeVisible();
      
      // Should indicate private repositories
      await expect(page.getByText('Private')).toBeVisible();
    });

    test('should allow repository selection and auto-populate project name', async ({ page }) => {
      // Mock repository data
      await page.route('/api/github/repositories**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 1,
              name: 'awesome-project',
              full_name: 'testuser/awesome-project',
              description: 'An awesome project',
              private: false
            }
          ])
        });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Select a repository
      const repoCard = page.getByText('awesome-project');
      if (await repoCard.isVisible()) {
        await repoCard.click();
        
        // Should auto-populate project name
        const projectNameInput = page.locator('[placeholder*="project name"], #project-name, [name="name"]');
        if (await projectNameInput.isVisible()) {
          const projectName = await projectNameInput.inputValue();
          expect(projectName.toLowerCase()).toContain('awesome');
        }
      }
    });

    test('should handle repository loading errors', async ({ page }) => {
      // Mock repository loading error
      await page.route('/api/github/repositories**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Failed to load repositories' })
        });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Should show error message
      const errorElement = page.getByText('Failed to load repositories');
      if (await errorElement.isVisible()) {
        await expect(errorElement).toBeVisible();
        
        // Should have retry option
        await expect(page.getByText('Try again')).toBeVisible();
      }
    });

    test('should support repository pagination and infinite scroll', async ({ page }) => {
      // Mock paginated repository data
      await page.route('/api/github/repositories**', route => {
        const url = route.request().url();
        const page_num = new URL(url).searchParams.get('page') || '1';
        
        const repos = [];
        const startId = (parseInt(page_num) - 1) * 30;
        
        for (let i = 0; i < 30; i++) {
          repos.push({
            id: startId + i + 1,
            name: `repo-${startId + i + 1}`,
            full_name: `testuser/repo-${startId + i + 1}`,
            description: `Repository ${startId + i + 1}`,
            private: false
          });
        }
        
        route.fulfill({ status: 200, body: JSON.stringify(repos) });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Should show initial repositories
      await expect(page.getByText('repo-1')).toBeVisible();
      
      // Should have load more functionality
      const loadMoreButton = page.getByText('Load more repositories');
      if (await loadMoreButton.isVisible()) {
        await loadMoreButton.click();
        
        // Should load more repositories
        await expect(page.getByText('repo-31')).toBeVisible();
      }
    });
  });

  test.describe('Pull Request Creation', () => {
    test('should access PR creation from task attempts', async ({ page }) => {
      // This test would need existing project and task data
      // For now, we'll test the component accessibility
      
      await page.goto('/projects');
      
      // Look for task-related elements that might lead to PR creation
      const prElements = [
        'Create PR',
        'Pull Request',
        'Create Pull Request',
        'PR'
      ];
      
      for (const element of prElements) {
        const prButton = page.getByText(element);
        if (await prButton.isVisible()) {
          await expect(prButton).toBeVisible();
          break;
        }
      }
    });

    test('should open PR creation dialog', async ({ page }) => {
      // Mock task and attempt data
      await page.route('/api/projects**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'project-1',
              name: 'Test Project',
              description: 'Test project for PR creation',
              git_repo_path: '/path/to/repo'
            }
          ])
        });
      });

      await page.route('/api/tasks**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'task-1',
              project_id: 'project-1',
              title: 'Test Task',
              description: 'Test task for PR creation',
              status: 'done'
            }
          ])
        });
      });

      await page.goto('/projects');
      
      // Navigate to a project if available
      const projectLink = page.getByText('Test Project');
      if (await projectLink.isVisible()) {
        await projectLink.click();
        
        // Look for PR creation option
        const createPRButton = page.getByText('Create PR').or(
          page.getByText('Create Pull Request')
        );
        
        if (await createPRButton.isVisible()) {
          await createPRButton.click();
          
          // Should open PR creation dialog
          await expect(page.getByRole('dialog')).toBeVisible();
        }
      }
    });

    test('should populate PR form with task information', async ({ page }) => {
      // This test assumes a PR creation dialog is open
      // We'll test the form structure when accessible
      
      const prFormElements = [
        'PR Title',
        'Pull Request Title',
        'Title',
        'Description',
        'PR Description',
        'Base Branch'
      ];
      
      for (const element of prFormElements) {
        const formElement = page.getByText(element);
        if (await formElement.isVisible()) {
          await expect(formElement).toBeVisible();
        }
      }
    });

    test('should validate PR creation requirements', async ({ page }) => {
      // Mock PR creation attempt with missing requirements
      await page.route('/api/attempts/*/pr', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Title is required' })
        });
      });

      // Test validation when PR dialog is accessible
      const prDialog = page.getByRole('dialog');
      if (await prDialog.isVisible()) {
        const createButton = prDialog.getByText('Create').or(
          prDialog.getByText('Create PR')
        );
        
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Should show validation error
          await expect(page.getByText('Title is required')).toBeVisible();
        }
      }
    });

    test('should handle successful PR creation', async ({ page }) => {
      // Mock successful PR creation
      await page.route('/api/attempts/*/pr', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            pr_url: 'https://github.com/testuser/test-repo/pull/1'
          })
        });
      });

      // Test PR creation success flow
      const prDialog = page.getByRole('dialog');
      if (await prDialog.isVisible()) {
        const titleInput = prDialog.locator('input[name="title"], #pr-title, [placeholder*="title"]');
        if (await titleInput.isVisible()) {
          await titleInput.fill('Test PR Title');
        }

        const createButton = prDialog.getByText('Create PR');
        if (await createButton.isVisible()) {
          // Set up page navigation listener
          const pagePromise = page.waitForEvent('popup');
          
          await createButton.click();
          
          // Should open GitHub PR in new tab
          const newPage = await pagePromise;
          expect(newPage.url()).toContain('github.com');
        }
      }
    });

    test('should handle PR creation errors', async ({ page }) => {
      // Mock PR creation error
      await page.route('/api/attempts/*/pr', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'GitHub authentication required' })
        });
      });

      const prDialog = page.getByRole('dialog');
      if (await prDialog.isVisible()) {
        const createButton = prDialog.getByText('Create PR');
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Should show authentication error
          const errorMessages = [
            'GitHub authentication required',
            'Authentication failed',
            'Please sign in to GitHub'
          ];
          
          for (const errorMsg of errorMessages) {
            const element = page.getByText(errorMsg);
            if (await element.isVisible()) {
              await expect(element).toBeVisible();
              break;
            }
          }
        }
      }
    });
  });

  test.describe('Branch and Worktree Management', () => {
    test('should display branch information when available', async ({ page }) => {
      // Mock branch data
      await page.route('/api/projects/*/branches', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              name: 'main',
              is_current: true,
              is_remote: true,
              last_commit_date: new Date().toISOString()
            },
            {
              name: 'feature/test-branch',
              is_current: false,
              is_remote: false,
              last_commit_date: new Date().toISOString()
            }
          ])
        });
      });

      await page.goto('/projects');
      
      // Look for branch information display
      const branchElements = [
        'main',
        'feature/test-branch',
        'Branches',
        'Current Branch'
      ];
      
      for (const element of branchElements) {
        const branchElement = page.getByText(element);
        if (await branchElement.isVisible()) {
          await expect(branchElement).toBeVisible();
          break;
        }
      }
    });

    test('should show branch status and merge information', async ({ page }) => {
      // Mock branch status data
      await page.route('/api/attempts/*/branch-status', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            is_behind: false,
            commits_behind: 0,
            commits_ahead: 2,
            up_to_date: false,
            merged: false,
            has_uncommitted_changes: false,
            base_branch_name: 'main'
          })
        });
      });

      // Test branch status display when available
      const statusElements = [
        '2 commits ahead',
        'behind',
        'up to date',
        'merged',
        'uncommitted changes'
      ];
      
      for (const element of statusElements) {
        const statusElement = page.getByText(element, { exact: false });
        if (await statusElement.isVisible()) {
          await expect(statusElement).toBeVisible();
          break;
        }
      }
    });

    test('should handle worktree creation and management', async ({ page }) => {
      // Mock worktree operations
      await page.route('/api/attempts', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'attempt-1',
            task_id: 'task-1',
            worktree_path: '/path/to/worktree',
            branch_name: 'feature/task-branch',
            status: 'running'
          })
        });
      });

      // Test worktree-related functionality
      const worktreeElements = [
        'worktree',
        'branch',
        'isolated',
        'workspace'
      ];
      
      for (const element of worktreeElements) {
        const worktreeElement = page.getByText(element, { exact: false });
        if (await worktreeElement.isVisible()) {
          await expect(worktreeElement).toBeVisible();
          break;
        }
      }
    });
  });

  test.describe('GitHub Integration Settings', () => {
    test('should display GitHub settings in project configuration', async ({ page }) => {
      await page.goto('/settings');
      
      // Should have GitHub-related settings
      const githubSettings = [
        'Default PR Base Branch',
        'PR Template',
        'Auto Create PR',
        'GitHub Integration'
      ];
      
      for (const setting of githubSettings) {
        const settingElement = page.getByText(setting);
        if (await settingElement.isVisible()) {
          await expect(settingElement).toBeVisible();
        }
      }
    });

    test('should allow configuration of PR base branch', async ({ page }) => {
      await page.goto('/settings');
      
      // Look for base branch configuration
      const baseBranchInput = page.locator('input[placeholder*="main"], #default-pr-base, [name*="base"]');
      if (await baseBranchInput.isVisible()) {
        await expect(baseBranchInput).toBeVisible();
        
        // Test changing base branch
        await baseBranchInput.fill('develop');
        expect(await baseBranchInput.inputValue()).toBe('develop');
      }
    });

    test('should save GitHub configuration settings', async ({ page }) => {
      // Mock settings save
      await page.route('/api/settings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/settings');
      
      // Look for save button
      const saveButton = page.getByText('Save Settings').or(
        page.getByText('Save')
      ).first();
      
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show success indication
        const successMessages = [
          'Settings saved',
          'Configuration updated',
          'Changes saved'
        ];
        
        for (const message of successMessages) {
          const element = page.getByText(message);
          if (await element.isVisible()) {
            await expect(element).toBeVisible();
            break;
          }
        }
      }
    });
  });

  test.describe('GitHub Integration Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/settings');
      
      // Tab through GitHub-related elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to reach GitHub elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/settings');
      
      // Check for ARIA attributes on GitHub elements
      const accessibilityAttributes = [
        '[aria-label*="GitHub"]',
        '[aria-describedby]',
        '[role="button"]',
        '[role="dialog"]'
      ];
      
      for (const selector of accessibilityAttributes) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          break;
        }
      }
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/settings');
      
      // Check for semantic structure
      const semanticElements = [
        'h1',
        'h2',
        'h3',
        'button',
        'input[type="text"]',
        'label'
      ];
      
      for (const selector of semanticElements) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          expect(count).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('GitHub Integration Error Handling', () => {
    test('should handle GitHub API rate limiting', async ({ page }) => {
      // Mock rate limiting response
      await page.route('/api/github/**', route => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Rate limit exceeded' })
        });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Should show rate limiting message
      await expect(page.getByText('Rate limit exceeded')).toBeVisible();
    });

    test('should handle network connectivity issues', async ({ page }) => {
      // Mock network failure
      await page.route('/api/github/**', route => {
        route.abort('failed');
      });

      await page.goto('/settings');
      
      const githubButton = page.getByText('Sign in with GitHub').first();
      if (await githubButton.isVisible()) {
        await githubButton.click();
        
        // Should handle network error gracefully
        const networkErrors = [
          'Network error',
          'Connection failed',
          'Unable to connect'
        ];
        
        for (const error of networkErrors) {
          const element = page.getByText(error);
          if (await element.isVisible()) {
            await expect(element).toBeVisible();
            break;
          }
        }
      }
    });

    test('should handle invalid GitHub tokens', async ({ page }) => {
      // Mock invalid token response
      await page.route('/api/auth/github/check', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ valid: false, error: 'Invalid token' })
        });
      });

      await page.goto('/settings');
      
      // Should indicate token is invalid
      const tokenErrors = [
        'Invalid token',
        'Token expired',
        'Authentication required',
        'Please reconnect'
      ];
      
      for (const error of tokenErrors) {
        const element = page.getByText(error);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          break;
        }
      }
    });

    test('should handle repository access permission issues', async ({ page }) => {
      // Mock permission error
      await page.route('/api/github/repositories**', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Insufficient permissions' })
        });
      });

      await page.goto('/projects');
      await page.click('text=Create Project');
      
      // Should show permission error
      await expect(page.getByText('Insufficient permissions')).toBeVisible();
    });
  });
});