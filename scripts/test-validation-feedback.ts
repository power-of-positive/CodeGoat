#!/usr/bin/env npx tsx

/**
 * Test enhanced validation feedback parsing
 */

import { spawn } from 'child_process';
import * as path from 'path';

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

async function testValidationFeedback(): Promise<void> {
  console.log('🧪 Testing validation feedback parsing...');

  return new Promise((resolve, reject) => {
    const hookPath = path.join(__dirname, 'validate-task.ts');
    const sessionId = `test-validation-${Date.now()}`;

    // Run validation directly to see if it produces structured output
    const child = spawn('npx', ['tsx', hookPath, sessionId], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let _stdout = '';
    let stderr = '';

    child.stdout?.on('data', data => {
      const chunk = data.toString();
      _stdout += chunk;
      process.stdout.write(`[STDOUT] ${chunk}`);
    });

    child.stderr?.on('data', data => {
      const chunk = data.toString();
      stderr += chunk;
      process.stderr.write(`[STDERR] ${chunk}`);
    });

    child.on('close', code => {
      console.log(`\n📊 Validation process ended with code: ${code}`);

      // Test structured failure parsing
      console.log('\n🔍 Testing structured failure parsing...');
      const structuredFeedback = extractStructuredFailures(stderr);

      if (structuredFeedback) {
        console.log('✅ Successfully extracted structured failures:');
        console.log(structuredFeedback);
      } else {
        console.log('⚠️ No structured failures found in stderr');
        console.log('Raw stderr (first 1000 chars):');
        console.log(stderr.substring(0, 1000));
      }

      resolve();
    });

    child.on('error', error => {
      reject(new Error(`Failed to run validation: ${error.message}`));
    });
  });
}

if (require.main === module) {
  testValidationFeedback().catch((error: Error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

export { testValidationFeedback };
