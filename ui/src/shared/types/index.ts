// Shared types for the application

export interface BDDScenario {
  id: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  given: string;
  when: string;
  then: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  executedAt?: string;
  executionDuration?: number;
  errorMessage?: string;
  executionHistory?: BDDScenarioExecution[];
  playwrightTestFile?: string;
  playwrightTestName?: string;
  cucumberSteps?: string[];
}

// Additional types - need to be defined here or imported from proper location
export interface Config {
  theme: ThemeMode;
  enableMetrics: boolean;
  validationStages: ValidationStage[];
}

export interface ValidationStage {
  id: string;
  stageId: string;
  name: string;
  command: string;
  timeout: number;
  enabled: boolean;
  continueOnFailure: boolean;
  priority: number;
  description?: string;
  environment?: string | null;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationRun {
  id: string;
  timestamp: string;
  stages: ValidationStageResult[];
  success: boolean;
  duration: number;
  overallStatus: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  metricsFile?: string;
}

export interface ValidationStageResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  attempt: number;
  output?: string;
  error?: string;
  command?: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
}

export interface StageMetrics {
  id: string;
  name: string;
  enabled: boolean;
  attempts: number;
  successes: number;
  successRate: number;
  averageDuration: number;
  totalRuns: number;
}

export interface ValidationMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageDuration: number;
  stageMetrics: Record<string, StageMetrics>;
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export interface UserSystemInfo {
  os_type: string;
  architecture: string;
  shell: string;
  home_directory: string;
  current_directory: string;
  config: Config;
  environment: Record<string, string> | null;
  profiles: Array<{ name: string; path: string }> | null;
}

export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'todo';
  priority: 'low' | 'medium' | 'high';
  taskType: 'story' | 'task';
  startTime?: string;
  endTime?: string;
  duration?: number; // Duration in milliseconds
  createdAt?: string;
  bddScenarios?: BDDScenario[];
  executorId?: string;
  validationRuns?: ValidationRun[];
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

// Import and re-export log types (including moved types)
// Temporarily commented out to fix circular dependency issue
// export {
//   UnifiedLogEntry,
//   ProcessStartPayload,
//   WorkerLogEntry,
//   LogParseResult,
//   NormalizedEntry,
//   NormalizedEntryType,
//   ClaudeActionType
// } from './logs';

// Permission types - define them here since the old location is removed
export enum PermissionActionType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  ALL = 'all',
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  NETWORK_REQUEST = 'network_request',
  CLAUDE_EXECUTE = 'claude_execute',
}

// Backend ActionType (different from PermissionActionType)
export enum ActionType {
  // File system operations
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  FILE_DELETE = 'file_delete',
  DIRECTORY_CREATE = 'directory_create',
  DIRECTORY_DELETE = 'directory_delete',

  // Network operations
  NETWORK_REQUEST = 'network_request',
  NETWORK_LISTEN = 'network_listen',

  // Process operations
  PROCESS_SPAWN = 'process_spawn',
  PROCESS_KILL = 'process_kill',

  // System operations
  SYSTEM_COMMAND = 'system_command',
  ENVIRONMENT_READ = 'environment_read',
  ENVIRONMENT_WRITE = 'environment_write',

  // Claude-specific operations
  CLAUDE_EXECUTE = 'claude_execute',
  CLAUDE_PROMPT = 'claude_prompt',
}

export enum PermissionScope {
  FILE = 'file',
  DIRECTORY = 'directory',
  COMMAND = 'command',
  API = 'api',
  GLOBAL = 'global',
  WORKTREE = 'worktree',
  ALL = 'all',
  SPECIFIC_PATH = 'specific_path',
  PATTERN = 'pattern',
}

export interface PermissionRule {
  id: string;
  action: PermissionActionType;
  scope: PermissionScope;
  resource: string;
  allowed: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  target?: string;
  reason?: string;
  priority?: number;
}

export interface PermissionConfig {
  rules: PermissionRule[];
  defaultAllow: boolean;
  enableStrictMode: boolean;
  enableLogging?: boolean;
  strictMode?: boolean;
}

export interface E2ETestResult {
  id: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: string;
}

export interface E2ETestSuite {
  id: string;
  name: string;
  tests: E2ETestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  timestamp: string;
}

export interface E2ETestHistory {
  id: string;
  suiteRuns: E2ETestSuite[];
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  lastRunTimestamp: string;
}

// Worker types for Claude workers API
export interface Worker {
  id: string;
  taskId: string;
  taskContent: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'validating';
  startTime: string;
  endTime?: string;
  pid?: number;
  logFile: string;
  blockedCommands: number;
  hasPermissionSystem: boolean;
  validationPassed?: boolean;
  validationRuns?: number;
}

// Blocked command tracking
export interface BlockedCommand {
  id: string;
  workerId: string;
  command: string;
  reason: string;
  timestamp: string;
  context?: string;
}

// Historical timeline data structure
export interface HistoricalTimelineData {
  timeline: TimelineEntry[];
  summary: {
    totalRuns: number;
    successRate: number;
    averageDuration: number;
    totalPeriods: number;
  };
}

export interface TimelineEntry {
  timestamp: string;
  stages: Record<string, StagePerformance>;
  totalRuns: number;
  successRate: number;
  averageDuration: number;
}

export interface StagePerformance {
  successRate: number;
  avgDuration: number;
  total: number;
}

// Task Analytics data structure
export interface TaskAnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    completionRate: number;
    averageCompletionTimeMinutes: number;
  };
  priorityBreakdown: {
    high: PriorityBreakdown;
    medium: PriorityBreakdown;
    low: PriorityBreakdown;
  };
  dailyCompletions: DailyCompletion[];
  recentCompletions: RecentCompletion[];
}

export interface PriorityBreakdown {
  total: number;
  completed: number;
  completionRate: string;
}

export interface DailyCompletion {
  date: string;
  completed: number;
  total: number;
}

export interface RecentCompletion {
  id: string;
  title: string;
  completedAt: string;
  priority: 'high' | 'medium' | 'low';
  duration: number;
}
