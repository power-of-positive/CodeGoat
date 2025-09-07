#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { ScenarioLinker } from '../features/support/scenario_linker';

/**
 * Script to generate step definitions from existing Gherkin feature files
 * and link them to existing Playwright tests
 */

const FEATURES_DIR = path.join(__dirname, '../features');
const STEP_DEFINITIONS_DIR = path.join(__dirname, '../features/step_definitions');
const E2E_TESTS_DIR = path.join(__dirname, '../e2e');

async function generateStepDefinitions() {
  console.error('🔍 Generating step definitions from Gherkin features...');

  const scenarioLinker = new ScenarioLinker(E2E_TESTS_DIR);
  const featureFiles = fs
    .readdirSync(FEATURES_DIR)
    .filter(file => file.endsWith('.feature'))
    .map(file => path.join(FEATURES_DIR, file));

  const allStepDefinitions = new Set<string>();

  for (const featureFile of featureFiles) {
    console.error(`\n📄 Processing ${path.basename(featureFile)}...`);

    try {
      const gherkinContent = fs.readFileSync(featureFile, 'utf-8');

      // Validate Gherkin syntax
      const validation = scenarioLinker.validateGherkinSyntax(gherkinContent);
      if (!validation.valid) {
        console.warn(`⚠️  Invalid Gherkin in ${featureFile}:`);
        validation.errors.forEach(error => console.warn(`   - ${error}`));
        continue;
      }

      // Generate step definitions
      const stepDefinitions = scenarioLinker.generateStepDefinitions(gherkinContent);
      stepDefinitions.forEach(stepDef => allStepDefinitions.add(stepDef));

      console.error(`   ✅ Generated ${stepDefinitions.length} step definitions`);
    } catch (error) {
      console.error(`❌ Error processing ${featureFile}:`, error);
    }
  }

  // Write generated step definitions to file
  const generatedStepsFile = path.join(STEP_DEFINITIONS_DIR, 'generated_steps.ts');
  const stepDefsContent = `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Auto-generated step definitions from Gherkin features
// DO NOT EDIT MANUALLY - Run npm run generate:steps to regenerate

${Array.from(allStepDefinitions).join('\n\n')}
`;

  fs.writeFileSync(generatedStepsFile, stepDefsContent);
  console.error(`\n📝 Generated step definitions written to ${generatedStepsFile}`);
  console.error(`📊 Total unique step definitions: ${allStepDefinitions.size}`);

  // Analyze test coverage potential
  await analyzeTestCoverage(scenarioLinker);
}

async function analyzeTestCoverage(scenarioLinker: ScenarioLinker) {
  console.error('\n🔗 Analyzing potential test coverage...');

  const availableTests = scenarioLinker.getAvailableTests();
  console.error(`📋 Found ${availableTests.length} Playwright tests:`);

  availableTests.slice(0, 10).forEach(test => {
    console.error(`   - ${path.basename(test.file)}: "${test.testName}"`);
  });

  if (availableTests.length > 10) {
    console.error(`   ... and ${availableTests.length - 10} more tests`);
  }

  // Mock some scenarios for demonstration
  const mockScenarios = [
    {
      id: 'scenario-1',
      title: 'View current BDD scenario coverage',
      feature: 'BDD Scenario Audit and Linking',
      gherkinContent: `
Feature: BDD Scenario Audit and Linking
  Scenario: View current BDD scenario coverage
    Given I am on the BDD Tests Dashboard
    When I navigate to the BDD Tests Dashboard
    Then I should see a list of all BDD scenarios
      `,
      status: 'pending' as const,
    },
    {
      id: 'scenario-2',
      title: 'Switch to Claude CLI agent data',
      feature: 'Agent Analytics Data Filtering',
      gherkinContent: `
Feature: Agent Analytics Data Filtering
  Scenario: Switch to Claude CLI agent data
    Given the default "All Agents" is selected
    When I select "claude_cli" from the agent dropdown
    Then the analytics data should update to show only Claude CLI results
      `,
      status: 'pending' as const,
    },
  ];

  const suggestions = scenarioLinker.suggestLinks(mockScenarios);

  if (suggestions.length > 0) {
    console.error('\n💡 Suggested scenario-to-test mappings:');
    suggestions.forEach(suggestion => {
      console.error(`\n📋 Scenario: "${suggestion.scenario.title}"`);
      console.error(`   🎯 Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
      suggestion.suggestedTests.slice(0, 3).forEach(test => {
        console.error(`   🔗 → ${path.basename(test.file)}: "${test.testName}"`);
      });
    });
  } else {
    console.error('   ℹ️  No automatic mappings found - manual linking required');
  }
}

async function linkExistingScenarios() {
  console.error('\n🔗 Linking existing BDD scenarios to tests...');

  // This would typically read from the database
  // For now, we'll demonstrate the linking functionality

  console.error('   ℹ️  Database scenarios would be linked here');
  console.error('   📝 Use the BDD Tests Dashboard to manually link scenarios');
  console.error('   🌐 Available at: http://localhost:5173/bdd-tests');
}

// Main execution
if (require.main === module) {
  generateStepDefinitions()
    .then(() => linkExistingScenarios())
    .then(() => {
      console.error('\n🎉 Step definition generation completed!');
      console.error('\n📋 Next steps:');
      console.error('   1. Review generated step definitions in features/step_definitions/');
      console.error('   2. Implement missing step logic in the generated files');
      console.error('   3. Run cucumber tests: npm run test:cucumber');
      console.error('   4. Link scenarios to tests via: http://localhost:5173/bdd-tests');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Generation failed:', error);
      process.exit(1);
    });
}
