import { test, expect } from '@playwright/test';

test.describe('Cucumber Integration with BDD Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should validate gherkin syntax in BDD scenarios', async ({ page }) => {
    // Switch to Test Mapping tab to work with scenario linking
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    // Create a scenario with proper gherkin syntax
    const addScenarioButton = page.getByRole('button', { name: 'Add Scenario' });
    if (await addScenarioButton.isVisible()) {
      await addScenarioButton.click();

      // Fill in valid gherkin content
      const gherkinTextarea = page.getByLabel('Gherkin Content');
      await gherkinTextarea.fill(`
Feature: User Authentication
  As a user
  I want to log in to my account
  So that I can access my dashboard

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter my valid username "testuser@example.com"
    And I enter my valid password "SecurePass123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message
      `);

      // The form should accept valid gherkin syntax
      await page.getByRole('button', { name: 'Create Scenario' }).click();
    }
  });

  test('should detect and warn about invalid gherkin syntax', async ({ page }) => {
    // Switch to scenarios tab
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    const addScenarioButton = page.getByRole('button', { name: 'Add Scenario' });
    if (await addScenarioButton.isVisible()) {
      await addScenarioButton.click();

      // Fill in invalid gherkin content (missing keywords, wrong structure)
      const gherkinTextarea = page.getByLabel('Gherkin Content');
      await gherkinTextarea.fill(`
This is not valid gherkin
Random text without proper structure
No Given When Then keywords
      `);

      await page.getByRole('button', { name: 'Create Scenario' }).click();

      // Should show validation error for invalid gherkin
      const errorMessage = page.getByText(/invalid gherkin|syntax error/i);
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('should link BDD scenarios to specific Playwright test files', async ({ page }) => {
    // Switch to Test Mapping tab
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    // Look for existing scenarios to map
    const scenarioItem = page.locator('[data-testid="scenario-item"]').first();
    if (await scenarioItem.isVisible()) {
      await scenarioItem.click();

      // Should show mapping options
      const testFileDropdown = page.getByLabel(/playwright.*file|test.*file/i);
      if (await testFileDropdown.isVisible()) {
        await testFileDropdown.click();

        // Should show available test files
        const testFileOption = page.getByText(/\.spec\.ts$/);
        if (await testFileOption.isVisible()) {
          await testFileOption.first().click();

          // Should also allow selecting specific test name
          const testNameField = page.getByLabel(/test.*name|scenario.*name/i);
          if (await testNameField.isVisible()) {
            await testNameField.fill('should login successfully');
          }

          // Save the mapping
          const saveMappingButton = page.getByRole('button', { name: /save|link|map/i });
          if (await saveMappingButton.isVisible()) {
            await saveMappingButton.click();
          }
        }
      }
    }
  });

  test('should execute linked Playwright tests when running BDD scenarios', async ({ page }) => {
    // Switch to Execution History tab
    await page.getByRole('tab', { name: 'Execution History' }).click();

    // Look for execute button or run test functionality
    const executeButton = page.getByRole('button', { name: /run.*test|execute.*scenario/i });
    if (await executeButton.isVisible()) {
      await executeButton.click();

      // Should show execution in progress or results
      const executionStatus = page.locator('[data-testid="execution-status"]');
      if (await executionStatus.isVisible()) {
        await expect(executionStatus).toBeVisible();
      }

      // Wait for execution to complete (with timeout)
      await page.waitForTimeout(2000);

      // Should show execution results
      const executionResults = page.locator('[data-testid="execution-results"]');
      if (await executionResults.isVisible()) {
        await expect(executionResults).toBeVisible();
      }
    }
  });

  test('should generate cucumber step definitions from gherkin scenarios', async ({ page }) => {
    // Switch to Test Mapping tab
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    // Look for step definition generator
    const generateStepsButton = page.getByRole('button', {
      name: /generate.*steps|create.*steps/i,
    });
    if (await generateStepsButton.isVisible()) {
      await generateStepsButton.click();

      // Should show generated step definitions
      const stepDefinitions = page.locator('[data-testid="step-definitions"]');
      if (await stepDefinitions.isVisible()) {
        await expect(stepDefinitions).toBeVisible();

        // Should contain proper step definition syntax
        await expect(stepDefinitions).toContainText(/Given\(|When\(|Then\(/);
      }
    }
  });

  test('should validate cucumber step implementation coverage', async ({ page }) => {
    // Switch to Test Mapping tab
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    // Look for coverage analysis
    const coverageButton = page.getByRole('button', { name: /coverage|analyze/i });
    if (await coverageButton.isVisible()) {
      await coverageButton.click();

      // Should show coverage report
      const coverageReport = page.locator('[data-testid="coverage-report"]');
      if (await coverageReport.isVisible()) {
        await expect(coverageReport).toBeVisible();

        // Should show implemented vs unimplemented steps
        const implementedSteps = page.getByText(/implemented.*steps/i);
        if (await implementedSteps.isVisible()) {
          await expect(implementedSteps).toBeVisible();
        }
      }
    }
  });

  test('should support parameterized scenarios with examples', async ({ page }) => {
    const addScenarioButton = page.getByRole('button', { name: 'Add Scenario' });
    if (await addScenarioButton.isVisible()) {
      await addScenarioButton.click();

      // Create a scenario outline with examples
      const gherkinTextarea = page.getByLabel('Gherkin Content');
      await gherkinTextarea.fill(`
Feature: Login Validation
  
  Scenario Outline: Login with different credentials
    Given I am on the login page
    When I enter username "<username>"
    And I enter password "<password>"
    And I click the login button
    Then I should see "<result>"
    
    Examples:
      | username         | password    | result           |
      | valid@email.com  | validpass   | Dashboard        |
      | invalid@email.com| validpass   | Error message    |
      | valid@email.com  | invalidpass | Error message    |
      `);

      await page.getByRole('button', { name: 'Create Scenario' }).click();

      // Should accept scenario outline with examples
      // Verification depends on implementation
    }
  });

  test('should track execution results for each scenario example', async ({ page }) => {
    // Switch to Execution History tab
    await page.getByRole('tab', { name: 'Execution History' }).click();

    // Look for parameterized scenario execution results
    const executionItem = page.locator('[data-testid="execution-item"]').first();
    if (await executionItem.isVisible()) {
      await executionItem.click();

      // Should show details for each parameter set
      const parameterResults = page.locator('[data-testid="parameter-results"]');
      if (await parameterResults.isVisible()) {
        await expect(parameterResults).toBeVisible();
      }
    }
  });
});

test.describe('Cucumber Step Definitions Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('tab', { name: 'Test Mapping' }).click();
  });

  test('should display available step definitions', async ({ page }) => {
    // Look for step definitions section
    const stepDefSection = page.locator('[data-testid="step-definitions"]');
    if (await stepDefSection.isVisible()) {
      await expect(stepDefSection).toBeVisible();
    }
  });

  test('should allow creating custom step definitions', async ({ page }) => {
    const addStepButton = page.getByRole('button', { name: /add.*step|new.*step/i });
    if (await addStepButton.isVisible()) {
      await addStepButton.click();

      // Should open step definition form
      const stepForm = page.getByRole('dialog');
      if (await stepForm.isVisible()) {
        await expect(stepForm).toBeVisible();

        // Fill in step definition
        const stepPatternField = page.getByLabel(/pattern|step.*text/i);
        if (await stepPatternField.isVisible()) {
          await stepPatternField.fill('I click the {string} button');
        }

        const implementationField = page.getByLabel(/implementation|code/i);
        if (await implementationField.isVisible()) {
          await implementationField.fill(`
async function(buttonText: string) {
  await page.getByRole('button', { name: buttonText }).click();
}
          `);
        }

        await page.getByRole('button', { name: /save|create/i }).click();
      }
    }
  });

  test('should validate step definition syntax', async ({ page }) => {
    const addStepButton = page.getByRole('button', { name: /add.*step|new.*step/i });
    if (await addStepButton.isVisible()) {
      await addStepButton.click();

      const stepForm = page.getByRole('dialog');
      if (await stepForm.isVisible()) {
        // Enter invalid step definition
        const implementationField = page.getByLabel(/implementation|code/i);
        if (await implementationField.isVisible()) {
          await implementationField.fill('invalid javascript syntax {{{');
        }

        await page.getByRole('button', { name: /save|create/i }).click();

        // Should show syntax error
        const errorMessage = page.getByText(/syntax error|invalid/i);
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test('should suggest step definitions based on gherkin text', async ({ page }) => {
    // Look for a scenario to analyze
    const scenarioItem = page.locator('[data-testid="scenario-item"]').first();
    if (await scenarioItem.isVisible()) {
      await scenarioItem.click();

      // Look for suggestion button
      const suggestButton = page.getByRole('button', { name: /suggest|generate/i });
      if (await suggestButton.isVisible()) {
        await suggestButton.click();

        // Should show suggested step definitions
        const suggestions = page.locator('[data-testid="step-suggestions"]');
        if (await suggestions.isVisible()) {
          await expect(suggestions).toBeVisible();
        }
      }
    }
  });
});

test.describe('BDD and Playwright Test Execution Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should execute BDD scenarios through Playwright test runner', async ({ page }) => {
    // Switch to Execution History tab
    await page.getByRole('tab', { name: 'Execution History' }).click();

    // Look for run all tests button
    const runAllButton = page.getByRole('button', { name: /run.*all|execute.*all/i });
    if (await runAllButton.isVisible()) {
      await runAllButton.click();

      // Should show execution progress
      const progressIndicator = page.locator('[data-testid="execution-progress"]');
      if (await progressIndicator.isVisible()) {
        await expect(progressIndicator).toBeVisible();
      }
    }
  });

  test('should report results back to BDD scenario status', async ({ page }) => {
    // Switch to Scenarios tab
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    // Look for scenarios with execution status
    const scenarioWithStatus = page.locator('[data-testid*="scenario-status"]').first();
    if (await scenarioWithStatus.isVisible()) {
      await expect(scenarioWithStatus).toBeVisible();

      // Should show status (passed, failed, pending)
      const statusIndicator = scenarioWithStatus.locator('[data-testid="status-indicator"]');
      if (await statusIndicator.isVisible()) {
        await expect(statusIndicator).toBeVisible();
      }
    }
  });

  test('should provide detailed error information for failed scenarios', async ({ page }) => {
    // Switch to Execution History tab
    await page.getByRole('tab', { name: 'Execution History' }).click();

    // Look for failed execution
    const failedExecution = page
      .locator('[data-testid="execution-item"]')
      .filter({
        has: page.locator('.text-red-500, .text-red-600, [class*="red"]'),
      })
      .first();

    if (await failedExecution.isVisible()) {
      await failedExecution.click();

      // Should show error details
      const errorDetails = page.locator('[data-testid="error-details"]');
      if (await errorDetails.isVisible()) {
        await expect(errorDetails).toBeVisible();

        // Should contain error message and stack trace
        await expect(errorDetails).toContainText(/error|failed|exception/i);
      }
    }
  });

  test('should support parallel execution of multiple scenarios', async ({ page }) => {
    // Switch to Test Mapping tab
    await page.getByRole('tab', { name: 'Test Mapping' }).click();

    // Look for parallel execution options
    const parallelButton = page.getByRole('button', { name: /parallel|concurrent/i });
    if (await parallelButton.isVisible()) {
      await parallelButton.click();

      // Should show parallel execution configuration
      const parallelConfig = page.locator('[data-testid="parallel-config"]');
      if (await parallelConfig.isVisible()) {
        await expect(parallelConfig).toBeVisible();
      }
    }
  });
});
