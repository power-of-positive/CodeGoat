#!/usr/bin/env npx ts-node

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Constants
const SESSION_TIMEOUT_MINUTES = 30;
const HOOK_TIMEOUT_MINUTES = 5;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MINUTES_TO_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const MAX_LOG_ENTRIES = 20;
const PROMPT_PREVIEW_LENGTH = 100;
const MAX_OUTPUT_LENGTH = 200;
const SLEEP_BETWEEN_ATTEMPTS = 2000;
const FORCE_COLOR_VALUE = '1';
const DEFAULT_MAX_ATTEMPTS = 10;
const FOLLOWUP_PREFIX_LENGTH = 9;

interface SupervisorConfig {
  maxAttempts: number;
  sessionTimeout: number; // milliseconds
  hookTimeout: number; // milliseconds
  logDir: string;
  claudeCommand: string[];
}

interface SessionResult {
  success: boolean;
  sessionId: string;
  attempts: number;
  validationResults?: ValidationResult[];
  error?: string;
  logs: string[];
}

interface ValidationResult {
  stage: string;
  success: boolean;
  error?: string;
  output?: string;
}

class ClaudeSupervisor {
  private config: SupervisorConfig;
  private currentSession: ChildProcess | null = null;
  private sessionCounter = 0;
  private isRunning = false;
  private rl: readline.Interface;
  private logs: string[] = [];

  constructor(config: Partial<SupervisorConfig> = {}) {
    this.config = {
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      sessionTimeout: SESSION_TIMEOUT_MINUTES * MINUTES_TO_MS,
      hookTimeout: HOOK_TIMEOUT_MINUTES * MINUTES_TO_MS,
      logDir: './logs/supervisor',
      claudeCommand: ['claude'],
      ...config
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.setupInteractiveCommands();
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    await fs.mkdir(this.config.logDir, { recursive: true });
  }

  private setupInteractiveCommands(): void {
    this.rl.on('line', async (input) => {
      const command = input.trim().toLowerCase();
      
      switch (command) {
        case 'status':
          this.showStatus();
          break;
        case 'interrupt':
        case 'stop':
          await this.interrupt();
          break;
        case 'logs':
          this.showLogs();
          break;
        case 'restart':
          await this.restart();
          break;
        case 'quit':
        case 'exit':
          await this.shutdown();
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          if (command.startsWith('followup ')) {
            const message = input.substring(FOLLOWUP_PREFIX_LENGTH);
            await this.addFollowup(message);
          } else {
            console.error('🤔 Unknown command. Type "help" for available commands.');
          }
      }
    });
  }

  private showHelp(): void {
    console.error(`
📚 Claude Supervisor Commands:
  status       - Show current session status
  logs         - Show recent logs
  interrupt    - Stop current Claude session
  restart      - Restart current session
  followup <msg> - Add followup message to current session
  quit         - Shutdown supervisor
  help         - Show this help
    `);
  }

  private showStatus(): void {
    console.error(`
📊 Claude Supervisor Status:
  Running: ${this.isRunning}
  Session: ${this.sessionCounter}
  Process: ${this.currentSession ? `PID ${this.currentSession.pid}` : 'None'}
  Logs: ${this.logs.length} entries
    `);
  }

  private showLogs(): void {
    console.error('\n📜 Recent Logs:');
    this.logs.slice(-MAX_LOG_ENTRIES).forEach(log => console.error(log));
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.error(logEntry);
  }

  async runSession(initialPrompt: string): Promise<SessionResult> {
    this.sessionCounter++;
    const sessionId = `session-${this.sessionCounter}-${Date.now()}`;
    let attempts = 0;
    
    this.log(`🚀 Starting supervised Claude session: ${sessionId}`);
    this.log(`📝 Initial prompt: ${initialPrompt.substring(0, PROMPT_PREVIEW_LENGTH)}...`);

    const result: SessionResult = {
      success: false,
      sessionId,
      attempts: 0,
      logs: []
    };

    while (attempts < this.config.maxAttempts && this.isRunning) {
      attempts++;
      result.attempts = attempts;
      
      this.log(`🔄 Attempt ${attempts}/${this.config.maxAttempts}`);
      
      try {
        // Run Claude Code session
        const claudeResult = await this.runClaudeCode(sessionId, initialPrompt, attempts);
        
        if (!claudeResult.success) {
          this.log(`❌ Claude session failed: ${claudeResult.error}`);
          continue;
        }

        this.log(`✅ Claude session completed, running validation...`);
        
        // Run validation hook
        const validationResult = await this.runValidationHook(sessionId);
        
        if (validationResult.success) {
          this.log(`🎉 Validation passed! Session completed successfully.`);
          result.success = true;
          result.validationResults = validationResult.results;
          break;
        } else {
          this.log(`❌ Validation failed, preparing feedback for next attempt...`);
          result.validationResults = validationResult.results;
          
          // Generate feedback prompt for next iteration
          initialPrompt = this.generateFeedbackPrompt(validationResult.results, attempts);
          this.log(`🔄 Generated feedback prompt for next attempt`);
        }
        
      } catch (error) {
        this.log(`💥 Session error: ${error}`);
        result.error = error instanceof Error ? error.message : String(error);
      }
      
      // Brief pause between attempts
      await this.sleep(SLEEP_BETWEEN_ATTEMPTS);
    }

    if (!result.success) {
      this.log(`❌ Session failed after ${attempts} attempts`);
    }

    result.logs = [...this.logs];
    await this.saveSessionResults(result);
    
    return result;
  }

  // eslint-disable-next-line max-lines-per-function
  private async runClaudeCode(sessionId: string, prompt: string, attempt: number): Promise<{success: boolean, error?: string}> {
    return new Promise((resolve) => {
      const logFile = path.join(this.config.logDir, `${sessionId}-attempt-${attempt}.log`);
      
      this.log(`🤖 Starting Claude session...`);
      this.log(`📝 Prompt: ${prompt.substring(0, PROMPT_PREVIEW_LENGTH)}...`);
      
      // Use the same pattern as worker system
      const claudeCommand = 'npx';
      const claudeArgs = [
        '-y',
        '@anthropic-ai/claude-code@latest',
        '-p',
        '--dangerously-skip-permissions',
        '--verbose',
        '--output-format=stream-json',
      ];
      
      // Create claude process directly (same as worker system)
      this.currentSession = spawn(claudeCommand, claudeArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          FORCE_COLOR: FORCE_COLOR_VALUE,
          CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
          CLAUDE_SUPERVISOR_SESSION: sessionId 
        }
      });

      let output = '';

      // Capture output
      this.currentSession.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.log(`[Claude] ${text.trim()}`);
      });

      this.currentSession.stderr?.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.log(`[Claude Error] ${text.trim()}`);
      });

      // Send initial prompt via stdin (same as worker system)
      this.currentSession.stdin?.write(prompt + '\n');
      this.currentSession.stdin?.end();

      // Set timeout
      const timeout = setTimeout(() => {
        this.log(`⏰ Session timeout after ${this.config.sessionTimeout}ms`);
        this.currentSession?.kill('SIGTERM');
        resolve({ success: false, error: 'Session timeout' });
      }, this.config.sessionTimeout);

      // Handle completion
      this.currentSession.on('close', async (code) => {
        clearTimeout(timeout);
        
        // Save session log
        await fs.writeFile(logFile, `STDOUT/STDERR:\n${output}\n`);
        
        if (code === 0) {
          this.log(`✅ Claude session completed successfully`);
          resolve({ success: true });
        } else {
          this.log(`❌ Claude session failed with code ${code}`);
          resolve({ success: false, error: `Exit code ${code}` });
        }
        
        this.currentSession = null;
      });

      this.currentSession.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`💥 Claude process error: ${error.message}`);
        resolve({ success: false, error: error.message });
      });
    });
  }

  private async runValidationHook(sessionId: string): Promise<{success: boolean, results: ValidationResult[]}> {
    return new Promise((resolve) => {
      this.log(`🔍 Running validation hook...`);
      
      const hookProcess = spawn('npx', ['ts-node', 'scripts/claude-stop-hook.ts'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, CLAUDE_SUPERVISOR_VALIDATION: sessionId }
      });

      let output = '';

      hookProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.log(`[Hook] ${text.trim()}`);
      });

      hookProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        this.log(`[Hook Error] ${text.trim()}`);
      });

      const timeout = setTimeout(() => {
        this.log(`⏰ Validation hook timeout`);
        hookProcess.kill('SIGTERM');
        resolve({ success: false, results: [] });
      }, this.config.hookTimeout);

      hookProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        const results = this.parseValidationResults(output);
        
        if (code === 0) {
          this.log(`✅ Validation hook passed`);
          resolve({ success: true, results });
        } else {
          this.log(`❌ Validation hook failed with code ${code}`);
          resolve({ success: false, results });
        }
      });
    });
  }

  private parseValidationResults(output: string): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Parse validation output for stage results
    // This would need to be adapted based on your validation hook output format
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('✅') && line.includes('Passed')) {
        const stageName = this.extractStageName(line);
        if (stageName) {
          results.push({ stage: stageName, success: true });
        }
      } else if (line.includes('❌') && line.includes('Failed')) {
        const stageName = this.extractStageName(line);
        if (stageName) {
          results.push({ 
            stage: stageName, 
            success: false,
            error: line
          });
        }
      }
    }
    
    return results;
  }

  private extractStageName(line: string): string | null {
    // Extract stage name from validation output line
    const match = line.match(/\[(.*?)\]/);
    return match ? match[1] : null;
  }

  private generateFeedbackPrompt(validationResults: ValidationResult[], attempt: number): string {
    const failedStages = validationResults.filter(r => !r.success);
    
    let prompt = `Previous attempt ${attempt} failed validation. Please fix the following issues:\n\n`;
    
    for (const failure of failedStages) {
      prompt += `❌ ${failure.stage}: ${failure.error || 'Failed'}\n`;
      if (failure.output) {
        prompt += `   Output: ${failure.output.substring(0, MAX_OUTPUT_LENGTH)}...\n`;
      }
    }
    
    prompt += `\nPlease address these validation failures and ensure all tests pass before completion. `;
    prompt += `Do not stop until all validation stages are green.`;
    
    return prompt;
  }

  private async saveSessionResults(result: SessionResult): Promise<void> {
    const filename = path.join(this.config.logDir, `${result.sessionId}-results.json`);
    await fs.writeFile(filename, JSON.stringify(result, null, 2));
  }

  private async addFollowup(message: string): Promise<void> {
    if (this.currentSession && this.currentSession.stdin) {
      this.log(`💬 Sending followup: ${message}`);
      this.currentSession.stdin.write(message + '\n');
    } else {
      this.log(`❌ No active session to send followup to`);
    }
  }

  private async interrupt(): Promise<void> {
    if (this.currentSession) {
      this.log(`🛑 Interrupting current session...`);
      this.currentSession.kill('SIGTERM');
      this.currentSession = null;
    } else {
      this.log(`ℹ️ No active session to interrupt`);
    }
  }

  private async restart(): Promise<void> {
    await this.interrupt();
    this.log(`🔄 Restart requested - ready for new session`);
  }

  private async shutdown(): Promise<void> {
    this.log(`🛑 Shutting down supervisor...`);
    this.isRunning = false;
    await this.interrupt();
    this.rl.close();
    process.exit(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  start(): void {
    this.isRunning = true;
    this.log(`🎯 Claude Supervisor started. Type 'help' for commands.`);
    this.showHelp();
  }
}

// CLI Interface
// eslint-disable-next-line complexity
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error(`
🎯 Claude Supervisor - Automated Claude Code with Validation

Usage:
  npx ts-node scripts/claude-supervisor.ts "Your prompt here"
  npx ts-node scripts/claude-supervisor.ts --interactive

Options:
  --interactive    Start in interactive mode
  --max-attempts N Set maximum retry attempts (default: 10)  
  --timeout N      Set session timeout in minutes (default: 30)

Examples:
  npx ts-node scripts/claude-supervisor.ts "Fix all failing tests and ensure 80% coverage"
  npx ts-node scripts/claude-supervisor.ts --interactive
    `);
    process.exit(1);
  }

  const config: Partial<SupervisorConfig> = {};
  let prompt = '';
  let interactive = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--interactive') {
      interactive = true;
    } else if (arg === '--max-attempts') {
      config.maxAttempts = parseInt(args[++i]);
    } else if (arg === '--timeout') {
      config.sessionTimeout = parseInt(args[++i]) * MINUTES_TO_MS;
    } else {
      prompt = arg;
    }
  }

  const supervisor = new ClaudeSupervisor(config);
  supervisor.start();

  if (interactive) {
    console.error('🎮 Interactive mode - waiting for commands...');
    // Keep process alive for interactive commands
    process.stdin.resume();
  } else if (prompt) {
    try {
      const result = await supervisor.runSession(prompt);
      
      console.error('\n📊 Final Results:');
      console.error(`  Success: ${result.success}`);
      console.error(`  Attempts: ${result.attempts}`);
      console.error(`  Session ID: ${result.sessionId}`);
      
      if (result.validationResults) {
        console.error(`  Validation Results:`);
        for (const vr of result.validationResults) {
          console.error(`    ${vr.success ? '✅' : '❌'} ${vr.stage}`);
        }
      }
      
      process.exit(result.success ? 0 : 1);
      
    } catch (error) {
      console.error(`💥 Supervisor error:`, error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ClaudeSupervisor };