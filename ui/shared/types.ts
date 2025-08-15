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

