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
  console.log('🤖 Claude Validation Wrapper Example');
  console.log('=====================================\n');

  // Create a logger (in real usage, use your app's logger)
  const logger = createMockLogger();

  // Example 1: Development setup with full validation
  console.log('📝 Example 1: Development Setup');
  console.log('-------------------------------');
  
  const devWrapper = ClaudeValidationFactory.createForDevelopment(
    process.cwd(),
    logger
  );

  console.log(`Working directory: ${devWrapper.getWorktreeDir()}`);
  console.log(`Claude command: ${devWrapper.getClaudeCommand()}`);
  console.log(`Validation enabled: ${devWrapper.isValidationEnabled()}`);
  console.log(`Execution permitted: ${devWrapper.isExecutionPermitted()}`);
  console.log(`Validation config:`, devWrapper.getValidationConfig());
  console.log();

  // Example 2: Production setup with restrictive permissions
  console.log('📝 Example 2: Production Setup');
  console.log('------------------------------');
  
  const prodWrapper = ClaudeValidationFactory.createForProduction(
    process.cwd(),
    logger
  );

  console.log(`Working directory: ${prodWrapper.getWorktreeDir()}`);
  console.log(`Validation enabled: ${prodWrapper.isValidationEnabled()}`);
  console.log(`Validation config:`, prodWrapper.getValidationConfig());
  console.log();

  // Example 3: Custom configuration
  console.log('📝 Example 3: Custom Configuration');
  console.log('----------------------------------');
  
  const customWrapper = ClaudeValidationFactory.create({
    worktreeDir: process.cwd(),
    claudeCommand: 'claude-code',
    enableValidation: true,
    skipValidationOnFailure: false,
    validationTimeout: 120000, // 2 minutes
    permissionMode: 'development',
    logger
  });

  console.log(`Custom validation timeout: ${customWrapper.getValidationConfig().validationTimeout}ms`);
  console.log();

  // Example 4: Validation-only mode
  console.log('📝 Example 4: Manual Validation Only');
  console.log('------------------------------------');
  
  if (devWrapper.isValidationEnabled()) {
    try {
      console.log('Running validation pipeline manually...');
      const validationResults = await devWrapper.runValidationOnly();
      
      if (validationResults) {
        console.log(`✅ Validation completed successfully!`);
        console.log(`   Total stages: ${validationResults.totalStages}`);
        console.log(`   Passed: ${validationResults.passed}`);
        console.log(`   Failed: ${validationResults.failed}`);
        console.log(`   Total time: ${validationResults.totalTime}ms`);
        
        if (validationResults.stages.length > 0) {
          console.log('   Stage details:');
          validationResults.stages.forEach(stage => {
            const status = stage.success ? '✅' : '❌';
            console.log(`     ${status} ${stage.name} (${stage.duration}ms)`);
            if (stage.error) {
              console.log(`       Error: ${stage.error}`);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Validation failed:', (error as Error).message);
    }
  }
  console.log();

  // Example 5: Simulated Claude execution with validation
  console.log('📝 Example 5: Claude Execution with Validation');
  console.log('----------------------------------------------');
  
  // Note: This would actually execute Claude in a real scenario
  console.log('This would execute Claude with a prompt and then run validation...');
  console.log('For safety, we are not actually executing Claude in this demo.');
  console.log('In real usage, you would call:');
  console.log('  const result = await wrapper.execute("Your prompt here");');
  console.log('  console.log("Claude output:", result.stdout);');
  console.log('  console.log("Validation results:", result.validationResults);');
  console.log();

  // Example 6: Permission checking
  console.log('📝 Example 6: Permission Checking');
  console.log('---------------------------------');
  
  const permissionManager = devWrapper.getPermissionManager();
  if (permissionManager) {
    // Example permission checks
    const fileReadAllowed = devWrapper.checkPermission('FILE_READ', 'package.json');
    const fileWriteAllowed = devWrapper.checkPermission('FILE_WRITE', 'settings.json');
    
    console.log(`File read permission for package.json: ${fileReadAllowed}`);
    console.log(`File write permission for settings.json: ${fileWriteAllowed}`);
  } else {
    console.log('No permission manager configured');
  }
  console.log();

  console.log('🎉 Demo completed successfully!');
  console.log('\nTo use the wrapper in your application:');
  console.log('1. Import ClaudeValidationFactory');
  console.log('2. Create a wrapper with your desired configuration');
  console.log('3. Call wrapper.execute(prompt) to run Claude with validation');
  console.log('4. Check the results for both Claude output and validation results');
}

// Run the demonstration
if (require.main === module) {
  demonstrateValidationWrapper()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateValidationWrapper };