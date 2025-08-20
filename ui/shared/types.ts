/**
 * Shared types for Validation Analytics application
 */

// Additional types needed by frontend

// Theme and UI types
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
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
  stageMetrics: Record<
    string,
    {
      id: string;
      name: string;
      enabled: boolean;
      attempts: number;
      successes: number;
      successRate: number;
      averageDuration: number;
      totalRuns: number;
    }
  >;
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
  executionHistory?: BDDScenarioExecution[];
  playwrightTestFile?: string; // Link to the associated E2E test file
  playwrightTestName?: string; // Specific test name within the file
  cucumberSteps?: string[]; // Associated cucumber step definitions
}

// E2E Test Result types
export interface E2ETestResult {
  id: string;
  testFile: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedout';
  executedAt: string;
  duration?: number;
  error?: string;
  screenshot?: string; // Path to failure screenshot
  video?: string; // Path to test video recording
  trace?: string; // Playwright trace file
  retries?: number;
  workerIndex?: number;
  project?: string; // Browser/config name
}

export interface E2ETestSuite {
  id: string;
  suiteName: string;
  file: string;
  executedAt: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration?: number;
  tests: E2ETestResult[];
}

export interface E2ETestHistory {
  testFile: string;
  testName: string;
  history: Array<{
    date: string;
    runs: number;
    passed: number;
    failed: number;
    skipped: number;
    averageDuration: number;
    successRate: number;
  }>;
  trends: {
    successRateTrend: number;
    durationTrend: number;
    totalRuns: number;
    recentFailures: E2ETestResult[];
  };
}

export interface BDDScenarioExecution {
  id: string;
  scenarioId: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  executedAt: string;
  executionDuration?: number;
  errorMessage?: string;
  stepResults?: BDDStepResult[];
  environment?: string;
  executedBy?: string;
  gherkinSnapshot?: string;
}

export interface BDDStepResult {
  step: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

// Task management types
export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  taskType: 'story' | 'task'; // story = user story requiring BDD tests, task = technical improvement
  startTime?: string;
  endTime?: string;
  duration?: string;
  bddScenarios?: BDDScenario[];
  executorId?: string; // ID of the agent/executor that worked on this task
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

// Claude Code interaction types
export interface NormalizedEntry {
  timestamp: string | null;
  entry_type: NormalizedEntryType;
  content: string;
}

export type NormalizedEntryType =
  | { type: 'user_message' }
  | { type: 'assistant_message' }
  | { type: 'tool_use'; tool_name: string; action_type: ClaudeActionType }
  | { type: 'system_message' }
  | { type: 'error_message' }
  | { type: 'thinking' };

export type ClaudeActionType =
  | { action: 'file_read'; path: string }
  | { action: 'file_write'; path: string }
  | { action: 'command_run'; command: string }
  | { action: 'search'; query: string }
  | { action: 'web_fetch'; url: string }
  | { action: 'task_create'; description: string }
  | { action: 'plan_presentation'; plan: string }
  | { action: 'other'; description: string };
