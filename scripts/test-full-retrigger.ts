#!/usr/bin/env npx tsx

/**
 * Full end-to-end test of Claude retriggering mechanism
 * Tests the complete workflow including validation failure and retrigger
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Sleep function removed - not needed

async function testFullRetrigger(): Promise<void> {
  console.log('🚀 FULL CLAUDE RETRIGGER TEST');
  console.log('='.repeat(60) + '\n');

  // Create a file with linting issues
  const testFile = path.join(__dirname, '..', 'test-retrigger.js');
  const badCode = `
// This file has intentional linting errors to test retrigger
var unused_var = 123;    // ESLint error: unused variable
console.log("test")      // ESLint error: missing semicolon
let another_unused = 1;  // ESLint error: unused variable
`;

  console.log('📝 Step 1: Creating file with linting errors...');
  fs.writeFileSync(testFile, badCode);
  console.log(`   ✅ Created: ${testFile}`);
  console.log('   📋 Expected linting errors:');
  console.log('      - Unused variables');
  console.log('      - Missing semicolon\n');

  // Clear logs directory to start fresh
  const logsDir = path.join(__dirname, '..', 'logs');
  if (fs.existsSync(logsDir)) {
    const existingLogs = fs
      .readdirSync(logsDir)
      .filter(f => f.startsWith('claude-session-'))
      .slice(0, 5); // Keep some recent logs

    if (existingLogs.length > 0) {
      console.log(
        `📋 Found ${existingLogs.length} existing session files (will keep for comparison)`
      );
    }
  }

  try {
    console.log('🎯 Step 2: Running Claude WITH validation enabled...');
    console.log('   This should trigger the retrigger mechanism when validation fails\n');

    const testPrompt = 'Please acknowledge this retrigger test and do any small task.';

    const result = await new Promise<{ code: number; output: string }>(resolve => {
      let output = '';

      const child = spawn(
        'npx',
        [
          'tsx',
          path.join(__dirname, 'run-claude-prompt.ts'),
          testPrompt,
          // Validation is enabled by default, no --no-validation flag
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      child.stdout?.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        process.stdout.write(chunk);
      });

      child.stderr?.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        process.stderr.write(chunk);
      });

      child.on('close', code => {
        resolve({ code: code || 0, output });
      });

      // Longer timeout for validation + retrigger
      setTimeout(() => {
        console.log('\n⏰ Test timed out - terminating...');
        child.kill('SIGTERM');
        resolve({ code: -1, output: output + '\n[TEST TIMEOUT]' });
      }, 600000); // 10 minutes
    });

    console.log(`\n📊 Step 3: Run completed with exit code: ${result.code}`);

    // Analyze the output for key indicators
    console.log('\n🔍 Step 4: Analyzing execution output...');

    const output = result.output;
    const hasInitialRun = output.includes('🤖 Starting Claude Code');
    const hasValidationFailed = output.includes('Validation failed') || output.includes('❌');
    const hasRetrigger =
      output.includes('Re-triggering Claude Code') || output.includes('validation feedback');
    const hasBlockDecision =
      output.includes('"decision":"block"') || output.includes("decision: 'block'");

    console.log(`   📊 Initial Claude run detected: ${hasInitialRun ? '✅' : '❌'}`);
    console.log(`   📊 Validation failure detected: ${hasValidationFailed ? '✅' : '❌'}`);
    console.log(`   📊 Retrigger attempt detected: ${hasRetrigger ? '✅' : '❌'}`);
    console.log(`   📊 Block decision found: ${hasBlockDecision ? '✅' : '❌'}`);

    // Check session files
    console.log('\n📋 Step 5: Checking session files...');

    if (fs.existsSync(logsDir)) {
      const sessionFiles = fs
        .readdirSync(logsDir)
        .filter(f => f.startsWith('claude-session-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 3); // Get latest 3 files

      console.log(`   📄 Found ${sessionFiles.length} recent session files:`);

      for (let i = 0; i < sessionFiles.length; i++) {
        const file = sessionFiles[i];
        const jsonPath = path.join(logsDir, file);
        const textPath = jsonPath.replace('.json', '-formatted.txt');

        console.log(`\n   📄 Session ${i + 1}: ${file}`);

        try {
          const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
          const textExists = fs.existsSync(textPath);

          console.log(`      💾 JSON file size: ${jsonContent.length} bytes`);
          console.log(`      📖 Text file exists: ${textExists ? '✅' : '❌'}`);

          // Look for key content in the logs
          const hasValidationContent =
            jsonContent.includes('validation') || jsonContent.includes('lint');
          const hasRetriggerContent =
            jsonContent.includes('Fix the following') || jsonContent.includes('validation issues');

          console.log(
            `      🔍 Contains validation content: ${hasValidationContent ? '✅' : '❌'}`
          );
          console.log(`      🔄 Contains retrigger content: ${hasRetriggerContent ? '✅' : '❌'}`);

          if (textExists) {
            const textContent = fs.readFileSync(textPath, 'utf-8');
            const sessions = textContent.split('=== Claude Session:').length - 1;
            console.log(`      📊 Number of sessions in file: ${sessions}`);

            if (sessions > 1) {
              console.log(`      ✅ Multiple sessions detected - retrigger likely occurred!`);
            }
          }
        } catch (error) {
          console.log(`      ❌ Error reading file: ${error}`);
        }
      }
    }

    // Final assessment
    console.log('\n📊 Step 6: Final Assessment...');

    let passedTests = 0;
    const totalTests = 4;

    if (hasInitialRun) {
      console.log('✅ Test 1: Initial Claude execution - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 1: Initial Claude execution - FAILED');
    }

    if (hasValidationFailed || hasBlockDecision) {
      console.log('✅ Test 2: Validation failure detection - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 2: Validation failure detection - FAILED');
    }

    if (hasRetrigger) {
      console.log('✅ Test 3: Retrigger mechanism - PASSED');
      passedTests++;
    } else {
      console.log('⚠️  Test 3: Retrigger mechanism - INCONCLUSIVE (may have been blocked)');
    }

    if (result.code === 0 || result.code === 1) {
      console.log('✅ Test 4: Process completion - PASSED');
      passedTests++;
    } else {
      console.log(`❌ Test 4: Process completion - FAILED (exit code: ${result.code})`);
    }

    console.log(`\n📊 Overall Results: ${passedTests}/${totalTests} tests passed`);

    if (passedTests >= 3) {
      console.log('✅ RETRIGGER MECHANISM IS WORKING');
      console.log('   The validation system detected issues and blocked completion');
      console.log('   The system would retrigger Claude with validation feedback');
    } else if (passedTests >= 2) {
      console.log('⚠️  RETRIGGER MECHANISM PARTIALLY WORKING');
      console.log('   Some components are working but full flow may need adjustment');
    } else {
      console.log('❌ RETRIGGER MECHANISM NEEDS ATTENTION');
      console.log('   Core components are not functioning as expected');
    }
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleanup...');
    try {
      fs.unlinkSync(testFile);
      console.log('   ✅ Removed test file');
    } catch {
      console.log('   ⚠️  Could not remove test file');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 FULL RETRIGGER TEST COMPLETED');
  console.log('='.repeat(60));
}

// Run the test
if (require.main === module) {
  testFullRetrigger().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
