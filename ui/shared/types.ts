/**
 * Shared types for Validation Analytics application
 */

// Additional types needed by frontend

// Theme and UI types
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark', 
  SYSTEM = 'system'
}




// Config and settings types
export interface Config {
  theme: ThemeMode;
  enableMetrics: boolean;
  validationStages: ValidationStage[];
}

export interface Environment {
  name: string;
  description?: string;
  variables: Record<string, string>;
}

export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface UserSystemInfo {
  os_type: string;
  architecture: string;
  shell: string;
  home_directory: string;
  current_directory: string;
  config: Config;
  environment: Environment | null;
  profiles: AgentProfile[] | null;
}

// Validation pipeline types
export interface ValidationStage {
  id: string;
  name: string;
  command: string;
  enabled: boolean;
  timeout: number;
  continueOnFailure: boolean;
  priority: number;
}

export interface ValidationRun {
  id: string;
  timestamp: string;
  stages: ValidationStageResult[];
  success: boolean;
  duration: number;
}

export interface ValidationStageResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  attempt: number;
  output?: string;
  error?: string;
}

export interface ValidationMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageDuration: number;
  stageMetrics: Record<string, {
    id: string;
    name: string;
    enabled: boolean;
    attempts: number;
    successes: number;
    successRate: number;
    averageDuration: number;
    totalRuns: number;
  }>;
}

// Additional utility types
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONValue[] 
  | { [key: string]: JSONValue };

export type ApiResponse<T = unknown> = {
  data: T;
  success: boolean;
  message?: string;
};

export interface APIError {
  message: string;
  code: string;
  details?: JSONValue;
}

// BDD Scenario types
export interface BDDScenario {
  id: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  executedAt?: string;
  executionDuration?: number;
  errorMessage?: string;
}

// Task management types
export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime?: string;
  endTime?: string;
  duration?: string;
  bddScenarios?: BDDScenario[];
}

// Permission system types
export enum ActionType {
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  FILE_DELETE = 'file_delete',
  DIRECTORY_CREATE = 'directory_create',
  DIRECTORY_DELETE = 'directory_delete',
  NETWORK_REQUEST = 'network_request',
  NETWORK_LISTEN = 'network_listen',
  PROCESS_SPAWN = 'process_spawn',
  PROCESS_KILL = 'process_kill',
  SYSTEM_COMMAND = 'system_command',
  ENVIRONMENT_READ = 'environment_read',
  ENVIRONMENT_WRITE = 'environment_write',
  CLAUDE_EXECUTE = 'claude_execute',
  CLAUDE_PROMPT = 'claude_prompt',
}

export enum PermissionScope {
  GLOBAL = 'global',
  WORKTREE = 'worktree',
  SPECIFIC_PATH = 'specific_path',
  PATTERN = 'pattern',
}

export interface PermissionRule {
  id: string;
  action: ActionType;
  scope: PermissionScope;
  target?: string;
  allowed: boolean;
  reason?: string;
  priority: number;
}

export interface PermissionConfig {
  rules: PermissionRule[];
  defaultAllow: boolean;
  enableLogging: boolean;
  strictMode: boolean;
}

export interface PermissionContext {
  action: ActionType;
  target?: string;
  worktreeDir?: string;
  additionalData?: Record<string, unknown>;
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
  matchingRule?: PermissionRule;
  appliedDefault?: boolean;
}

