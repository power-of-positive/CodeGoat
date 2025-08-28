#!/usr/bin/env node

/**
 * Test script to demonstrate the validation pipeline
 * Runs validation with lint-only configuration for quick testing
 */

const { ValidationRunner } = require('./validate-task.js');
const fs = require('fs').promises;
const path = require('path');

async function createTestSettings() {
  const testSettings = {
    validation: {
      stages: [
        {
          id: 'lint',
          name: 'Code Linting',
          command: 'npm run lint',
          timeout: 30000,
          enabled: true,
          continueOnFailure: false,
          order: 1,
        }
      ],
      enableMetrics: true,
      maxAttempts: 3,
    },
  };

  const settingsPath = path.join(process.cwd(), 'test-settings.json');
  await fs.writeFile(settingsPath, JSON.stringify(testSettings, null, 2), 'utf-8');
  
  console.error('✅ Created test-settings.json for validation testing');
  return settingsPath;
}

async function main() {
  try {
    console.error('🧪 Testing Claude Code Validation Pipeline\n');
    
    // Create test settings
    const settingsPath = await createTestSettings();
    
    // Create a custom validation runner with test settings
    class TestValidationRunner extends ValidationRunner {
      constructor() {
        super();
        this.settingsPath = settingsPath;
      }
    }
    
    console.error('🚀 Running validation with lint-only configuration...\n');
    
    const runner = new TestValidationRunner();
    const results = await runner.run();
    
    console.error('\n📊 Test Results:');
    console.error(`- Total time: ${results.totalTime}ms`);
    console.error(`- Success: ${results.success}`);
    console.error(`- Stages: ${results.passed} passed, ${results.failed} failed`);
    
    // Clean up test settings
    await fs.unlink(settingsPath);
    console.error('\n🧹 Cleaned up test-settings.json');
    
    if (results.success) {
      console.error('\n🎉 Validation pipeline test completed successfully!');
      console.error('💡 Hook is ready for Claude Code integration');
    } else {
      console.error('\n❌ Validation pipeline test failed');
      console.error('🔍 Check the output above for details');
    }
    
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}