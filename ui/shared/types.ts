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
  output?: string;
  error?: string;
}

export interface ValidationMetrics {
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  stageMetrics: Record<string, {
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

export type ApiResponse<T = any> = {
  data: T;
  success: boolean;
  message?: string;
};

export interface APIError {
  message: string;
  code: string;
  details?: JSONValue;
}

