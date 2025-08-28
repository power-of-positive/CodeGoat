#!/usr/bin/env npx ts-node

/**
 * Example usage of the Claude Validation Wrapper
 *
 * This example demonstrates how to use the ClaudeValidationWrapper to
 * execute Claude Code with automatic validation pipeline execution.
 */

import { ClaudeValidationFactory } from '../src/utils/claude-validation-factory';
import { createMockLogger } from '../src/test-helpers/logger.mock';

async function demonstrateValidationWrapper() {
  console.error('🤖 Claude Validation Wrapper Example');
  console.error('=====================================\n');

  // Create a logger (in real usage, use your app's logger)
  const logger = createMockLogger();

  // Example 1: Development setup with full validation
  console.error('📝 Example 1: Development Setup');
  console.error('-------------------------------');

  const devWrapper = ClaudeValidationFactory.createForDevelopment(process.cwd(), logger);

  console.error(`Working directory: ${devWrapper.getWorktreeDir()}`);
  console.error(`Claude command: ${devWrapper.getClaudeCommand()}`);
  console.error(`Validation enabled: ${devWrapper.isValidationEnabled()}`);
  console.error(`Execution permitted: ${devWrapper.isExecutionPermitted()}`);
  console.error(`Validation config:`, devWrapper.getValidationConfig());
  console.error();

  // Example 2: Production setup with restrictive permissions
  console.error('📝 Example 2: Production Setup');
  console.error('------------------------------');

  const prodWrapper = ClaudeValidationFactory.createForProduction(process.cwd(), logger);

  console.error(`Working directory: ${prodWrapper.getWorktreeDir()}`);
  console.error(`Validation enabled: ${prodWrapper.isValidationEnabled()}`);
  console.error(`Validation config:`, prodWrapper.getValidationConfig());
  console.error();

  // Example 3: Custom configuration
  console.error('📝 Example 3: Custom Configuration');
  console.error('----------------------------------');

  const customWrapper = ClaudeValidationFactory.create({
    worktreeDir: process.cwd(),
    claudeCommand: 'claude-code',
    enableValidation: true,
    skipValidationOnFailure: false,
    validationTimeout: 120000, // 2 minutes
    permissionMode: 'development',
    logger,
  });

  console.error(
    `Custom validation timeout: ${customWrapper.getValidationConfig().validationTimeout}ms`
  );
  console.error();

  // Example 4: Validation-only mode
  console.error('📝 Example 4: Manual Validation Only');
  console.error('------------------------------------');

  if (devWrapper.isValidationEnabled()) {
    try {
      console.error('Running validation pipeline manually...');
      const validationResults = await devWrapper.runValidationOnly();

      if (validationResults) {
        console.error(`✅ Validation completed successfully!`);
        console.error(`   Total stages: ${validationResults.totalStages}`);
        console.error(`   Passed: ${validationResults.passed}`);
        console.error(`   Failed: ${validationResults.failed}`);
        console.error(`   Total time: ${validationResults.totalTime}ms`);

        if (validationResults.stages.length > 0) {
          console.error('   Stage details:');
          validationResults.stages.forEach(stage => {
            const status = stage.success ? '✅' : '❌';
            console.error(`     ${status} ${stage.name} (${stage.duration}ms)`);
            if (stage.error) {
              console.error(`       Error: ${stage.error}`);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Validation failed:', (error as Error).message);
    }
  }
  console.error();

  // Example 5: Simulated Claude execution with validation
  console.error('📝 Example 5: Claude Execution with Validation');
  console.error('----------------------------------------------');

  // Note: This would actually execute Claude in a real scenario
  console.error('This would execute Claude with a prompt and then run validation...');
  console.error('For safety, we are not actually executing Claude in this demo.');
  console.error('In real usage, you would call:');
  console.error('  const result = await wrapper.execute("Your prompt here");');
  console.error('  console.error("Claude output:", result.stdout);');
  console.error('  console.error("Validation results:", result.validationResults);');
  console.error();

  // Example 6: Permission checking
  console.error('📝 Example 6: Permission Checking');
  console.error('---------------------------------');

  const permissionManager = devWrapper.getPermissionManager();
  if (permissionManager) {
    // Example permission checks
    const fileReadAllowed = devWrapper.checkPermission('FILE_READ', 'package.json');
    const fileWriteAllowed = devWrapper.checkPermission('FILE_WRITE', 'settings.json');

    console.error(`File read permission for package.json: ${fileReadAllowed}`);
    console.error(`File write permission for settings.json: ${fileWriteAllowed}`);
  } else {
    console.error('No permission manager configured');
  }
  console.error();

  console.error('🎉 Demo completed successfully!');
  console.error('\nTo use the wrapper in your application:');
  console.error('1. Import ClaudeValidationFactory');
  console.error('2. Create a wrapper with your desired configuration');
  console.error('3. Call wrapper.execute(prompt) to run Claude with validation');
  console.error('4. Check the results for both Claude output and validation results');
}

// Run the demonstration
if (require.main === module) {
  demonstrateValidationWrapper()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateValidationWrapper };
