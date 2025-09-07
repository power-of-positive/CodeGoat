#!/usr/bin/env npx tsx

import { spawn, exec } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { formatClaudeOutput } from './format-claude-output';

const execAsync = promisify(exec);

// Constants
const PROCESS_CHECK_INTERVAL_MS = 2000;
const CLAUDE_COMPLETION_TIMEOUT_MS = 1800000; // 30 minutes
// Removed timeout constants - Claude runs as long as needed

// Log orchestrator messages to session file
function logOrchestratorMessage(
  sessionInfo: { sessionFile: string; formattedFile: string },
  level: string,
  message: string
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    type: 'orchestrator',
    level,
    message,
    timestamp,
  };

  // Ensure logs directory exists
  const logsDir = path.dirname(sessionInfo.sessionFile);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Append to JSON log
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(sessionInfo.sessionFile, logLine);

    // Also update formatted log
    const formattedMessage = `[${timestamp}] [ORCHESTRATOR:${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(sessionInfo.formattedFile, formattedMessage);
  } catch (error) {
    console.warn('Failed to log orchestrator message:', error);
  }
}

interface RunClaudeOptions {
  prompt: string;
  newTerminal?: boolean;
  outputFormat?: 'text' | 'json' | 'stream-json';
  maxTurns?: number;
  verbose?: boolean;
  printMode?: boolean;
  runValidation?: boolean;
}

interface ValidationResult {
  decision: 'approve' | 'block';
  reason?: string;
  feedback?: string;
}

async function runClaudeWithPrompt(options: RunClaudeOptions): Promise<void> {
  const {
    prompt,
    newTerminal = false, // Default to current terminal for output capture
    outputFormat = 'stream-json',
    maxTurns,
    verbose = true,
    printMode = true, // Default to print mode for proper output capture
    runValidation = true,
  } = options;

  logStartupInfo(prompt, printMode, outputFormat);

  // Create session info early to log orchestrator messages
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionFile = path.join(process.cwd(), 'logs', `claude-session-${timestamp}.json`);
  const formattedFile = path.join(
    process.cwd(),
    'logs',
    `claude-session-${timestamp}-formatted.txt`
  );
  const sessionInfo = { sessionFile, formattedFile };

  // Log orchestrator startup to session
  logOrchestratorMessage(sessionInfo, 'startup', `Starting Claude Code with prompt: "${prompt}"`);
  logOrchestratorMessage(
    sessionInfo,
    'info',
    `Mode: ${printMode ? 'Print (non-interactive)' : 'Interactive'}`
  );
  logOrchestratorMessage(sessionInfo, 'info', `Output format: ${outputFormat}`);

  // Run Claude Code
  if (newTerminal && !printMode) {
    const newTerminalSessionInfo = await runInNewTerminal(prompt, {
      outputFormat,
      maxTurns,
      verbose,
    });

    if (runValidation) {
      console.log('\n⏳ Waiting for Claude Code to complete...');
      logOrchestratorMessage(sessionInfo, 'info', 'Waiting for Claude Code to complete...');
      await waitForClaudeCompletion();
      await handleValidationWithRetrigger(
        { outputFormat, maxTurns, verbose },
        newTerminal,
        newTerminalSessionInfo,
        sessionInfo
      );
    }

    // Note about output capture in new terminal mode
    console.log(
      '\n💡 Note: In new terminal mode, only validation retrigger output is captured to files.'
    );
    console.log(`📄 Any validation follow-up will be saved to session files when it runs.`);
    logOrchestratorMessage(
      sessionInfo,
      'info',
      'New terminal mode: only validation retrigger output is captured to files'
    );
  } else {
    await runInCurrentTerminal(prompt, { outputFormat, maxTurns, verbose, printMode }, sessionInfo);

    // Run validation if enabled (only for current terminal mode)
    if (runValidation) {
      await handleValidationWithRetrigger(
        { outputFormat, maxTurns, verbose },
        false,
        sessionInfo,
        sessionInfo
      );
    }
  }
}

function logStartupInfo(prompt: string, printMode: boolean, outputFormat: string) {
  console.log(`🤖 Starting Claude Code with prompt: "${prompt}"`);
  console.log(`📋 Mode: ${printMode ? 'Print (non-interactive)' : 'Interactive'}`);
  console.log(`📄 Output format: ${outputFormat}`);
}

async function logValidationAttempt(
  attempt: number,
  maxAttempts: number,
  orchestratorSessionInfo?: { sessionFile: string; formattedFile: string }
): Promise<void> {
  console.log(`\n🔍 Running validation checks... (attempt ${attempt}/${maxAttempts})`);
  if (orchestratorSessionInfo) {
    logOrchestratorMessage(
      orchestratorSessionInfo,
      'info',
      `Running validation checks... (attempt ${attempt}/${maxAttempts})`
    );
  }
}

async function handleValidationSuccess(
  attempt: number,
  orchestratorSessionInfo?: { sessionFile: string; formattedFile: string }
): Promise<void> {
  console.log('✅ All validation stages passed successfully!');
  if (orchestratorSessionInfo) {
    logOrchestratorMessage(
      orchestratorSessionInfo,
      'success',
      `All validation stages passed successfully after ${attempt} attempt(s)!`
    );
  }
}

async function handleValidationFailure(
  attempt: number,
  reason: string | undefined,
  orchestratorSessionInfo?: { sessionFile: string; formattedFile: string }
): Promise<void> {
  console.log(`❌ Validation attempt ${attempt} failed: ${reason || 'Unknown error'}`);
  if (orchestratorSessionInfo) {
    logOrchestratorMessage(
      orchestratorSessionInfo,
      'error',
      `Validation attempt ${attempt} failed: ${reason || 'Unknown error'}`
    );
  }
}

async function retriggerClaude(
  fixPrompt: string,
  options: ClaudeCliOptions,
  useNewTerminal: boolean,
  sessionInfo: { sessionFile: string; formattedFile: string } | undefined,
  orchestratorSessionInfo?: { sessionFile: string; formattedFile: string },
  validationErrors?: string
): Promise<void> {
  if (useNewTerminal) {
    console.log('🔄 Switching to current terminal for validation fix to ensure proper logging...');
    if (orchestratorSessionInfo) {
      logOrchestratorMessage(
        orchestratorSessionInfo,
        'info',
        'Switching to current terminal for validation fix'
      );
    }
  }

  // Enhance the prompt with validation context
  let enhancedPrompt = fixPrompt;
  if (validationErrors) {
    enhancedPrompt = `${fixPrompt}

Previous validation errors to fix:
${validationErrors}

Please address each of these specific issues in your response.`;
  }

  await runInCurrentTerminal(
    enhancedPrompt,
    { ...options, printMode: true, isRetrigger: true },
    sessionInfo
  );
}

async function handleValidationWithRetrigger(
  options: ClaudeCliOptions,
  useNewTerminal: boolean,
  sessionInfo?: { sessionFile: string; formattedFile: string },
  orchestratorSessionInfo?: { sessionFile: string; formattedFile: string }
): Promise<void> {
  const maxRetriggerAttempts = 100;
  let attempt = 1;
  let accumulatedErrors: string[] = []; // Track errors across attempts

  while (attempt <= maxRetriggerAttempts) {
    await logValidationAttempt(attempt, maxRetriggerAttempts, orchestratorSessionInfo);
    const validationResult = await runValidation();

    if (validationResult.decision === 'approve') {
      await handleValidationSuccess(attempt, orchestratorSessionInfo);
      return;
    }

    await handleValidationFailure(attempt, validationResult.reason, orchestratorSessionInfo);

    if (!validationResult.feedback) {
      console.log(
        '💡 No specific validation feedback available - cannot auto-fix. Please fix issues manually.'
      );
      if (orchestratorSessionInfo) {
        logOrchestratorMessage(
          orchestratorSessionInfo,
          'warn',
          'No specific validation feedback available - user must fix issues manually'
        );
      }
      return;
    }

    // Add current errors to accumulated errors
    if (validationResult.feedback && !accumulatedErrors.includes(validationResult.feedback)) {
      accumulatedErrors.push(validationResult.feedback);
    }

    if (attempt >= maxRetriggerAttempts) {
      console.log(
        `❌ Maximum retrigger attempts (${maxRetriggerAttempts}) reached. Please fix remaining issues manually.`
      );
      if (orchestratorSessionInfo) {
        logOrchestratorMessage(
          orchestratorSessionInfo,
          'error',
          `Maximum retrigger attempts (${maxRetriggerAttempts}) reached`
        );
      }
      return;
    }

    console.log(
      `\n🔄 Re-triggering Claude Code with validation feedback (attempt ${attempt + 1})...`
    );
    if (orchestratorSessionInfo) {
      logOrchestratorMessage(
        orchestratorSessionInfo,
        'info',
        `Re-triggering Claude Code with validation feedback (attempt ${attempt + 1})...`
      );
      logOrchestratorMessage(
        orchestratorSessionInfo,
        'debug',
        `Validation feedback: ${validationResult.feedback}`
      );
    }

    // Create enhanced context with both current and historical errors
    const contextualPrompt = attempt === 1 
      ? `The following validation stage(s) are failing:\n\n${validationResult.feedback}\n\nPlease fix these specific issues and ensure all validation stages pass.`
      : `Validation is still failing after ${attempt} attempt(s). Here are the current issues:\n\n${validationResult.feedback}\n\nPrevious attempts have encountered these errors:\n${accumulatedErrors.slice(0, -1).join('\n\n')}\n\nPlease carefully analyze what hasn't been fixed yet and address the remaining issues.`;

    // Pass the accumulated validation errors context to retrigger
    await retriggerClaude(
      contextualPrompt, 
      options, 
      useNewTerminal, 
      sessionInfo, 
      orchestratorSessionInfo,
      accumulatedErrors.join('\n\n')
    );
    attempt++;
  }
}

// Note: This function is kept for potential future use but currently unused
async function triggerClaudeInOriginalTerminal(
  prompt: string,
  options: ClaudeCliOptions,
  _sessionFile?: string
): Promise<void> {
  const os = platform();

  // Build Claude command with proper escaping for each platform
  switch (os) {
    case 'darwin': {
      // macOS - Send command to frontmost Terminal window
      // Format the prompt properly - convert \n to actual newlines first
      const formattedPrompt = prompt.replace(/\\n/g, '\n');

      // Build the complete command with -p flag for non-interactive mode and file output
      let claudeCmd = `claude -p "${formattedPrompt}" --output-format=${options.outputFormat || 'stream-json'} --verbose --dangerously-skip-permissions`;

      // Add other CLI flags
      if (options.maxTurns) {
        claudeCmd += ` --max-turns ${options.maxTurns}`;
      }

      // Add output redirection to append to the session file if provided
      // Note: We'll handle this differently - use a wrapper that captures and processes

      // Escape for AppleScript
      const escapedCmd = claudeCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      const appleScript = `
        tell application "Terminal"
          activate
          delay 0.5
          do script "${escapedCmd}" in front window
        end tell
      `;

      // Write AppleScript to temp file
      const tempScriptFile = `/tmp/claude_script_${Date.now()}.scpt`;
      fs.writeFileSync(tempScriptFile, appleScript);

      const child = spawn('osascript', [tempScriptFile], {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      const CLEANUP_DELAY_MS = 3000;
      // Clean up temp file after a delay
      setTimeout(() => {
        try {
          fs.unlinkSync(tempScriptFile);
        } catch {
          // Ignore cleanup errors
        }
      }, CLEANUP_DELAY_MS);

      console.log(`🔄 Sent command to original terminal window`);
      console.log(`💬 Command: ${claudeCmd}`);
      break;
    }
    case 'win32': {
      // Windows
      const claudeCmd = `claude -p "${prompt}" --dangerously-skip-permissions`;
      console.log(`💬 Please run this command in your original terminal:\n${claudeCmd}`);
      break;
    }
    case 'linux': {
      // Linux
      const claudeCmd = `claude -p "${prompt}" --dangerously-skip-permissions`;
      console.log(`💬 Please run this command in your original terminal:\n${claudeCmd}`);
      break;
    }
    default: {
      const claudeCmd = `claude -p "${prompt}" --dangerously-skip-permissions`;
      console.log(`💬 Please run this command in your original terminal:\n${claudeCmd}`);
      break;
    }
  }
}

async function checkForActiveClaude(pids: string, currentPid: number): Promise<boolean> {
  const pidList = pids
    .trim()
    .split('\n')
    .filter(pid => pid.trim())
    .map(pid => parseInt(pid.trim()));

  for (const pid of pidList) {
    if (pid === currentPid) {
      continue;
    }

    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o args= 2>/dev/null || true`);
      const command = stdout.trim();

      if (
        command.startsWith('claude ') &&
        !command.includes('run-claude-prompt') &&
        !command.includes('tsx')
      ) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

// Wait for Claude Code to complete by checking for running processes
async function waitForClaudeCompletion(): Promise<void> {
  console.log('   Press Ctrl+C if Claude Code has finished and this is stuck waiting...');

  return new Promise(resolve => {
    let initialDelay = true;
    const currentPid = process.pid;

    const checkInterval = setInterval(async () => {
      try {
        if (initialDelay) {
          initialDelay = false;
          return;
        }

        const child = spawn('pgrep', ['-f', '^claude '], { stdio: 'pipe' });
        let pids = '';

        child.stdout?.on('data', data => {
          pids += data.toString();
        });

        child.on('close', async code => {
          if (code !== 0) {
            console.log('✅ Claude Code completed, running validation...');
            clearInterval(checkInterval);
            resolve();
          } else {
            const hasActiveClaude = await checkForActiveClaude(pids, currentPid);

            if (!hasActiveClaude) {
              console.log('✅ Claude Code completed, running validation...');
              clearInterval(checkInterval);
              resolve();
            }
          }
        });
      } catch {
        clearInterval(checkInterval);
        resolve();
      }
    }, PROCESS_CHECK_INTERVAL_MS);

    setTimeout(() => {
      console.log('⏰ Timeout reached, proceeding with validation...');
      clearInterval(checkInterval);
      resolve();
    }, CLAUDE_COMPLETION_TIMEOUT_MS);
  });
}

interface ClaudeCliOptions {
  outputFormat?: string;
  maxTurns?: number;
  verbose?: boolean;
}

function createSessionFiles(): { sessionFile: string; formattedFile: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionFile = path.join(process.cwd(), 'logs', `claude-session-${timestamp}.json`);
  const formattedFile = path.join(
    process.cwd(),
    'logs',
    `claude-session-${timestamp}-formatted.txt`
  );

  const logsDir = path.dirname(sessionFile);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  return { sessionFile, formattedFile };
}

function buildClaudeCommand(prompt: string, options: ClaudeCliOptions): string {
  let claudeCmd = `claude -p '${prompt}' --output-format=${options.outputFormat || 'stream-json'} --verbose --dangerously-skip-permissions`;

  if (options.maxTurns) {
    claudeCmd += ` --max-turns ${options.maxTurns}`;
  }

  return claudeCmd;
}

function getTerminalCommand(os: string, currentDir: string, claudeCmd: string): string[] {
  switch (os) {
    case 'darwin': {
      const simpleCommand = `cd '${currentDir}' && ${claudeCmd} && echo '✅ Claude Code finished'`;
      return ['osascript', '-e', `tell application "Terminal" to do script "${simpleCommand}"`];
    }
    case 'win32': {
      return [
        'cmd',
        '/c',
        'start',
        'cmd',
        '/k',
        `cd /d "${currentDir}" && ${claudeCmd} && echo Claude Code finished`,
      ];
    }
    case 'linux': {
      return [
        'gnome-terminal',
        '--working-directory',
        currentDir,
        '--',
        'bash',
        '-c',
        `${claudeCmd} && echo '✅ Claude Code finished'`,
      ];
    }
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

async function runInNewTerminal(
  prompt: string,
  options: ClaudeCliOptions
): Promise<{ sessionFile: string; formattedFile: string }> {
  const os = platform();
  const currentDir = process.cwd();

  const sessionInfo = createSessionFiles();
  const claudeCmd = buildClaudeCommand(prompt, options);
  const terminalCommand = getTerminalCommand(os, currentDir, claudeCmd);

  console.log(`📄 Session will be logged (new terminal mode doesn't capture output directly)`);

  const child = spawn(terminalCommand[0], terminalCommand.slice(1), {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  console.log(`🚀 Launched Claude Code in new terminal window`);
  console.log(`💬 Command: ${claudeCmd}`);

  return sessionInfo;
}

interface CurrentTerminalOptions extends ClaudeCliOptions {
  printMode?: boolean;
  isRetrigger?: boolean;
}

async function runInCurrentTerminal(
  prompt: string,
  options: CurrentTerminalOptions,
  sessionInfo?: { sessionFile: string; formattedFile: string }
) {
  return new Promise<void>((resolve, reject) => {
    const args = ['claude'];

    // Always use -p flag for non-interactive mode to ensure output capture
    // This is required for proper logging
    args.push('-p');
    args.push(prompt);

    // Add CLI flags after prompt - always add output format and verbose
    args.push(`--output-format=${options.outputFormat || 'stream-json'}`);
    args.push('--verbose');
    args.push('--dangerously-skip-permissions');

    if (options.maxTurns) {
      args.push('--max-turns', options.maxTurns.toString());
    }

    console.log(`💬 Command: ${args.join(' ')}`);
    console.log(`🔍 Debug: Using ${sessionInfo ? 'existing' : 'new'} session files`);

    // Use existing session files or create new ones
    let sessionFile: string;
    let formattedFile: string;

    if (sessionInfo) {
      sessionFile = sessionInfo.sessionFile;
      formattedFile = sessionInfo.formattedFile;
      console.log(`📝 Appending to existing session: ${sessionFile}`);
    } else {
      // Create output file for this session
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      sessionFile = path.join(process.cwd(), 'logs', `claude-session-${timestamp}.json`);
      formattedFile = path.join(process.cwd(), 'logs', `claude-session-${timestamp}-formatted.txt`);

      // Ensure logs directory exists
      const logsDir = path.dirname(sessionFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      console.log(`📝 Session files will be created:`);
      console.log(`   JSON: ${sessionFile}`);
      console.log(`   Text: ${formattedFile}`);
    }

    let outputBuffer = '';
    let errorBuffer = '';

    console.log(`🚀 Spawning claude with args count: ${args.length}`);

    // Use 'pipe' for stdin too to ensure Claude doesn't detect TTY
    // This forces output to go through stdout/stderr
    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'], // All pipes to ensure capture
      env: { ...process.env, FORCE_COLOR: '0' }, // Disable color output that might interfere
    });

    // Close stdin immediately since we're using -p flag (non-interactive)
    child.stdin?.end();

    let dataReceived = false;

    // Buffer for incremental saving
    let lastSavedLength = 0;

    // Function to save incremental output
    const saveIncrementalOutput = () => {
      const currentOutput = outputBuffer + errorBuffer;
      if (currentOutput.length > lastSavedLength && sessionInfo) {
        const newContent = currentOutput.slice(lastSavedLength);
        if (newContent.trim()) {
          fs.appendFileSync(sessionFile, newContent);
          lastSavedLength = currentOutput.length;

          // Also update formatted file incrementally
          try {
            formatClaudeOutput(sessionFile, formattedFile);
          } catch {
            // Ignore formatting errors during incremental updates
          }
        }
      }
    };

    // Capture stdout
    child.stdout?.on('data', data => {
      const chunk = data.toString();
      outputBuffer += chunk;
      process.stdout.write(chunk); // Also display to console
      if (!dataReceived) {
        console.log(`\n📥 Receiving stdout data (${chunk.length} bytes)...`);
        dataReceived = true;
      }

      // Save incrementally for long-running sessions
      saveIncrementalOutput();
    });

    // Capture stderr
    child.stderr?.on('data', data => {
      const chunk = data.toString();
      errorBuffer += chunk;
      process.stderr.write(chunk); // Also display to console
      if (!dataReceived) {
        console.log(`\n📥 Receiving stderr data (${chunk.length} bytes)...`);
        dataReceived = true;
      }

      // Save incrementally for long-running sessions
      saveIncrementalOutput();
    });

    child.on('close', (code, signal) => {
      // Combine stdout and stderr for complete output
      const fullOutput = outputBuffer + errorBuffer;

      console.log(`\n📊 Process ended with code ${code}${signal ? ` (signal: ${signal})` : ''}`);
      console.log(
        `📊 Output captured: ${outputBuffer.length} bytes (stdout), ${errorBuffer.length} bytes (stderr)`
      );
      console.log(`📊 Data received flag: ${dataReceived}`);

      // Save any remaining output that wasn't saved incrementally
      if (fullOutput.trim() || !sessionInfo) {
        // Always save for new sessions
        const remainingOutput = fullOutput.slice(lastSavedLength);

        if (remainingOutput.trim() && sessionInfo) {
          fs.appendFileSync(sessionFile, remainingOutput);
          console.log(
            `📄 Final output appended to: ${sessionFile} (${remainingOutput.length} bytes)`
          );
        } else if (!sessionInfo) {
          // New session - save everything
          const outputToSave =
            fullOutput ||
            `{"session_start": "${new Date().toISOString()}", "prompt": "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}", "note": "No output captured"}`;
          fs.writeFileSync(sessionFile, outputToSave);
          console.log(`📄 Raw output saved to: ${sessionFile} (${outputToSave.length} bytes)`);
        }

        // Format the output (always regenerate the full formatted file)
        try {
          formatClaudeOutput(sessionFile, formattedFile);
          console.log(`📖 Formatted output saved to: ${formattedFile}`);
        } catch (formatError) {
          console.warn(`⚠️ Could not format output: ${formatError}`);
          // Save raw text as fallback
          fs.writeFileSync(
            formattedFile,
            fullOutput ||
              `Session started: ${new Date().toISOString()}\nPrompt: ${prompt}\nNo output captured.`
          );
        }
      } else if (!fullOutput.trim()) {
        console.log(
          `⚠️ No output was captured. This might happen if Claude is using a different output method.`
        );
        // Still create files to track the session
        const emptySession = `{"session_start": "${new Date().toISOString()}", "prompt": "${prompt}", "note": "No output captured"}`;
        fs.writeFileSync(sessionFile, emptySession);
        fs.writeFileSync(
          formattedFile,
          `Session started: ${new Date().toISOString()}\nPrompt: ${prompt.replace(/\n/g, '\\n')}\n\nNo output captured. Claude might be using interactive mode or different output settings.`
        );
        console.log(`📄 Empty session files created for tracking.`);
        console.log(`⚠️ Claude process may not have produced parseable output.`);
      }

      if (code === 0) {
        console.log('✅ Claude Code finished successfully');
        resolve();
      } else {
        console.log(`❌ Claude Code exited with code ${code}`);
        reject(new Error(`Claude Code exited with code ${code}`));
      }
    });

    // No timeout - let Claude run as long as needed

    child.on('error', error => {
      console.error('❌ Failed to start Claude Code:', error.message);
      reject(error);
    });

    // Handle process interruption (Ctrl+C) to save partial session
    const handleInterruption = () => {
      console.log('\n⚠️ Process interrupted - saving partial session...');
      const currentOutput = outputBuffer + errorBuffer;
      const remainingOutput = currentOutput.slice(lastSavedLength);

      if (remainingOutput.trim() && sessionInfo) {
        fs.appendFileSync(sessionFile, remainingOutput);
        console.log(`📄 Partial session saved to: ${sessionFile}`);

        try {
          formatClaudeOutput(sessionFile, formattedFile);
          console.log(`📖 Formatted partial session saved to: ${formattedFile}`);
        } catch {
          console.log('⚠️ Could not format partial session');
        }
      }

      child.kill('SIGTERM');
    };

    process.once('SIGINT', handleInterruption);
    process.once('SIGTERM', handleInterruption);
  });
}

// Validation function
async function runValidation(): Promise<ValidationResult> {
  return new Promise<ValidationResult>((resolve, _reject) => {
    const hookPath = path.join(__dirname, 'claude-stop-hook.ts');
    const child = spawn('npx', ['tsx', hookPath], {
      stdio: ['ignore', 'pipe', 'pipe'], // Use 'ignore' for stdin to prevent hanging
      detached: false, // Don't detach the process
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096', // Increase memory for validation
        FORCE_COLOR: '0', // Disable color output
      },
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set a timeout to kill the validation if it hangs
    const VALIDATION_TIMEOUT = 25 * 60 * 1000; // 25 minutes
    const timeout = setTimeout(() => {
      console.error('\n⚠️ Validation timeout reached after 25 minutes, killing process...');
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, VALIDATION_TIMEOUT);

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      clearTimeout(timeout);
      if (killed) {
        resolve({
          decision: 'block',
          reason: 'Validation timed out after 25 minutes',
          feedback:
            'The validation process took too long and was terminated. Please check for hanging tests or commands.',
        });
      } else {
        const result = parseValidationResult(code, stdout, stderr);
        resolve(result);
      }
    });

    child.on('error', error => {
      clearTimeout(timeout);
      resolve({
        decision: 'block',
        reason: `Failed to run validation: ${error.message}`,
      });
    });
  });
}

function parseValidationResult(
  code: number | null,
  stdout: string,
  stderr: string
): ValidationResult {
  try {
    if (code === 0) {
      return handleSuccessfulValidation(stdout, stderr);
    } else {
      return handleFailedValidation(stdout, stderr);
    }
  } catch (error) {
    return {
      decision: 'block',
      reason: `Error parsing validation result: ${error}`,
      feedback: extractValidationFeedback(stderr),
    };
  }
}

function handleSuccessfulValidation(stdout: string, stderr: string): ValidationResult {
  const lines = stdout.trim().split('\n');
  const lastLine = lines[lines.length - 1];

  if (lastLine.startsWith('{')) {
    const result = JSON.parse(lastLine);
    if (result.decision === 'approve') {
      return { decision: 'approve' };
    } else {
      return {
        decision: 'block',
        reason: result.reason || 'Validation failed',
        feedback: extractValidationFeedback(stderr),
      };
    }
  } else {
    return { decision: 'approve' };
  }
}

function handleFailedValidation(stdout: string, stderr: string): ValidationResult {
  try {
    const lines = stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine.startsWith('{')) {
      const parsed = JSON.parse(lastLine);
      return {
        decision: 'block',
        reason: parsed.reason || 'Validation failed',
        feedback: extractValidationFeedback(stderr),
      };
    } else {
      throw new Error('No JSON response');
    }
  } catch {
    return {
      decision: 'block',
      reason: 'Validation process failed',
      feedback: extractValidationFeedback(stderr),
    };
  }
}

// Extract error patterns from stderr
function extractErrorPatterns(cleanedStderr: string): string[] {
  const errorPatterns = [
    /Command failed: npm run lint/,
    /Stage failed and continueOnFailure is false/,
    /Fix guidance: (.*)/,
    /Error: (.*)/,
    /❌ (.*)/,
  ];

  const extractedErrors = [];
  for (const line of cleanedStderr.split('\n')) {
    for (const pattern of errorPatterns) {
      const match = line.match(pattern);
      if (match) {
        extractedErrors.push(line.trim());
        break;
      }
    }
  }
  return extractedErrors;
}

// Get actual validation errors by running full validation pipeline
function getActualValidationErrors(): string {
  try {
    const { execSync } = require('child_process');
    const sessionId = `validation-check-${Date.now()}`;
    const validationOutput = execSync(
      `npx ts-node scripts/validate-task.ts ${sessionId} --sequential --settings=settings.json`,
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env, DEBUG: '', DOTENV_CONFIG_DEBUG: 'false' },
      }
    );
    return `All validation stages completed successfully:\n${validationOutput}`;
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    if (execError.stdout || execError.stderr) {
      const errorOutput = (execError.stdout || '') + (execError.stderr || '');
      return `Validation pipeline failed:\n${errorOutput}`; // Full validation output
    }
  }
  return 'Please check the logs for validation issues.';
}

// Extract meaningful validation feedback from stderr with enhanced detail
function extractValidationFeedback(stderr: string): string {
  // First, try to extract structured failure information for re-triggering
  const structuredFeedback = extractStructuredFailures(stderr);
  if (structuredFeedback) {
    return structuredFeedback;
  }

  const lines = stderr.split('\n');
  const relevantLines = lines
    .filter(line => !isDotenvNoise(line))
    .filter(isValidationError)
    .map(line => line.trim());

  // If we have specific validation errors, return them with context
  if (relevantLines.length > 0) {
    return relevantLines.join('\n');
  }

  // Try to extract more detailed information from the stderr
  const cleanedStderr = stderr.replace(/\u001b\[[0-9;]*m/g, ''); // Remove ANSI codes

  const extractedErrors = extractErrorPatterns(cleanedStderr);
  if (extractedErrors.length > 0) {
    return extractedErrors.join('\n');
  }

  // Enhanced error extraction from validation output
  const enhancedFeedback = extractEnhancedValidationErrors(cleanedStderr);
  if (enhancedFeedback) {
    return enhancedFeedback;
  }

  // If no specific errors found, run full validation pipeline to get actual errors
  return getActualValidationErrors();
}

// Extract enhanced validation errors with more context
function extractEnhancedValidationErrors(cleanedStderr: string): string | null {
  const errorSections = [];
  const lines = cleanedStderr.split('\n');
  
  // Look for TypeScript errors
  const tsErrors = lines.filter(line => 
    line.includes('TS') && (line.includes('error') || line.includes('Error'))
  );
  if (tsErrors.length > 0) {
    errorSections.push(`TypeScript Errors:\n${tsErrors.join('\n')}`);
  }

  // Look for lint errors
  const lintErrors = lines.filter(line => 
    line.includes('ESLint') || 
    (line.includes('error') && (line.includes('✖') || line.includes('✘'))) ||
    line.match(/\d+:\d+\s+error/)
  );
  if (lintErrors.length > 0) {
    errorSections.push(`Lint Errors:\n${lintErrors.join('\n')}`);
  }

  // Look for test failures
  const testErrors = lines.filter(line => 
    line.includes('FAIL') || 
    line.includes('Test Suites:') ||
    line.includes('Tests:') ||
    line.includes('expect(') ||
    line.includes('AssertionError')
  );
  if (testErrors.length > 0) {
    errorSections.push(`Test Failures:\n${testErrors.join('\n')}`);
  }

  // Look for build errors
  const buildErrors = lines.filter(line => 
    line.includes('Build failed') ||
    line.includes('compilation error') ||
    line.includes('Module not found')
  );
  if (buildErrors.length > 0) {
    errorSections.push(`Build Errors:\n${buildErrors.join('\n')}`);
  }

  return errorSections.length > 0 ? errorSections.join('\n\n') : null;
}

// Extract structured failure information for better re-triggering
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

function isDotenvNoise(line: string): boolean {
  return line.includes('[dotenv@') || line.includes('injecting env') || line.includes('tip:');
}

function isValidationError(line: string): boolean {
  const errorIndicators = [
    'FAIL',
    'ERROR',
    '✘',
    '❌',
    'Fix guidance:',
    'npm run',
    'Command failed:',
  ];
  return errorIndicators.some(indicator => line.includes(indicator));
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`Usage: npx tsx scripts/run-claude-prompt.ts <prompt> [options]

Options:
  --new-terminal       Run in new terminal window (default: current terminal)
  --output-format      Output format: text|json|stream-json (default: stream-json)
  --max-turns <n>      Maximum agentic turns (default: unlimited)
  --no-validation      Skip validation checks after completion
  
Examples:
  npx tsx scripts/run-claude-prompt.ts "hello"
  npx tsx scripts/run-claude-prompt.ts "help me fix linting errors"
  npx tsx scripts/run-claude-prompt.ts "analyze this code" --output-format json
  npx tsx scripts/run-claude-prompt.ts "help debug" --new-terminal
  npx tsx scripts/run-claude-prompt.ts "quick fix" --no-validation
  
Note: Output is automatically saved to logs/claude-session-*.json and logs/claude-session-*-formatted.txt`);
    process.exit(1);
  }

  const prompt = args[0];
  const options: RunClaudeOptions = {
    prompt,
    newTerminal: args.includes('--new-terminal'), // Changed: default to current terminal
    printMode: true, // Always use print mode for proper output capture
    verbose: true, // Always enable verbose
    runValidation: !args.includes('--no-validation'),
    outputFormat: 'stream-json', // Changed default to stream-json
  };

  // Parse output format
  const formatIndex = args.indexOf('--output-format');
  if (formatIndex !== -1 && formatIndex + 1 < args.length) {
    const format = args[formatIndex + 1];
    if (['text', 'json', 'stream-json'].includes(format)) {
      options.outputFormat = format as 'text' | 'json' | 'stream-json';
    }
  }

  // Parse max turns
  const turnsIndex = args.indexOf('--max-turns');
  if (turnsIndex !== -1 && turnsIndex + 1 < args.length) {
    const turns = parseInt(args[turnsIndex + 1]);
    if (!isNaN(turns)) {
      options.maxTurns = turns;
    }
  }

  try {
    await runClaudeWithPrompt(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runClaudeWithPrompt };
