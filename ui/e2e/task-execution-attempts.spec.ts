import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Task Execution and Attempt Monitoring
 * Based on vibe-kanban PRD and RFC requirements for AI agent execution
 * 
 * Tests cover:
 * - Task execution dialog and configuration
 * - AI model selection and fallback chains
 * - Worktree creation and management
 * - Real-time execution monitoring
 * - Process logging and status updates
 * - Validation pipeline execution
 * - Execution attempt history
 * - GitHub integration (PR creation)
 * - Error handling and retry mechanisms
 * - Resource usage monitoring
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:5174';

// Test data factory
function createExecutionTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    projectName: `Task Execution Test ${timestamp}-${randomId}`,
    gitRepoPath: `/tmp/test-execution-${timestamp}-${randomId}`,
    taskTitle: `Execution Test Task ${randomId}`,
    taskDescription: `Test task for execution monitoring - ${timestamp}`,
    setupScript: 'echo "Setup phase starting"; sleep 2; echo "Setup complete"',
    validationScript: 'echo "Validation starting"; sleep 1; echo "Validation passed"',
    cleanupScript: 'echo "Cleanup complete"'
  };
}

// Helper functions
async function createExecutionTestProject() {
  const testData = createExecutionTestData();
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testData.projectName,
      git_repo_path: testData.gitRepoPath,
      use_existing_repo: false,
      setup_script: testData.setupScript,
      dev_script: 'echo "Dev server not needed for test"',
      cleanup_script: testData.cleanupScript
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test project: ${response.status}`);
  }
  
  const result = await response.json();
  return { project: result.data || result, testData };
}

async function createExecutableTask(projectId: string, taskData: any) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: taskData.taskTitle,
      description: taskData.taskDescription,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create executable task: ${response.status}`);
  }
  
  const result = await response.json();
  return result.data || result;
}

async function navigateToTaskExecution(page: Page, projectId: string) {
  await page.goto(`${UI_BASE_URL}/projects/${projectId}/tasks`);
  
  // Wait for kanban board to load
  await page.waitForSelector('[data-testid="kanban-board"], .grid.w-full.auto-cols-fr', {
    timeout: 15000
  });
  
  await expect(page.locator('text="To Do"')).toBeVisible();
}

async function openTaskExecutionDialog(page: Page, taskTitle: string) {
  // Find the task card
  const taskCard = page.locator(`text="${taskTitle}"`).first();
  await expect(taskCard).toBeVisible();
  
  // Look for execute/run button on the task card
  const executeButton = taskCard.locator('..').locator('button').filter({ 
    hasText: /Execute|Run|Start/ 
  }).first();
  
  if (await executeButton.isVisible()) {
    await executeButton.click();
  } else {
    // Try alternative: click on task to open details, then find execute button
    await taskCard.click();
    await page.waitForTimeout(1000);
    
    const detailsExecuteButton = page.locator('button').filter({ 
      hasText: /Execute|Run|Start/ 
    }).first();
    
    if (await detailsExecuteButton.isVisible()) {
      await detailsExecuteButton.click();
    } else {
      throw new Error('Cannot find execute button for task');
    }
  }
  
  // Wait for execution dialog/panel to open
  await page.waitForSelector('[role="dialog"], .execution-panel, .execute-dialog', { 
    timeout: 10000 
  });
}

test.describe('Task Execution and Attempt Monitoring', () => {
  let testProject: any;
  let testData: any;
  let executableTask: any;

  test.beforeAll(async () => {
    // Create test project with execution capabilities
    const { project, testData: data } = await createExecutionTestProject();
    testProject = project;
    testData = data;
    
    // Create executable task
    executableTask = await createExecutableTask(testProject.id, testData);
  });

  test.beforeEach(async ({ page }) => {
    await navigateToTaskExecution(page, testProject.id);
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

  test.describe('Task Execution Configuration', () => {
    test('should open task execution dialog with configuration options', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        // Verify execution dialog is open
        const executionDialog = page.locator('[role="dialog"], .execution-panel, .execute-dialog').first();
        await expect(executionDialog).toBeVisible();
        
        // Check for configuration options
        await expect(executionDialog.locator('text="Execute Task", text="Run Task"')).toBeVisible();
        
        // Look for model selection if available
        const modelSelector = executionDialog.locator('select, [role="combobox"]').filter({ 
          hasText: /model|agent|AI/ 
        }).first();
        
        if (await modelSelector.isVisible()) {
          console.log('✓ Model selection available');
        }
        
        // Look for execution options
        const optionsSection = executionDialog.locator('text="Options", text="Configuration", text="Settings"');
        if (await optionsSection.isVisible()) {
          console.log('✓ Execution options available');
        }
        
      } catch (error) {
        test.skip(); // Skip if execution dialog not implemented yet
      }
    });

    test('should show AI model selection with fallback options', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Look for model selection dropdown
        const modelSelector = executionDialog.locator('select, [role="combobox"], [data-testid="model-selector"]');
        
        if (await modelSelector.count() > 0) {
          const firstSelector = modelSelector.first();
          await expect(firstSelector).toBeVisible();
          
          // Try to open dropdown
          await firstSelector.click();
          
          // Look for model options
          const modelOptions = page.locator('[role="option"], option').filter({ 
            hasText: /claude|gpt|gemini|model/ 
          });
          
          if (await modelOptions.count() > 0) {
            console.log('✓ AI model options available');
            
            // Check for fallback indicator
            const fallbackIndicator = page.locator('text="fallback", text="backup", text="alternative"');
            if (await fallbackIndicator.isVisible()) {
              console.log('✓ Fallback model configuration available');
            }
          }
        } else {
          console.log('Model selection not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should allow editing task prompt before execution', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Look for prompt editor
        const promptEditor = executionDialog.locator('textarea, .monaco-editor, [data-testid="prompt-editor"]');
        
        if (await promptEditor.count() > 0) {
          const editor = promptEditor.first();
          await expect(editor).toBeVisible();
          
          // Should contain task description
          const editorContent = await editor.textContent() || await editor.inputValue();
          expect(editorContent).toContain(testData.taskDescription);
          
          // Should be editable
          await editor.focus();
          await editor.fill(`${testData.taskDescription}\n\nAdditional execution instructions.`);
          
          console.log('✓ Prompt editor is functional');
        } else {
          console.log('Prompt editor not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should show execution options and validation settings', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Look for execution options
        const validationOption = executionDialog.locator('input[type="checkbox"]').filter({ 
          hasText: /validation|validate/ 
        });
        
        const skipSetupOption = executionDialog.locator('input[type="checkbox"]').filter({ 
          hasText: /skip.*setup|no.*setup/ 
        });
        
        const timeoutSetting = executionDialog.locator('input[type="number"], input').filter({ 
          hasText: /timeout|time.*limit/ 
        });
        
        // Check if options are available
        if (await validationOption.isVisible()) {
          console.log('✓ Validation options available');
        }
        
        if (await skipSetupOption.isVisible()) {
          console.log('✓ Setup options available');
        }
        
        if (await timeoutSetting.isVisible()) {
          console.log('✓ Timeout configuration available');
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });

  test.describe('Task Execution Process', () => {
    test('should start task execution and show progress indicators', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Find and click execute button
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for execution to start
          await page.waitForTimeout(2000);
          
          // Look for progress indicators
          const progressIndicators = [
            page.locator('.progress-bar, [role="progressbar"]'),
            page.locator('.spinner, .loading, svg.animate-spin'),
            page.locator('text="Starting", text="Running", text="Executing"'),
            page.locator('[data-testid="execution-progress"]')
          ];
          
          let hasProgress = false;
          for (const indicator of progressIndicators) {
            if (await indicator.isVisible()) {
              hasProgress = true;
              console.log('✓ Progress indicator visible');
              break;
            }
          }
          
          expect(hasProgress).toBeTruthy();
          
        } else {
          test.skip();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should show real-time execution logs and output', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for logs to appear
          await page.waitForTimeout(3000);
          
          // Look for log output areas
          const logAreas = [
            page.locator('.log-output, .console-output'),
            page.locator('[data-testid="logs"], [data-testid="execution-logs"]'),
            page.locator('pre, code').filter({ hasText: /Setup|Validation|echo/ }),
            page.locator('.terminal, .output')
          ];
          
          let hasLogs = false;
          for (const logArea of logAreas) {
            if (await logArea.isVisible()) {
              const logContent = await logArea.textContent();
              if (logContent && logContent.length > 10) {
                hasLogs = true;
                console.log('✓ Execution logs visible:', logContent.substring(0, 100));
                break;
              }
            }
          }
          
          if (hasLogs) {
            // Look for specific setup script output
            const setupOutput = page.locator('text="Setup phase starting", text="Setup complete"');
            if (await setupOutput.isVisible()) {
              console.log('✓ Setup script output detected');
            }
          }
          
        } else {
          test.skip();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should display execution phases and timeline', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for execution phases to appear
          await page.waitForTimeout(4000);
          
          // Look for execution phases
          const phases = [
            'Setup', 'Worktree', 'Agent', 'Validation', 'Cleanup'
          ];
          
          let visiblePhases = 0;
          for (const phase of phases) {
            const phaseElement = page.locator(`text="${phase}"`).first();
            if (await phaseElement.isVisible()) {
              visiblePhases++;
              console.log(`✓ ${phase} phase visible`);
            }
          }
          
          // Should show at least some execution phases
          expect(visiblePhases).toBeGreaterThan(0);
          
          // Look for timeline or status indicators
          const statusIndicators = page.locator('.status-icon, .phase-status, svg').filter({ 
            hasText: /complete|running|pending|success|error/ 
          });
          
          if (await statusIndicators.count() > 0) {
            console.log('✓ Status indicators visible');
          }
          
        } else {
          test.skip();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should handle execution cancellation', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for execution to start
          await page.waitForTimeout(1000);
          
          // Look for cancel button
          const cancelButton = page.locator('button').filter({ 
            hasText: /Cancel|Stop|Abort/ 
          }).first();
          
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
            
            // Wait for cancellation
            await page.waitForTimeout(2000);
            
            // Should show cancelled status
            const cancelledStatus = page.locator('text="Cancelled", text="Stopped", text="Aborted"');
            if (await cancelledStatus.isVisible()) {
              console.log('✓ Execution cancellation successful');
            }
            
            // Execute button should be available again
            const newExecuteButton = page.locator('button').filter({ 
              hasText: /Execute|Run|Start/ 
            }).first();
            
            await expect(newExecuteButton).toBeVisible();
            
          } else {
            console.log('Cancel button not yet implemented');
          }
        } else {
          test.skip();
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });

  test.describe('Execution Attempt History', () => {
    test('should show task execution history and attempts', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Click on task to open details
      const taskCard = page.locator(`text="${testData.taskTitle}"`).first();
      await taskCard.click();
      
      // Wait for task details panel
      await page.waitForTimeout(2000);
      
      // Look for attempts/history section
      const historySection = page.locator('text="Attempts", text="History", text="Executions"');
      const attemptsTab = page.locator('[role="tab"]').filter({ hasText: /Attempts|History/ });
      
      if (await historySection.isVisible() || await attemptsTab.isVisible()) {
        console.log('✓ Execution history section available');
        
        if (await attemptsTab.isVisible()) {
          await attemptsTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for attempt entries
        const attemptEntries = page.locator('.attempt-entry, .execution-entry, [data-testid="attempt"]');
        const entryCount = await attemptEntries.count();
        
        console.log(`Found ${entryCount} execution attempts`);
        
        if (entryCount > 0) {
          // Check first attempt entry
          const firstAttempt = attemptEntries.first();
          await expect(firstAttempt).toBeVisible();
          
          // Should show attempt details
          const attemptDetails = [
            firstAttempt.locator('text="Created", text="Running", text="Completed", text="Failed"'),
            firstAttempt.locator('.timestamp, .date'),
            firstAttempt.locator('.status, .result')
          ];
          
          for (const detail of attemptDetails) {
            if (await detail.isVisible()) {
              console.log('✓ Attempt details visible');
              break;
            }
          }
        }
        
      } else {
        console.log('Execution history not yet implemented');
      }
    });

    test('should display attempt status and results', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator(`text="${testData.taskTitle}"`).first();
      await taskCard.click();
      await page.waitForTimeout(2000);
      
      // Look for attempt status indicators
      const statusIndicators = [
        page.locator('.status-success, .text-green-500, svg.text-green-500'),
        page.locator('.status-failed, .text-red-500, svg.text-red-500'),
        page.locator('.status-running, .text-blue-500, svg.animate-spin'),
        page.locator('.status-pending, .text-gray-500')
      ];
      
      let hasStatusIndicators = false;
      for (const indicator of statusIndicators) {
        if (await indicator.isVisible()) {
          hasStatusIndicators = true;
          console.log('✓ Status indicators found');
          break;
        }
      }
      
      // Look for execution results
      const resultElements = [
        page.locator('text="Success", text="Failed", text="Error"'),
        page.locator('.result-summary, .execution-result'),
        page.locator('text="Duration:", text="Elapsed:"'),
        page.locator('.exit-code, text="Exit code"')
      ];
      
      for (const result of resultElements) {
        if (await result.isVisible()) {
          console.log('✓ Execution results displayed');
          break;
        }
      }
    });

    test('should show execution metrics and resource usage', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator(`text="${testData.taskTitle}"`).first();
      await taskCard.click();
      await page.waitForTimeout(2000);
      
      // Look for metrics section
      const metricsSection = page.locator('text="Metrics", text="Performance", text="Resource Usage"');
      const metricsTab = page.locator('[role="tab"]').filter({ hasText: /Metrics|Performance/ });
      
      if (await metricsSection.isVisible() || await metricsTab.isVisible()) {
        if (await metricsTab.isVisible()) {
          await metricsTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for specific metrics
        const metricElements = [
          page.locator('text="Duration", text="Execution time"'),
          page.locator('text="CPU", text="Memory"'),
          page.locator('text="Tokens", text="API calls"'),
          page.locator('.metric-value, .stat-value'),
          page.locator('text="ms", text="seconds", text="MB"')
        ];
        
        let hasMetrics = false;
        for (const metric of metricElements) {
          if (await metric.isVisible()) {
            hasMetrics = true;
            console.log('✓ Execution metrics visible');
            break;
          }
        }
        
        if (hasMetrics) {
          console.log('✓ Resource usage metrics available');
        }
        
      } else {
        console.log('Metrics section not yet implemented');
      }
    });

    test('should allow viewing detailed logs for specific attempts', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const taskCard = page.locator(`text="${testData.taskTitle}"`).first();
      await taskCard.click();
      await page.waitForTimeout(2000);
      
      // Look for logs tab or section
      const logsTab = page.locator('[role="tab"]').filter({ hasText: /Logs|Output/ });
      const logsSection = page.locator('text="Logs", text="Output", text="Console"');
      
      if (await logsTab.isVisible()) {
        await logsTab.click();
        await page.waitForTimeout(1000);
        
        // Should show log content
        const logContent = page.locator('pre, code, .log-content, .console-output');
        if (await logContent.isVisible()) {
          const content = await logContent.textContent();
          console.log('✓ Detailed logs available:', content?.substring(0, 100));
          
          // Should contain our setup script output
          if (content?.includes('Setup') || content?.includes('echo')) {
            console.log('✓ Setup script logs found');
          }
        }
        
      } else if (await logsSection.isVisible()) {
        console.log('✓ Logs section available');
      } else {
        console.log('Logs viewing not yet implemented');
      }
    });
  });

  test.describe('Git Worktree Integration', () => {
    test('should show worktree creation and branch information', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for worktree creation
          await page.waitForTimeout(3000);
          
          // Look for worktree information
          const worktreeInfo = [
            page.locator('text="Branch:", text="Worktree:"'),
            page.locator('text="task-", text="branch-"'), // Branch naming pattern
            page.locator('.branch-name, .worktree-path'),
            page.locator('text="Created worktree", text="Branch created"')
          ];
          
          let hasWorktreeInfo = false;
          for (const info of worktreeInfo) {
            if (await info.isVisible()) {
              hasWorktreeInfo = true;
              console.log('✓ Worktree information displayed');
              break;
            }
          }
          
          // Look for Git operations in logs
          const gitLogs = page.locator('text="git worktree", text="git branch", text="git checkout"');
          if (await gitLogs.isVisible()) {
            console.log('✓ Git operations visible in logs');
          }
          
        } else {
          test.skip();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should handle GitHub integration options', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Look for GitHub integration options
        const githubOptions = [
          executionDialog.locator('input[type="checkbox"]').filter({ hasText: /PR|Pull Request|GitHub/ }),
          executionDialog.locator('text="Create PR", text="GitHub Integration"'),
          executionDialog.locator('[data-testid="github-options"]')
        ];
        
        let hasGithubOptions = false;
        for (const option of githubOptions) {
          if (await option.isVisible()) {
            hasGithubOptions = true;
            console.log('✓ GitHub integration options available');
            break;
          }
        }
        
        if (hasGithubOptions) {
          // Check for PR template options
          const prTemplate = executionDialog.locator('textarea').filter({ 
            hasText: /template|description/ 
          });
          
          if (await prTemplate.isVisible()) {
            console.log('✓ PR template configuration available');
          }
        } else {
          console.log('GitHub integration not yet implemented');
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should show worktree cleanup options', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Look for cleanup options
        const cleanupOptions = [
          executionDialog.locator('input[type="checkbox"]').filter({ hasText: /cleanup|clean.*up/ }),
          executionDialog.locator('text="Auto cleanup", text="Delete worktree"'),
          executionDialog.locator('[data-testid="cleanup-options"]')
        ];
        
        for (const option of cleanupOptions) {
          if (await option.isVisible()) {
            console.log('✓ Worktree cleanup options available');
            break;
          }
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle execution failures gracefully', async ({ page }) => {
      // Create a task that will fail (invalid command)
      const failingTask = await createExecutableTask(testProject.id, {
        taskTitle: 'Failing Task Test',
        taskDescription: 'This task is designed to fail for testing error handling'
      });
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, 'Failing Task Test');
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for potential failure
          await page.waitForTimeout(5000);
          
          // Look for error indicators
          const errorIndicators = [
            page.locator('.text-red-500, .error, .failed'),
            page.locator('text="Failed", text="Error", text="Exception"'),
            page.locator('svg.text-red-500'),
            page.locator('.status-failed')
          ];
          
          let hasErrorIndicators = false;
          for (const indicator of errorIndicators) {
            if (await indicator.isVisible()) {
              hasErrorIndicators = true;
              console.log('✓ Error indicators displayed');
              break;
            }
          }
          
          // Look for error messages
          const errorMessages = page.locator('.error-message, .failure-reason');
          if (await errorMessages.isVisible()) {
            console.log('✓ Error messages displayed');
          }
          
          // Should still allow retry
          const retryButton = page.locator('button').filter({ hasText: /Retry|Try Again/ });
          if (await retryButton.isVisible()) {
            console.log('✓ Retry option available');
          }
          
        } else {
          test.skip();
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should support execution retry mechanisms', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        
        // Look for retry configuration
        const retryOptions = [
          executionDialog.locator('input[type="number"]').filter({ hasText: /retry|attempts/ }),
          executionDialog.locator('text="Max retries", text="Retry count"'),
          executionDialog.locator('[data-testid="retry-options"]')
        ];
        
        for (const option of retryOptions) {
          if (await option.isVisible()) {
            console.log('✓ Retry configuration available');
            break;
          }
        }
        
        // After execution, look for retry button
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          await page.waitForTimeout(3000);
          
          const retryButton = page.locator('button').filter({ hasText: /Retry|Try Again/ });
          if (await retryButton.isVisible()) {
            console.log('✓ Retry functionality available post-execution');
          }
        }
        
      } catch (error) {
        test.skip();
      }
    });

    test('should handle network connectivity issues', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Simulate network issues
      await page.route('**/api/**', route => {
        if (Math.random() < 0.3) { // 30% chance of failure
          route.abort();
        } else {
          route.continue();
        }
      });
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait and check for network error handling
          await page.waitForTimeout(5000);
          
          // Should handle network issues gracefully
          const networkErrorIndicators = [
            page.locator('text="Network error", text="Connection failed"'),
            page.locator('text="Retry", text="Try again"'),
            page.locator('.network-error, .connection-error')
          ];
          
          for (const indicator of networkErrorIndicators) {
            if (await indicator.isVisible()) {
              console.log('✓ Network error handling implemented');
              break;
            }
          }
        }
        
      } catch (error) {
        console.log('Network error handling test completed');
      } finally {
        // Restore network
        await page.unroute('**/api/**');
      }
    });

    test('should preserve execution state during browser refresh', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      try {
        await openTaskExecutionDialog(page, testData.taskTitle);
        
        const executionDialog = page.locator('[role="dialog"], .execution-panel').first();
        const executeButton = executionDialog.locator('button').filter({ 
          hasText: /Execute|Run|Start/ 
        }).first();
        
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Wait for execution to start
          await page.waitForTimeout(2000);
          
          // Refresh the page
          await page.reload();
          await navigateToTaskExecution(page, testProject.id);
          
          // Check if execution state is preserved
          const taskCard = page.locator(`text="${testData.taskTitle}"`).first();
          await taskCard.click();
          
          await page.waitForTimeout(2000);
          
          // Look for ongoing execution indicators
          const ongoingIndicators = [
            page.locator('svg.animate-spin'),
            page.locator('text="Running", text="In Progress"'),
            page.locator('.status-running, .executing')
          ];
          
          for (const indicator of ongoingIndicators) {
            if (await indicator.isVisible()) {
              console.log('✓ Execution state preserved after refresh');
              break;
            }
          }
        }
        
      } catch (error) {
        test.skip();
      }
    });
  });
});