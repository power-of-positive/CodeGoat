/**
 * AgentExecutorService - Manages multiple AI coding agents with profile support
 * 
 * Mirrors the Rust backend's multi-agent architecture by supporting:
 * - Multiple AI agents (Claude, OpenAI, local models)
 * - Profile-specific configurations
 * - Agent-specific command building
 * - Execution result normalization
 */

import { spawn, ChildProcess } from 'child_process';
import { ILogger } from '../logger-interface';

export type AgentType = 'claude' | 'openai' | 'local' | 'custom';

export interface AgentProfile {
  type: AgentType;
  name: string;
  command: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
  description?: string;
}

export interface AgentExecutionConfig {
  profile: AgentProfile;
  workingDirectory: string;
  prompt: string;
  timeout?: number;
}

export interface AgentExecutionResult {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration: number;
  agentType: AgentType;
  profileName: string;
  error?: string;
}

export class AgentExecutorService {
  private logger: ILogger;
  private activeExecutions = new Map<string, ChildProcess>();
  
  // Default agent profiles mirroring Rust backend capabilities
  private defaultProfiles: Record<string, AgentProfile> = {
    'claude-default': {
      type: 'claude',
      name: 'Claude Default',
      command: ['claude'],
      timeout: 30 * 60 * 1000, // 30 minutes
      description: 'Default Claude Code profile'
    },
    'claude-quick': {
      type: 'claude',
      name: 'Claude Quick',
      command: ['claude', '--quick'],
      timeout: 10 * 60 * 1000, // 10 minutes
      description: 'Quick Claude Code profile for smaller tasks'
    },
    'claude-detailed': {
      type: 'claude',
      name: 'Claude Detailed',
      command: ['claude', '--detailed'],
      timeout: 60 * 60 * 1000, // 1 hour
      description: 'Detailed Claude Code profile for complex tasks'
    },
    'openai-gpt4': {
      type: 'openai',
      name: 'OpenAI GPT-4',
      command: ['openai-cli', '--model', 'gpt-4'],
      timeout: 30 * 60 * 1000,
      description: 'OpenAI GPT-4 via CLI'
    },
    'local-codellama': {
      type: 'local',
      name: 'Local CodeLlama',
      command: ['ollama', 'run', 'codellama'],
      timeout: 45 * 60 * 1000,
      description: 'Local CodeLlama model via Ollama'
    }
  };

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Get available agent profiles
   */
  getAvailableProfiles(): Record<string, AgentProfile> {
    return { ...this.defaultProfiles };
  }

  /**
   * Get a specific profile by name
   */
  getProfile(profileName: string): AgentProfile | null {
    return this.defaultProfiles[profileName] || null;
  }

  /**
   * Add or update a custom agent profile
   */
  addCustomProfile(name: string, profile: AgentProfile): void {
    this.defaultProfiles[name] = profile;
    this.logger.info(`Added custom agent profile: ${name}`, { 
      type: profile.type,
      command: profile.command 
    });
  }

  /**
   * Execute an agent with the given configuration
   */
  async executeAgent(config: AgentExecutionConfig): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const executionId = `${config.profile.name}-${Date.now()}`;
    
    try {
      this.logger.info('Starting agent execution', {
        executionId,
        profileName: config.profile.name,
        agentType: config.profile.type,
        workingDirectory: config.workingDirectory
      });

      const result = await this.spawnAgent(executionId, config);
      
      return {
        ...result,
        duration: Date.now() - startTime,
        agentType: config.profile.type,
        profileName: config.profile.name
      };

    } catch (error) {
      this.logger.error('Agent execution failed', error as Error, {
        executionId,
        profileName: config.profile.name
      });

      return {
        success: false,
        duration: Date.now() - startTime,
        agentType: config.profile.type,
        profileName: config.profile.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Build agent command with prompt injection
   */
  private buildAgentCommand(profile: AgentProfile, prompt: string): string[] {
    const command = [...profile.command];
    
    // Agent-specific prompt injection patterns
    switch (profile.type) {
      case 'claude':
        // Claude Code expects prompt as stdin or as final argument
        return command;
      
      case 'openai':
        // OpenAI CLI might expect --prompt flag
        command.push('--prompt', prompt);
        return command;
      
      case 'local':
        // Local models typically expect prompt as final argument
        return command;
      
      case 'custom':
        // Custom agents use command as-is
        return command;
      
      default:
        return command;
    }
  }

  /**
   * Spawn the agent process
   */
  private async spawnAgent(
    executionId: string, 
    config: AgentExecutionConfig
  ): Promise<Omit<AgentExecutionResult, 'duration' | 'agentType' | 'profileName'>> {
    return new Promise((resolve, reject) => {
      const command = this.buildAgentCommand(config.profile, config.prompt);
      const [executable, ...args] = command;
      
      const env = {
        ...process.env,
        ...config.profile.environment
      };

      this.logger.debug?.('Spawning agent process', {
        executionId,
        executable,
        args,
        workingDirectory: config.workingDirectory
      });

      const childProcess = spawn(executable, args, {
        cwd: config.workingDirectory,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      this.activeExecutions.set(executionId, childProcess);

      let stdout = '';
      let stderr = '';
      let hasEnded = false;

      // Collect output
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      childProcess.on('close', (code, signal) => {
        if (hasEnded) return;
        hasEnded = true;

        this.logger.info('Agent execution completed', {
          executionId,
          exitCode: code,
          signal
        });

        resolve({
          success: code === 0,
          exitCode: code ?? (signal === 'SIGTERM' ? 143 : undefined),
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      // Handle errors
      childProcess.on('error', (error) => {
        if (hasEnded) return;
        hasEnded = true;

        this.logger.error('Agent process error', error, { executionId });
        reject(error);
      });

      // Send prompt to stdin for agents that expect it (like Claude Code)
      if (config.profile.type === 'claude' || config.profile.type === 'local') {
        if (childProcess.stdin) {
          childProcess.stdin.write(config.prompt);
          childProcess.stdin.end();
        }
      }

      // Set timeout
      const timeout = config.timeout || config.profile.timeout || 30 * 60 * 1000;
      setTimeout(() => {
        if (!hasEnded && this.activeExecutions.has(executionId)) {
          this.logger.warn?.('Agent execution timeout', { executionId, timeout });
          childProcess.kill('SIGTERM');
          setTimeout(() => {
            if (this.activeExecutions.has(executionId)) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
        }
      }, timeout);
    });
  }

  /**
   * Kill a running execution
   */
  killExecution(executionId: string): boolean {
    const process = this.activeExecutions.get(executionId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      setTimeout(() => {
        if (this.activeExecutions.has(executionId)) {
          process.kill('SIGKILL');
        }
      }, 5000);
      return true;
    }
    return false;
  }

  /**
   * Get information about active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Shutdown the service and clean up active executions
   */
  shutdown(): void {
    this.logger.info('Shutting down AgentExecutorService', {
      activeExecutions: this.activeExecutions.size
    });

    for (const [executionId, process] of this.activeExecutions.entries()) {
      if (!process.killed) {
        this.logger.info('Terminating active execution', { executionId });
        process.kill('SIGTERM');
      }
    }

    this.activeExecutions.clear();
  }
}