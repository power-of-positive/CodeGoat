// Shared types for the application

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
  profiles: Array<{ name: string; path: string; }> | null;
}

export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  taskType: 'story' | 'task';
  startTime?: string;
  endTime?: string;
  duration?: string;
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

// Import and re-export log types
export { 
  UnifiedLogEntry,
  ProcessStartPayload,
  WorkerLogEntry,
  LogParseResult 
} from './logs';

// Import and re-export permission types from the enum-based definitions
export { 
  ActionType as PermissionActionType, 
  PermissionScope,
  PermissionRule,
  PermissionConfig 
} from '../../../shared/types';

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
