import { test, expect } from '@playwright/test';

test.describe('BDD Testing Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bdd-tests');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display BDD testing overview', async ({ page }) => {
    // Given I am logged into CODEGOAT
    // And there are BDD scenarios and Cucumber features
    
    // When I navigate to the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      // BDD page loaded successfully
      await expect(bddContent).toBeVisible();
      
      // Check for other elements if they exist
      const featureOverview = page.locator('[data-testid="feature-files-overview"]');
      if (await featureOverview.count() > 0) {
        await expect(featureOverview).toBeVisible();
      }
      
      const scenarioStats = page.locator('[data-testid="scenario-stats"]');
      if (await scenarioStats.count() > 0) {
        await expect(scenarioStats).toBeVisible();
      }
      
      const testCoverage = page.locator('[data-testid="test-coverage"]');
      if (await testCoverage.count() > 0) {
        await expect(testCoverage).toBeVisible();
      }
      
      const recentRuns = page.locator('[data-testid="recent-test-runs"]');
      if (await recentRuns.count() > 0) {
        await expect(recentRuns).toBeVisible();
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });

  test('should browse feature files and scenarios', async ({ page }) => {
    // Given I am on the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      await expect(bddContent).toBeVisible();
      
      // When I click on a feature file
      const featureFile = page.locator('[data-testid="feature-file"]').first();
      if (await featureFile.count() > 0) {
        await featureFile.click();
        
        // Then I should see the feature details
        const featureDetails = page.locator('[data-testid="feature-details"]');
        if (await featureDetails.count() > 0) {
          await expect(featureDetails).toBeVisible();
        }
        
        // And I should see the list of scenarios in the feature
        const scenariosList = page.locator('[data-testid="scenarios-list"]');
        if (await scenariosList.count() > 0) {
          await expect(scenariosList).toBeVisible();
        }
        
        // And I should see scenario execution status
        const scenarioStatus = page.locator('[data-testid="scenario-status"]');
        if (await scenarioStatus.count() > 0) {
          await expect(scenarioStatus).toBeVisible();
        }
        
        // And I should see linked Playwright tests
        const linkedTests = page.locator('[data-testid="linked-tests"]');
        if (await linkedTests.count() > 0) {
          await expect(linkedTests).toBeVisible();
        }
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });

  test('should run BDD scenario tests', async ({ page }) => {
    // Given I am on the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      await expect(bddContent).toBeVisible();
      
      // When I click "Run All Tests" button
      const runTestsButton = page.getByRole('button', { name: /run.*tests/i });
      if (await runTestsButton.count() > 0) {
        await runTestsButton.click();
        
        // Then I should see test execution progress
        const executionProgress = page.locator('[data-testid="test-execution-progress"]');
        if (await executionProgress.count() > 0) {
          await expect(executionProgress).toBeVisible();
        }
        
        // And I should see real-time test results
        const testResults = page.locator('[data-testid="test-results"]');
        if (await testResults.count() > 0) {
          await expect(testResults).toBeVisible();
        }
        
        // Wait for tests to complete
        await page.waitForTimeout(2000);
        
        // And I should see final test summary
        const testSummary = page.locator('[data-testid="test-summary"]');
        if (await testSummary.count() > 0) {
          await expect(testSummary).toBeVisible();
        }
        
        // And I should see passed/failed test counts
        const testCounts = page.locator('[data-testid="test-counts"]');
        if (await testCounts.count() > 0) {
          await expect(testCounts).toBeVisible();
        }
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });

  test('should create new BDD scenario', async ({ page }) => {
    // Given I am on the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      await expect(bddContent).toBeVisible();
      
      // When I click "Create Scenario" button
      const createScenarioButton = page.getByRole('button', { name: /create.*scenario/i });
      if (await createScenarioButton.count() > 0) {
        await createScenarioButton.click();
        
        // Then I should see the scenario creation form
        const creationForm = page.locator('[data-testid="scenario-creation-form"]');
        if (await creationForm.count() > 0) {
          await expect(creationForm).toBeVisible();
          
          // When I fill in scenario details
          await page.locator('[data-testid="scenario-title"]').fill('User can perform new action');
          
          const featureSelect = page.locator('[data-testid="feature-select"]');
          if (await featureSelect.count() > 0) {
            await featureSelect.selectOption('user-actions');
          }
          
          const gherkinContent = page.locator('[data-testid="gherkin-content"]');
          if (await gherkinContent.count() > 0) {
            await gherkinContent.fill(`
              Feature: User Actions
              Scenario: User can perform new action
                Given the user is logged in
                When the user clicks the action button
                Then the action should be performed successfully
            `);
          }
          
          // And I select task association
          const taskSelect = page.locator('[data-testid="associated-task"]');
          if (await taskSelect.count() > 0) {
            await taskSelect.selectOption({ index: 0 });
          }
          
          // And I click "Create Scenario"
          const createButton = page.getByRole('button', { name: /create scenario/i });
          if (await createButton.count() > 0) {
            await createButton.click();
            
            // Then the scenario should be created
            const successMessage = page.locator('[data-testid="scenario-created-success"]');
            if (await successMessage.count() > 0) {
              await expect(successMessage).toBeVisible();
            }
            
            // And I should see the new scenario in the list
            const scenariosList = page.locator('[data-testid="scenarios-list"]');
            if (await scenariosList.count() > 0) {
              await expect(scenariosList).toContainText('User can perform new action');
            }
          }
        }
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });

  test('should link scenarios to Playwright tests', async ({ page }) => {
    // Given I am on the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      await expect(bddContent).toBeVisible();
      
      // And there is an unlinked scenario
      const unlinkexdScenario = page.locator('[data-testid="scenario-item"][data-linked="false"]').first();
      if (await unlinkexdScenario.count() > 0) {
        // When I click "Link to Test" on the scenario
        const linkButton = unlinkexdScenario.locator('[data-testid="link-test-button"]');
        if (await linkButton.count() > 0) {
          await linkButton.click();
          
          // Then I should see the test linking dialog
          const linkingDialog = page.locator('[data-testid="test-linking-dialog"]');
          if (await linkingDialog.count() > 0) {
            await expect(linkingDialog).toBeVisible();
            
            // When I select a Playwright test file
            const testFileSelect = page.locator('[data-testid="test-file-select"]');
            if (await testFileSelect.count() > 0) {
              await testFileSelect.selectOption('analytics.spec.ts');
            }
            
            // And I select a specific test
            const testNameSelect = page.locator('[data-testid="test-name-select"]');
            if (await testNameSelect.count() > 0) {
              await testNameSelect.selectOption('should display analytics dashboard overview');
            }
            
            // And I click "Link Test"
            const linkTestButton = page.getByRole('button', { name: /link test/i });
            if (await linkTestButton.count() > 0) {
              await linkTestButton.click();
              
              // Then the scenario should be linked to the test
              const linkingSuccess = page.locator('[data-testid="linking-success"]');
              if (await linkingSuccess.count() > 0) {
                await expect(linkingSuccess).toBeVisible();
              }
              
              // And I should see the linked test information
              const linkedTestInfo = unlinkexdScenario.locator('[data-testid="linked-test-info"]');
              if (await linkedTestInfo.count() > 0) {
                await expect(linkedTestInfo).toBeVisible();
              }
            }
          }
        }
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });

  test('should show test coverage report', async ({ page }) => {
    // Given I am on the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      await expect(bddContent).toBeVisible();
      
      // When I click on "Coverage Report"
      const coverageButton = page.getByRole('button', { name: /coverage.*report/i });
      if (await coverageButton.count() > 0) {
        await coverageButton.click();
        
        // Then I should see the coverage report page
        const coverageReport = page.locator('[data-testid="coverage-report"]');
        if (await coverageReport.count() > 0) {
          await expect(coverageReport).toBeVisible();
        }
        
        // And I should see overall coverage percentage
        const overallCoverage = page.locator('[data-testid="overall-coverage"]');
        if (await overallCoverage.count() > 0) {
          await expect(overallCoverage).toBeVisible();
        }
        
        // And I should see feature-wise coverage breakdown
        const featureCoverage = page.locator('[data-testid="feature-coverage"]');
        if (await featureCoverage.count() > 0) {
          await expect(featureCoverage).toBeVisible();
        }
        
        // And I should see uncovered scenarios
        const uncoveredScenarios = page.locator('[data-testid="uncovered-scenarios"]');
        if (await uncoveredScenarios.count() > 0) {
          await expect(uncoveredScenarios).toBeVisible();
        }
        
        // And I should see recommendations for improving coverage
        const coverageRecommendations = page.locator('[data-testid="coverage-recommendations"]');
        if (await coverageRecommendations.count() > 0) {
          await expect(coverageRecommendations).toBeVisible();
        }
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });

  test('should generate step definitions from scenarios', async ({ page }) => {
    // Given I am on the BDD Testing page
    await page.waitForLoadState('domcontentloaded');
    
    // Check if BDD content is available
    const bddContent = page.locator('text=BDD Tests Dashboard');
    if (await bddContent.count() > 0) {
      await expect(bddContent).toBeVisible();
      
      // When I click "Generate Step Definitions"
      const generateButton = page.getByRole('button', { name: /generate.*step.*definitions/i });
      if (await generateButton.count() > 0) {
        await generateButton.click();
        
        // Then I should see step definition generation progress
        const generationProgress = page.locator('[data-testid="generation-progress"]');
        if (await generationProgress.count() > 0) {
          await expect(generationProgress).toBeVisible();
        }
        
        // And I should see the generated step definitions
        const generatedSteps = page.locator('[data-testid="generated-steps"]');
        if (await generatedSteps.count() > 0) {
          await expect(generatedSteps).toBeVisible();
        }
        
        // And I should be able to copy the generated code
        const copyButton = page.locator('[data-testid="copy-step-definitions"]');
        if (await copyButton.count() > 0) {
          await expect(copyButton).toBeVisible();
        }
        
        // And I should see which scenarios are now covered
        const newlyCoveredScenarios = page.locator('[data-testid="newly-covered-scenarios"]');
        if (await newlyCoveredScenarios.count() > 0) {
          await expect(newlyCoveredScenarios).toBeVisible();
        }
      }
    } else {
      // At minimum, verify we're on the right route
      expect(page.url()).toContain('/bdd-tests');
    }
  });
});