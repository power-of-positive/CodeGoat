#!/usr/bin/env npx tsx

/**
 * Test enhanced re-triggering functionality with specific stage failures
 */

import { runClaudeWithPrompt } from './run-claude-prompt';
import * as fs from 'fs';

async function testEnhancedRetrigger(): Promise<void> {
  console.log('🧪 Testing enhanced re-triggering functionality...');

  try {
    // Create a temporary test file that will fail linting
    const testFile = 'temp-test-lint-fail.ts';
    const badCode = `
// This file will fail linting
const unused_variable = 'hello';  // unused variable
let a= 1 ;  // bad spacing
console.log("double quotes instead of single")  // missing semicolon
`;

    fs.writeFileSync(testFile, badCode);
    console.log(`📝 Created test file: ${testFile}`);

    // Run Claude with prompt that should trigger validation failure and re-triggering
    const prompt = `I created a file ${testFile} with intentional linting issues. Please fix the linting issues in this file and ensure all validation stages pass.`;

    console.log(`🚀 Running Claude with prompt: "${prompt}"`);

    await runClaudeWithPrompt({
      prompt,
      runValidation: true,
      maxTurns: 3, // Limit turns to avoid too much interaction
    });

    console.log('✅ Enhanced re-triggering test completed successfully!');
  } catch (error) {
    console.error('❌ Enhanced re-triggering test failed:', error);
  } finally {
    // Clean up test file
    try {
      if (fs.existsSync('temp-test-lint-fail.ts')) {
        fs.unlinkSync('temp-test-lint-fail.ts');
        console.log('🧹 Cleaned up test file');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up test file:', cleanupError);
    }
  }
}

if (require.main === module) {
  testEnhancedRetrigger().catch((error: Error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

export { testEnhancedRetrigger };
