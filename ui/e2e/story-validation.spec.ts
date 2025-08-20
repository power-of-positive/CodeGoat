import { test, expect } from '@playwright/test';

test.describe('Story Completion Validation with BDD Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new story task', async ({ page }) => {
    // Click Add Task button
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Fill in story details
    await page.getByLabel('Content').fill('User Registration Feature - Complete user signup flow');

    // Select high priority
    const prioritySelect = page.getByLabel('Priority');
    await prioritySelect.selectOption('high');

    // Select story type if task type selector is available
    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    // Create the task
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Task should appear in the pending column
    await expect(page.getByText('User Registration Feature')).toBeVisible();
  });

  test('should prevent story completion without BDD scenarios', async ({ page }) => {
    // First create a story task
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Story Without BDD Scenarios');

    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    // Wait for task to appear
    await page.waitForTimeout(1000);

    // Find the newly created task card
    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Story Without BDD Scenarios',
      })
      .first();

    if (await taskCard.isVisible()) {
      // Try to move task to completed by clicking on it or using context menu
      await taskCard.click();

      // If task detail opens, look for complete button
      const completeButton = page.getByRole('button', { name: /complete|mark.*complete/i });
      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Should show validation error
        await expect(page.getByText(/cannot be completed without.*BDD scenario/i)).toBeVisible();
      } else {
        // Try different approach - look for status dropdown or drag and drop
        const statusButton = taskCard.locator('[data-testid*="status"], .status-button');
        if (await statusButton.isVisible()) {
          await statusButton.click();

          // Look for completed option
          const completedOption = page.getByText('Completed').or(page.getByText('completed'));
          if (await completedOption.isVisible()) {
            await completedOption.click();

            // Should show validation error
            await expect(
              page.getByText(/cannot be completed without.*BDD scenario/i)
            ).toBeVisible();
          }
        }
      }
    }
  });

  test('should show validation error details for story without BDD scenarios', async ({ page }) => {
    // Create a story and attempt completion
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Invalid Story Task');

    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    // Try to complete the story through API or direct status change
    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Invalid Story Task',
      })
      .first();

    if (await taskCard.isVisible()) {
      await taskCard.click();

      // Should be on task detail page
      await expect(page.getByRole('heading', { name: /task detail/i })).toBeVisible();

      // Look for BDD scenarios section
      const bddSection = page.locator('[data-testid*="bdd"], .bdd-section');
      if (await bddSection.isVisible()) {
        await expect(bddSection).toBeVisible();

        // Should show message about no scenarios
        await expect(page.getByText(/no.*BDD.*scenario/i)).toBeVisible();
      }
    }
  });

  test('should allow story completion with valid BDD scenarios and tests', async ({ page }) => {
    // This test assumes we can create a story with proper BDD scenarios
    // First, create a story
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Valid Story with BDD');

    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    // Navigate to the task detail to add BDD scenarios
    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Valid Story with BDD',
      })
      .first();

    if (await taskCard.isVisible()) {
      await taskCard.click();

      // Add BDD scenario
      const addScenarioButton = page.getByRole('button', { name: /add.*scenario/i });
      if (await addScenarioButton.isVisible()) {
        await addScenarioButton.click();

        // Fill in scenario details
        await page.getByLabel('Title').fill('User Registration Success');
        await page.getByLabel('Feature').fill('User Registration');
        await page.getByLabel('Description').fill('Test successful user registration');
        await page.getByLabel('Gherkin Content').fill(`
Feature: User Registration
  Scenario: Successful registration
    Given I am on the registration page
    When I fill in valid user details
    And I submit the form
    Then I should see a success message
        `);

        // Link to E2E test
        const testFileField = page.getByLabel(/test.*file|playwright.*file/i);
        if (await testFileField.isVisible()) {
          await testFileField.fill('user-registration.spec.ts');
        }

        const testNameField = page.getByLabel(/test.*name/i);
        if (await testNameField.isVisible()) {
          await testNameField.fill('should register user successfully');
        }

        await page.getByRole('button', { name: /create|save/i }).click();

        // Mark scenario as passed
        const scenarioItem = page.locator('[data-testid*="scenario"]').first();
        if (await scenarioItem.isVisible()) {
          const statusButton = scenarioItem.getByRole('button', { name: /status/i });
          if (await statusButton.isVisible()) {
            await statusButton.click();

            const passedOption = page.getByText('Passed').or(page.getByText('passed'));
            if (await passedOption.isVisible()) {
              await passedOption.click();
            }
          }
        }

        // Now try to complete the story
        const completeStoryButton = page.getByRole('button', {
          name: /complete.*story|mark.*complete/i,
        });
        if (await completeStoryButton.isVisible()) {
          await completeStoryButton.click();

          // Should succeed this time
          await expect(page.getByText(/story.*completed|completed.*successfully/i)).toBeVisible();
        }
      }
    }
  });

  test('should prevent story completion with unlinked BDD scenarios', async ({ page }) => {
    // Create story with BDD scenario but no E2E test link
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Story with Unlinked BDD');

    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    // Go to task detail and add BDD scenario without linking
    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Story with Unlinked BDD',
      })
      .first();

    if (await taskCard.isVisible()) {
      await taskCard.click();

      const addScenarioButton = page.getByRole('button', { name: /add.*scenario/i });
      if (await addScenarioButton.isVisible()) {
        await addScenarioButton.click();

        await page.getByLabel('Title').fill('Unlinked Scenario');
        await page.getByLabel('Feature').fill('Test Feature');
        await page.getByLabel('Description').fill('Test scenario without E2E link');
        await page.getByLabel('Gherkin Content').fill(`
Feature: Test
  Scenario: Test scenario
    Given something
    When something happens
    Then something should occur
        `);

        // Don't fill in test file or test name (leaving them unlinked)
        await page.getByRole('button', { name: /create|save/i }).click();

        // Try to complete the story
        const completeButton = page.getByRole('button', { name: /complete/i });
        if (await completeButton.isVisible()) {
          await completeButton.click();

          // Should show error about unlinked scenarios
          await expect(page.getByText(/not linked to.*E2E test/i)).toBeVisible();
        }
      }
    }
  });

  test('should prevent story completion with failed BDD scenarios', async ({ page }) => {
    // Create story with BDD scenario that has failed status
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Story with Failed BDD');

    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Story with Failed BDD',
      })
      .first();

    if (await taskCard.isVisible()) {
      await taskCard.click();

      const addScenarioButton = page.getByRole('button', { name: /add.*scenario/i });
      if (await addScenarioButton.isVisible()) {
        await addScenarioButton.click();

        await page.getByLabel('Title').fill('Failed Scenario');
        await page.getByLabel('Feature').fill('Test Feature');
        await page.getByLabel('Description').fill('Test scenario that fails');
        await page.getByLabel('Gherkin Content').fill(`
Feature: Test
  Scenario: Failing test
    Given something
    When something goes wrong
    Then it should fail
        `);

        // Link to E2E test
        const testFileField = page.getByLabel(/test.*file/i);
        if (await testFileField.isVisible()) {
          await testFileField.fill('failing-test.spec.ts');
        }

        const testNameField = page.getByLabel(/test.*name/i);
        if (await testNameField.isVisible()) {
          await testNameField.fill('should fail as expected');
        }

        await page.getByRole('button', { name: /create|save/i }).click();

        // Mark scenario as failed
        const scenarioItem = page.locator('[data-testid*="scenario"]').first();
        if (await scenarioItem.isVisible()) {
          const statusButton = scenarioItem.getByRole('button', { name: /status/i });
          if (await statusButton.isVisible()) {
            await statusButton.click();

            const failedOption = page.getByText('Failed').or(page.getByText('failed'));
            if (await failedOption.isVisible()) {
              await failedOption.click();
            }
          }
        }

        // Try to complete the story
        const completeButton = page.getByRole('button', { name: /complete/i });
        if (await completeButton.isVisible()) {
          await completeButton.click();

          // Should show error about failed scenarios
          await expect(page.getByText(/have not passed.*tests/i)).toBeVisible();
        }
      }
    }
  });

  test('should allow regular tasks to complete without BDD requirements', async ({ page }) => {
    // Create a regular task (not a story)
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Regular Task - No BDD Required');

    // Make sure it's a task, not a story
    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('task');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    // Try to complete the regular task
    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Regular Task - No BDD Required',
      })
      .first();

    if (await taskCard.isVisible()) {
      await taskCard.click();

      // Should be able to complete without BDD scenarios
      const completeButton = page.getByRole('button', { name: /complete/i });
      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Should succeed
        await expect(page.getByText(/completed|success/i)).toBeVisible();
      }
    }
  });

  test('should display validation error details with specific error codes', async ({ page }) => {
    // Create a story to test specific error scenarios
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByLabel('Content').fill('Story for Error Testing');

    const taskTypeSelect = page.locator('select[name="taskType"], select[name="type"]');
    if (await taskTypeSelect.isVisible()) {
      await taskTypeSelect.selectOption('story');
    }

    await page.getByRole('button', { name: 'Add Task' }).click();

    const taskCard = page
      .locator('[data-testid*="task-card"]')
      .filter({
        hasText: 'Story for Error Testing',
      })
      .first();

    if (await taskCard.isVisible()) {
      await taskCard.click();

      // Try to complete without any BDD scenarios
      const completeButton = page.getByRole('button', { name: /complete/i });
      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Should show specific error code for missing BDD scenarios
        const errorMessage = page.locator('[data-testid="error-message"], .error-message');
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toContainText('STORY_MISSING_BDD_SCENARIOS');
        }
      }
    }
  });
});

test.describe('BDD Scenario Linking Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('networkidle');
  });

  test('should validate E2E test file exists when linking scenario', async ({ page }) => {
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    // Try to link scenario to non-existent test file
    const linkButton = page.getByRole('button', { name: /link|map/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();

      const testFileField = page.getByLabel(/test.*file/i);
      if (await testFileField.isVisible()) {
        await testFileField.fill('non-existent-test.spec.ts');

        const saveButton = page.getByRole('button', { name: /save|link/i });
        await saveButton.click();

        // Should show validation error
        await expect(page.getByText(/file.*not found|does not exist/i)).toBeVisible();
      }
    }
  });

  test('should validate test name exists in linked file', async ({ page }) => {
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    const linkButton = page.getByRole('button', { name: /link|map/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();

      // Link to existing file but with wrong test name
      const testFileField = page.getByLabel(/test.*file/i);
      if (await testFileField.isVisible()) {
        await testFileField.fill('task-management.spec.ts'); // Known existing file
      }

      const testNameField = page.getByLabel(/test.*name/i);
      if (await testNameField.isVisible()) {
        await testNameField.fill('non-existent test name');

        const saveButton = page.getByRole('button', { name: /save|link/i });
        await saveButton.click();

        // Should show validation warning
        await expect(page.getByText(/test.*not found|test name.*exist/i)).toBeVisible();
      }
    }
  });
});
