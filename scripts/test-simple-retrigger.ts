#!/usr/bin/env npx tsx

/**
 * Simple test of retrigger functionality
 */

// This is the same function from run-claude-prompt.ts
function extractStructuredFailures(stderr: string): string | null {
  // Remove ANSI color codes first

  const cleanedStderr = stderr.replace(/\u001b\[[0-9;]*m/g, '');

  const startMarker = '🔄 RETRIGGER_FAILURES_START';
  const endMarker = '🔄 RETRIGGER_FAILURES_END';

  const startIndex = cleanedStderr.indexOf(startMarker);
  const endIndex = cleanedStderr.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  // Extract the structured failure block
  const failureBlock = cleanedStderr.substring(startIndex + startMarker.length, endIndex).trim();

  if (!failureBlock) {
    return null;
  }

  // Parse the failure block to create user-friendly messages
  const stages = failureBlock.split('---').filter(block => block.trim());
  const failureMessages: string[] = [];

  for (const stageBlock of stages) {
    const lines = stageBlock.trim().split('\n');
    let stageName = '';
    let fixGuidance = '';
    let errorDetails = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('FAILED_STAGE: ')) {
        stageName = trimmedLine.substring('FAILED_STAGE: '.length);
      } else if (trimmedLine.startsWith('FIX_GUIDANCE: ')) {
        fixGuidance = trimmedLine.substring('FIX_GUIDANCE: '.length);
      } else if (trimmedLine.startsWith('ERROR_DETAILS: ')) {
        errorDetails = trimmedLine.substring('ERROR_DETAILS: '.length);
      }
    }

    if (stageName && fixGuidance) {
      let message = `❌ Stage "${stageName}" failed:\n   ${fixGuidance}`;
      if (errorDetails) {
        message += `\n   Error: ${errorDetails}`;
      }
      failureMessages.push(message);
    }
  }

  return failureMessages.length > 0 ? failureMessages.join('\n\n') : null;
}

async function testSimpleRetrigger(): Promise<void> {
  console.log('🧪 Testing simple retrigger functionality...');

  // Test the validation feedback extraction with a mock stderr
  const mockStderr = `
Some other stderr content...
[36m🔄 RETRIGGER_FAILURES_START[0m
FAILED_STAGE: Code Linting
FIX_GUIDANCE: Fix the linting errors by running "npm run lint:fix" or manually address the style/quality issues. DO NOT disable the lint stage - proper code quality is essential.
ERROR_DETAILS: Command failed: npm run lint
---
FAILED_STAGE: Type Checking  
FIX_GUIDANCE: Fix the TypeScript type errors by reviewing and correcting type annotations, imports, or configurations. DO NOT disable type checking - type safety is critical.
ERROR_DETAILS: Command failed: npm run type-check
---
[36m🔄 RETRIGGER_FAILURES_END[0m
More stderr content...
`;

  console.log('\n🔍 Testing structured failure extraction...');
  const result = extractStructuredFailures(mockStderr);

  if (result) {
    console.log('✅ Successfully extracted structured failures!');
    console.log('\n📋 Extracted feedback:');
    console.log(result);

    // Verify that we got the expected content
    const hasLintStage = result.includes('Code Linting');
    const hasTypeStage = result.includes('Type Checking');
    const hasFixGuidance = result.includes('Fix the linting errors');

    if (hasLintStage && hasTypeStage && hasFixGuidance) {
      console.log('\n✅ All expected content found in extracted feedback!');
      console.log('✅ Enhanced re-triggering functionality is working correctly!');
    } else {
      console.log('\n❌ Missing expected content in extracted feedback');
      console.log(`- Has lint stage: ${hasLintStage}`);
      console.log(`- Has type stage: ${hasTypeStage}`);
      console.log(`- Has fix guidance: ${hasFixGuidance}`);
    }
  } else {
    console.log('❌ Failed to extract structured failures');
  }
}

if (require.main === module) {
  testSimpleRetrigger().catch((error: Error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

export { testSimpleRetrigger };
