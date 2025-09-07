#!/usr/bin/env npx tsx

/**
 * Test script to simulate a failing validation stage
 * This will help test the Claude retriggering mechanism
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Create a temporary settings file with a failing validation stage
const testSettings = {
  fallback: {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallbacks: true,
    fallbackOnContextLength: true,
    fallbackOnRateLimit: true,
    fallbackOnServerError: false,
  },
  validation: {
    stages: [
      {
        id: 'test-fail',
        name: 'Test Failure Stage',
        command: 'exit 1', // Always fails
        enabled: true,
        continueOnError: false,
        timeout: 5000,
      },
    ],
    enableMetrics: true,
    maxAttempts: 1,
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: true,
    logsDir: './logs',
    accessLogFile: 'access.log',
    appLogFile: 'app.log',
    errorLogFile: 'error.log',
    maxFileSize: '10485760',
    maxFiles: '10',
    datePattern: 'YYYY-MM-DD',
  },
};

const testSettingsPath = path.join(__dirname, '..', 'settings-test-fail.json');

async function runTest() {
  console.log('🧪 Testing Claude retriggering with failing validation stage\n');

  // Step 1: Create test settings file
  console.log('📝 Creating test settings file with failing validation stage...');
  fs.writeFileSync(testSettingsPath, JSON.stringify(testSettings, null, 2));
  console.log(`   Created: ${testSettingsPath}\n`);

  // Step 2: Run validation with the failing stage
  console.log('🔍 Running validation with failing stage...');

  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        'tsx',
        path.join(__dirname, 'validate-task.ts'),
        'test-session-fail',
        `--settings=${testSettingsPath}`,
      ],
      {
        stdio: 'inherit',
      }
    );

    child.on('close', code => {
      console.log(`\n📊 Validation exited with code: ${code}`);

      if (code !== 0) {
        console.log('✅ Validation failed as expected!');
        console.log('\n📋 This confirms that:');
        console.log('   1. The validation stage executed and failed');
        console.log('   2. The validation system properly detected the failure');
        console.log('   3. Claude would be retriggered with this failure feedback\n');

        // Clean up test settings file
        try {
          fs.unlinkSync(testSettingsPath);
          console.log('🧹 Cleaned up test settings file');
        } catch (err) {
          console.warn('⚠️  Could not clean up test settings file:', err);
        }

        resolve();
      } else {
        reject(new Error('Validation should have failed but passed'));
      }
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

async function testClaudeRetrigger() {
  console.log('🚀 Testing full Claude retrigger flow\n');

  // Create test prompt file
  const testPrompt = 'echo "Test task that will fail validation"';

  console.log('📝 Test prompt:', testPrompt);
  console.log('\n⚠️  Note: This test will demonstrate the retrigger mechanism');
  console.log('   The validation will fail and show how Claude would be retriggered\n');

  // Run claude-stop-hook with the test settings
  console.log('🔍 Running claude-stop-hook with failing validation...\n');

  return new Promise<void>((resolve, reject) => {
    const hookEnv = {
      ...process.env,
      CLAUDE_STOP_HOOK: 'true',
    };

    // Temporarily replace settings.json
    const originalSettings = path.join(__dirname, '..', 'settings.json');
    const backupSettings = path.join(__dirname, '..', 'settings.backup.json');

    // Backup current settings
    if (fs.existsSync(originalSettings)) {
      fs.copyFileSync(originalSettings, backupSettings);
    }

    // Copy test settings to settings.json
    fs.copyFileSync(testSettingsPath, originalSettings);

    const child = spawn('npx', ['tsx', path.join(__dirname, 'claude-stop-hook.ts')], {
      env: hookEnv,
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let output = '';
    child.stdout?.on('data', data => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.on('close', code => {
      // Restore original settings
      if (fs.existsSync(backupSettings)) {
        fs.copyFileSync(backupSettings, originalSettings);
        fs.unlinkSync(backupSettings);
      } else {
        fs.unlinkSync(originalSettings);
      }

      // Clean up test settings
      try {
        fs.unlinkSync(testSettingsPath);
      } catch {
        // Ignore if file doesn't exist
      }

      console.log('\n📊 Hook exit code:', code);

      if (code === 2 && output.includes('block')) {
        console.log('\n✅ Claude stop hook correctly blocked completion!');
        console.log('   The validation failure would trigger Claude to be re-run');
        console.log('   with feedback about the validation errors.\n');

        // Parse the JSON output
        try {
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{'));
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            console.log('📋 Block reason:', result.reason);
            if (result.feedback) {
              console.log('💬 Feedback for Claude:', result.feedback);
            }
          }
        } catch {
          // Ignore JSON parse errors
        }

        resolve();
      } else if (code === 0) {
        reject(new Error('Hook should have blocked but approved'));
      } else {
        reject(new Error(`Unexpected hook exit code: ${code}`));
      }
    });

    child.on('error', error => {
      // Restore settings on error
      if (fs.existsSync(backupSettings)) {
        fs.copyFileSync(backupSettings, originalSettings);
        fs.unlinkSync(backupSettings);
      }
      reject(error);
    });
  });
}

// Main execution
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('🧪 CLAUDE RETRIGGER MECHANISM TEST');
    console.log('='.repeat(60) + '\n');

    // Test 1: Direct validation failure
    await runTest();

    console.log('\n' + '-'.repeat(60) + '\n');

    // Test 2: Full claude-stop-hook with validation failure
    await testClaudeRetrigger();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60));

    console.log('\n📋 Summary:');
    console.log('   1. Validation stages can be configured to fail');
    console.log('   2. Failed validations are properly detected');
    console.log('   3. Claude stop hook blocks completion on validation failure');
    console.log('   4. The system is ready to retrigger Claude with error feedback\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
