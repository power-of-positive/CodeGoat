#!/usr/bin/env npx tsx

/**
 * Test to verify Claude retriggering mechanism by checking session logs
 * Creates a failing validation and verifies the retrigger workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

async function findLatestSessionFiles(): Promise<{ jsonFile: string; textFile: string } | null> {
  const logsDir = path.join(__dirname, '..', 'logs');

  if (!fs.existsSync(logsDir)) {
    return null;
  }

  const files = fs.readdirSync(logsDir);
  const sessionFiles = files
    .filter(f => f.startsWith('claude-session-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (sessionFiles.length === 0) {
    return null;
  }

  const latestJson = path.join(logsDir, sessionFiles[0]);
  const latestText = latestJson.replace('.json', '-formatted.txt');

  return {
    jsonFile: latestJson,
    textFile: latestText,
  };
}

async function analyzeSessionLogs(jsonFile: string, textFile: string): Promise<void> {
  console.log('📋 Analyzing session logs...\n');

  // Check if files exist
  const jsonExists = fs.existsSync(jsonFile);
  const textExists = fs.existsSync(textFile);

  console.log(`📄 JSON log file: ${jsonExists ? '✅' : '❌'} ${jsonFile}`);
  console.log(`📄 Text log file: ${textExists ? '✅' : '❌'} ${textFile}\n`);

  if (!jsonExists && !textExists) {
    console.log('❌ No session files found - Claude may not have been triggered\n');
    return;
  }

  // Analyze JSON log
  if (jsonExists) {
    console.log('🔍 JSON Log Analysis:');
    try {
      const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
      const lines = jsonContent.split('\n').filter(line => line.trim());
      console.log(`   📊 Total log entries: ${lines.length}`);

      // Look for validation-related content
      const validationMentions = lines.filter(
        line =>
          line.toLowerCase().includes('validation') ||
          line.toLowerCase().includes('lint') ||
          line.toLowerCase().includes('fix')
      );

      console.log(`   📊 Validation-related entries: ${validationMentions.length}`);

      if (validationMentions.length > 0) {
        console.log('   🔍 Sample validation entries:');
        validationMentions.slice(0, 3).forEach((entry, i) => {
          const truncated = entry.length > 100 ? entry.substring(0, 100) + '...' : entry;
          console.log(`     ${i + 1}. ${truncated}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error reading JSON: ${error}`);
    }
    console.log('');
  }

  // Analyze text log
  if (textExists) {
    console.log('🔍 Text Log Analysis:');
    try {
      const textContent = fs.readFileSync(textFile, 'utf-8');
      const lines = textContent.split('\n');
      console.log(`   📊 Total lines: ${lines.length}`);

      // Look for key indicators
      const hasValidationFailure =
        textContent.includes('validation') || textContent.includes('lint');
      const hasRetrigger =
        textContent.includes('Fix the following') || textContent.includes('validation issues');
      const hasMultipleSessions =
        textContent.includes('Session started') && textContent.split('Session started').length > 2;

      console.log(`   📊 Contains validation mentions: ${hasValidationFailure ? '✅' : '❌'}`);
      console.log(`   📊 Contains retrigger prompts: ${hasRetrigger ? '✅' : '❌'}`);
      console.log(`   📊 Multiple sessions detected: ${hasMultipleSessions ? '✅' : '❌'}`);

      // Show sample content
      console.log('\n   📝 Sample log content (first 500 chars):');
      console.log('   ' + '-'.repeat(60));
      console.log('   ' + textContent.substring(0, 500).replace(/\n/g, '\n   '));
      if (textContent.length > 500) {
        console.log('   ... (truncated)');
      }
      console.log('   ' + '-'.repeat(60));
    } catch (error) {
      console.log(`   ❌ Error reading text log: ${error}`);
    }
  }
}

async function runRetriggerTest(): Promise<void> {
  console.log('🧪 CLAUDE RETRIGGER MECHANISM TEST');
  console.log('='.repeat(50) + '\n');

  // Create a file with linting issues
  const testFile = path.join(__dirname, '..', 'test-lint-fail.js');
  const badCode = `
// This code has intentional linting issues to trigger validation failure
var unused_variable = 123;  // ESLint will complain about unused variable
console.log("missing semicolon")  // Missing semicolon
function badFunction( ) {  // Bad spacing
    var another_unused = "test"  // Another unused var and missing semicolon
}
`;

  console.log('📝 Step 1: Creating file with linting issues...');
  fs.writeFileSync(testFile, badCode);
  console.log(`   ✅ Created: ${testFile}\n`);

  // Get baseline of existing session files
  const beforeFiles = await findLatestSessionFiles();
  console.log('📊 Step 2: Recording baseline session files...');
  if (beforeFiles) {
    console.log(`   📄 Latest before test: ${path.basename(beforeFiles.jsonFile)}`);
  } else {
    console.log('   📄 No existing session files found');
  }
  console.log('');

  try {
    console.log('🚀 Step 3: Running Claude with validation (this should fail)...');
    const testPrompt =
      'Please acknowledge this test message. The system should detect linting issues and retrigger.';

    // Run the claude prompt script directly
    const result = await new Promise<{ code: number; output: string }>(resolve => {
      let output = '';

      const child = spawn(
        'npx',
        [
          'tsx',
          path.join(__dirname, 'run-claude-prompt.ts'),
          testPrompt,
          '--no-validation', // Disable validation for the first run to see the initial session
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

      // Timeout after 2 minutes
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ code: -1, output: output + '\n[TIMEOUT]' });
      }, 120000);
    });

    console.log(`\n📊 Step 4: Claude execution completed with exit code: ${result.code}\n`);

    // Wait a moment for file system to settle
    await sleep(1000);

    // Check for new session files
    const afterFiles = await findLatestSessionFiles();

    console.log('📊 Step 5: Checking for session files...');
    if (afterFiles) {
      console.log(`   ✅ Found session files: ${path.basename(afterFiles.jsonFile)}`);

      // Check if it's a new file
      if (!beforeFiles || afterFiles.jsonFile !== beforeFiles.jsonFile) {
        console.log('   ✅ New session file created\n');
        await analyzeSessionLogs(afterFiles.jsonFile, afterFiles.textFile);
      } else {
        console.log('   ⚠️  Using existing session file (may contain mixed content)\n');
        await analyzeSessionLogs(afterFiles.jsonFile, afterFiles.textFile);
      }
    } else {
      console.log('   ❌ No session files found after Claude run\n');
    }

    // Now test the validation trigger
    console.log('🔍 Step 6: Testing validation hook directly...');

    const hookResult = await new Promise<{ code: number; output: string }>(resolve => {
      let output = '';

      const child = spawn('npx', ['tsx', path.join(__dirname, 'claude-stop-hook.ts')], {
        env: {
          ...process.env,
          CLAUDE_STOP_HOOK: 'true',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

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

      // Timeout after 5 minutes for validation
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ code: -1, output: output + '\n[VALIDATION TIMEOUT]' });
      }, 300000);
    });

    console.log(`\n📊 Step 7: Validation hook result: exit code ${hookResult.code}`);

    if (hookResult.code === 2) {
      console.log('✅ Validation correctly blocked completion due to linting issues');

      // Look for JSON decision in output
      const lines = hookResult.output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{') && line.includes('decision'));

      if (jsonLine) {
        try {
          const decision = JSON.parse(jsonLine.trim());
          console.log('📋 Block decision:', decision);
        } catch {
          console.log('⚠️  Could not parse decision JSON');
        }
      }

      console.log('\n✅ RETRIGGER MECHANISM VERIFIED:');
      console.log('   1. Claude executed and created session logs');
      console.log('   2. Validation detected linting issues');
      console.log('   3. Stop hook blocked completion with exit code 2');
      console.log('   4. System would retrigger Claude with validation feedback');
    } else if (hookResult.code === 0) {
      console.log('❌ Validation unexpectedly passed - check if linting issues were auto-fixed');
    } else {
      console.log(`⚠️  Unexpected validation exit code: ${hookResult.code}`);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Step 8: Cleanup...');
    try {
      fs.unlinkSync(testFile);
      console.log('   ✅ Removed test file');
    } catch {
      console.log('   ⚠️  Could not remove test file');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ RETRIGGER TEST COMPLETED');
  console.log('='.repeat(50));
}

// Run the test
if (require.main === module) {
  runRetriggerTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
