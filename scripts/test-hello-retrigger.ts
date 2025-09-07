#!/usr/bin/env npx tsx

/**
 * Simple test: Run Claude with "hello", let it complete, then fail validation and see retrigger
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

async function testHelloRetrigger(): Promise<void> {
  console.log('🧪 HELLO RETRIGGER TEST');
  console.log('='.repeat(50) + '\n');

  // Create a dummy test file that will fail validation
  const testFile = path.join(__dirname, '..', 'hello-test-fail.js');
  const badCode = `// INTENTIONAL LINTING ERRORS FOR TESTING
var unusedVar = 1;  // unused variable
console.log("missing semicolon")  // missing semicolon
`;

  console.log('📝 Step 1: Creating file that will fail validation...');
  fs.writeFileSync(testFile, badCode);
  console.log(`   ✅ Created: ${testFile}\n`);

  try {
    console.log('🚀 Step 2: Running Claude with simple "hello" prompt and validation enabled...');

    const result = await new Promise<{ code: number; stdout: string; stderr: string }>(resolve => {
      let stdout = '';
      let stderr = '';

      const child = spawn(
        'npx',
        [
          'tsx',
          path.join(__dirname, 'run-claude-prompt.ts'),
          'hello', // Simple prompt
          // Validation enabled by default
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      child.stdout?.on('data', data => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(chunk);
      });

      child.stderr?.on('data', data => {
        const chunk = data.toString();
        stderr += chunk;
        console.error(chunk);
      });

      child.on('close', code => {
        resolve({ code: code || 0, stdout, stderr });
      });

      child.on('error', error => {
        console.error('Process error:', error);
        resolve({ code: -1, stdout, stderr });
      });

      // 5 minute timeout
      setTimeout(() => {
        console.log('\n⏰ Killing Claude due to timeout...');
        child.kill('SIGTERM');
        resolve({ code: -2, stdout: stdout + '\n[TIMEOUT]', stderr });
      }, 300000);
    });

    console.log(`\n📊 Step 3: Process completed with exit code: ${result.code}\n`);

    // Analyze the output for evidence of the retrigger mechanism
    console.log('🔍 Step 4: Analyzing output for retrigger evidence...\n');

    const fullOutput = result.stdout + result.stderr;

    // Look for key indicators
    const indicators = {
      initialRun: fullOutput.includes('Starting Claude Code'),
      claudeResponse: fullOutput.includes('hello') || fullOutput.includes('Hello'),
      validationRun:
        fullOutput.includes('Running validation') || fullOutput.includes('validation checks'),
      validationFailed: fullOutput.includes('Validation failed') || fullOutput.includes('❌'),
      blockDecision:
        fullOutput.includes('"decision":"block"') || fullOutput.includes("decision: 'block'"),
      retriggerAttempt:
        fullOutput.includes('Re-triggering Claude') || fullOutput.includes('validation feedback'),
      fixPrompt:
        fullOutput.includes('Fix the following') || fullOutput.includes('validation issues'),
      multipleSessions:
        fullOutput.split('Session:').length > 2 || fullOutput.split('session_id').length > 3,
    };

    console.log('📋 Evidence Analysis:');
    console.log(`   🤖 Initial Claude run: ${indicators.initialRun ? '✅' : '❌'}`);
    console.log(`   💬 Claude responded to hello: ${indicators.claudeResponse ? '✅' : '❌'}`);
    console.log(`   🔍 Validation executed: ${indicators.validationRun ? '✅' : '❌'}`);
    console.log(`   ❌ Validation failed: ${indicators.validationFailed ? '✅' : '❌'}`);
    console.log(`   🚫 Block decision made: ${indicators.blockDecision ? '✅' : '❌'}`);
    console.log(`   🔄 Retrigger attempted: ${indicators.retriggerAttempt ? '✅' : '❌'}`);
    console.log(`   🛠️  Fix prompt sent: ${indicators.fixPrompt ? '✅' : '❌'}`);
    console.log(`   📊 Multiple sessions: ${indicators.multipleSessions ? '✅' : '❌'}`);

    // Check session logs
    console.log('\n📄 Step 5: Checking latest session log...');

    const logsDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      const sessionFiles = fs
        .readdirSync(logsDir)
        .filter(f => f.startsWith('claude-session-') && f.endsWith('-formatted.txt'))
        .sort()
        .reverse();

      if (sessionFiles.length > 0) {
        const latestLog = path.join(logsDir, sessionFiles[0]);
        console.log(`   📄 Reading: ${sessionFiles[0]}`);

        try {
          const content = fs.readFileSync(latestLog, 'utf-8');

          // Count sessions
          const sessionCount = (content.match(/=== Claude Session:/g) || []).length;
          console.log(`   📊 Sessions in log: ${sessionCount}`);

          // Look for specific content
          const hasHello = content.toLowerCase().includes('hello');
          const hasValidationMention = content.includes('validation') || content.includes('lint');
          const hasFixPrompt =
            content.includes('Fix the following validation issues') ||
            content.includes('address them');
          const hasSpecificTestFile = content.includes('hello-test-fail.js');
          const hasUnusedVarError =
            content.includes('unusedVar') || content.includes('unused variable');
          const hasRetriggerWithDetails = content.includes('Linting errors found:');

          console.log(`   💬 Contains hello response: ${hasHello ? '✅' : '❌'}`);
          console.log(`   🔍 Contains validation content: ${hasValidationMention ? '✅' : '❌'}`);
          console.log(`   🛠️  Contains fix prompt: ${hasFixPrompt ? '✅' : '❌'}`);
          console.log(`   📄 References test file: ${hasSpecificTestFile ? '✅' : '❌'}`);
          console.log(`   🚫 Shows unused var error: ${hasUnusedVarError ? '✅' : '❌'}`);
          console.log(`   🔄 Retrigger with details: ${hasRetriggerWithDetails ? '✅' : '❌'}`);

          if (sessionCount > 1) {
            console.log('\n   ✅ MULTIPLE SESSIONS DETECTED - RETRIGGER OCCURRED!');
          }

          if (hasFixPrompt) {
            console.log('\n   📝 Sample fix prompt from log:');
            const lines = content.split('\n');
            const fixLine = lines.find(line => line.includes('Fix the following'));
            if (fixLine) {
              console.log(`      "${fixLine.trim().substring(0, 100)}..."`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Error reading log: ${error}`);
        }
      } else {
        console.log('   ❌ No session logs found');
      }
    }

    // Summary
    console.log('\n📊 Step 6: Summary');

    const workingComponents = Object.values(indicators).filter(Boolean).length;
    const totalComponents = Object.keys(indicators).length;

    console.log(`   📈 Working components: ${workingComponents}/${totalComponents}`);

    if (indicators.retriggerAttempt && indicators.fixPrompt) {
      console.log('   ✅ RETRIGGER MECHANISM FULLY WORKING');
      console.log('      - Claude responded to initial "hello"');
      console.log('      - Validation detected linting issues');
      console.log('      - System blocked completion');
      console.log('      - Claude was retriggered with specific fix instructions');
      console.log('      - Detailed linting errors were provided to Claude');
    } else if (indicators.validationFailed && indicators.blockDecision) {
      console.log('   ⚠️  VALIDATION WORKING, RETRIGGER NEEDS VERIFICATION');
      console.log('      - Claude responded to initial "hello"');
      console.log('      - Validation correctly failed');
      console.log('      - System blocked completion');
      console.log("      - Check if retrigger occurred but wasn't logged clearly");
    } else {
      console.log('   ❌ ISSUES DETECTED');
      console.log('      - Some components may not be working as expected');
      console.log('      - Check the individual test results above');
    }
  } finally {
    // Cleanup
    console.log('\n🧹 Cleanup...');
    try {
      fs.unlinkSync(testFile);
      console.log('   ✅ Removed test file');
    } catch {
      console.log('   ⚠️  Could not remove test file');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 HELLO RETRIGGER TEST COMPLETED');
  console.log('='.repeat(50));
}

// Run the test
if (require.main === module) {
  testHelloRetrigger().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
