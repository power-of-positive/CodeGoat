#!/usr/bin/env npx tsx

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

// Colors for output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

async function runTest(testName: string, testFn: () => Promise<boolean>): Promise<void> {
  try {
    console.log(`\n${BLUE}Testing: ${testName}${RESET}`);
    const result = await testFn();
    if (result) {
      console.log(`${GREEN}✅ PASS: ${testName}${RESET}`);
    } else {
      console.log(`${RED}❌ FAIL: ${testName}${RESET}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR in ${testName}: ${error}${RESET}`);
    process.exitCode = 1;
  }
}

async function runClaudePromptScript(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
  sessionFiles?: { json?: string; txt?: string };
}> {
  return new Promise(resolve => {
    const scriptPath = path.join(__dirname, 'run-claude-prompt.ts');
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      // Extract session file paths from output
      const jsonMatch = stdout.match(/logs\/claude-session-[^.]+\.json/);
      const txtMatch = stdout.match(/logs\/claude-session-[^.]+\.txt/);

      resolve({
        stdout,
        stderr,
        code,
        sessionFiles: {
          json: jsonMatch ? jsonMatch[0] : undefined,
          txt: txtMatch ? txtMatch[0] : undefined,
        },
      });
    });

    child.on('error', error => {
      console.error('Failed to start script:', error);
      resolve({ stdout: '', stderr: error.message, code: 1, sessionFiles: {} });
    });
  });
}

async function testSimplePromptCreatesFiles(): Promise<boolean> {
  console.log('Running simple prompt test...');

  const result = await runClaudePromptScript(['echo "test"', '--no-validation']);

  console.log(`Exit code: ${result.code}`);
  console.log(
    `Session files found in output: JSON=${result.sessionFiles?.json}, TXT=${result.sessionFiles?.txt}`
  );

  if (result.sessionFiles?.json) {
    const jsonExists = fs.existsSync(result.sessionFiles.json);
    const txtPath = result.sessionFiles.json.replace('.json', '-formatted.txt');
    const txtExists = fs.existsSync(txtPath);

    console.log(`JSON file exists: ${jsonExists} (${result.sessionFiles.json})`);
    console.log(`TXT file exists: ${txtExists} (${txtPath})`);

    if (jsonExists) {
      const jsonContent = fs.readFileSync(result.sessionFiles.json, 'utf8');
      console.log(`JSON file size: ${jsonContent.length} bytes`);
      console.log(`JSON preview: ${jsonContent.substring(0, 200)}...`);
    }

    if (txtExists) {
      const txtContent = fs.readFileSync(txtPath, 'utf8');
      console.log(`TXT file size: ${txtContent.length} bytes`);
      console.log(`TXT preview: ${txtContent.substring(0, 200)}...`);
    }

    return jsonExists && txtExists;
  }

  console.log(`${YELLOW}Warning: No session files found in output${RESET}`);
  console.log('Output preview:', result.stdout.substring(0, 500));
  return false;
}

async function testValidationRetriggerAppendsToSameFiles(): Promise<boolean> {
  console.log('Running validation retrigger test...');

  // Run with validation enabled (will likely fail and retrigger)
  const result = await runClaudePromptScript(['echo "test with validation"']);

  console.log(`Exit code: ${result.code}`);

  // Check if validation was triggered
  const validationTriggered =
    result.stdout.includes('Running validation checks') ||
    result.stdout.includes('Validation failed');
  console.log(`Validation triggered: ${validationTriggered}`);

  if (validationTriggered) {
    const retriggerFound =
      result.stdout.includes('Re-triggering Claude Code') ||
      result.stdout.includes('validation feedback');
    console.log(`Retrigger found: ${retriggerFound}`);
  }

  // Look for all session file references in output
  const allJsonMatches = result.stdout.match(/logs\/claude-session-[^.]+\.json/g) || [];
  const uniqueJsonFiles = [...new Set(allJsonMatches)];

  console.log(`Unique JSON files referenced: ${uniqueJsonFiles.length}`);
  uniqueJsonFiles.forEach(f => console.log(`  - ${f}`));

  // Check if files were appended to (mentioned multiple times)
  const appendMessages = (result.stdout.match(/appended to/gi) || []).length;
  console.log(`Number of 'appended to' messages: ${appendMessages}`);

  // For validation retrigger, we should see the same file being appended to
  if (uniqueJsonFiles.length === 1 && appendMessages > 0) {
    console.log(`${GREEN}✓ Same file used for initial and retrigger${RESET}`);

    // Check the actual file content
    const jsonFile = uniqueJsonFiles[0];
    if (fs.existsSync(jsonFile)) {
      const content = fs.readFileSync(jsonFile, 'utf8');
      const sessions = content.split('\n').filter(line => line.includes('session_id'));
      console.log(`Number of session entries in file: ${sessions.length}`);

      // Extract unique session IDs
      const sessionIds = new Set(
        sessions
          .map(line => {
            try {
              const parsed = JSON.parse(line);
              return parsed.session_id;
            } catch {
              return null;
            }
          })
          .filter(id => id)
      );

      console.log(`Unique session IDs: ${sessionIds.size}`);
      sessionIds.forEach(id => console.log(`  - ${id}`));

      return sessionIds.size > 1; // Should have multiple sessions if retrigger worked
    }
  }

  return false;
}

async function testCommandUsesCorrectFlags(): Promise<boolean> {
  console.log('Checking command construction...');

  const result = await runClaudePromptScript(['test prompt', '--no-validation']);

  // Look for the command in output
  const commandMatch = result.stdout.match(/💬 Command: (.+)/);
  if (commandMatch) {
    const command = commandMatch[1];
    console.log(`Command used: ${command}`);

    const hasP = command.includes('-p');
    const hasFormat = command.includes('--output-format');
    const hasVerbose = command.includes('--verbose');

    console.log(`Has -p flag: ${hasP}`);
    console.log(`Has --output-format: ${hasFormat}`);
    console.log(`Has --verbose: ${hasVerbose}`);

    return hasP && hasFormat && hasVerbose;
  }

  console.log(`${YELLOW}Command not found in output${RESET}`);
  return false;
}

async function main() {
  console.log(`${BLUE}=== Testing Claude Prompt Logging ===${RESET}`);

  // Clean up old test files
  const testPattern = /claude-session-.*\.(json|txt)$/;
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    files
      .filter(f => testPattern.test(f))
      .forEach(f => {
        try {
          fs.unlinkSync(path.join(logsDir, f));
        } catch {
          // Ignore errors
        }
      });
  }

  // Run tests
  await runTest('Simple prompt creates JSON and TXT files', testSimplePromptCreatesFiles);
  await runTest(
    'Command uses correct flags (-p, --output-format, --verbose)',
    testCommandUsesCorrectFlags
  );
  await runTest(
    'Validation retrigger appends to same files',
    testValidationRetriggerAppendsToSameFiles
  );

  console.log(`\n${BLUE}=== Test Summary ===${RESET}`);
  if (process.exitCode === 1) {
    console.log(`${RED}Some tests failed. The script needs fixing.${RESET}`);
  } else {
    console.log(`${GREEN}All tests passed!${RESET}`);
  }
}

main().catch(console.error);
