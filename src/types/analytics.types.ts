export interface ValidationStageMetrics {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  attempt: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  userPrompt?: string;
  taskDescription?: string;
  attempts: ValidationAttemptMetrics[];
  finalSuccess: boolean;
  totalValidationTime: number;
  averageStageTime: number;
}

export interface ValidationAttemptMetrics {
  attempt: number;
  timestamp: string;
  startTime: number;
  totalTime: number;
  totalStages: number;
  passed: number;
  failed: number;
  success: boolean;
  stages: ValidationStageMetrics[];
  failureReason?: string;
}

export interface DevelopmentAnalytics {
  totalSessions: number;
  successRate: number; // Percentage of sessions that eventually succeeded
  averageTimeToSuccess: number; // Average time from prompt to success (ms)
  averageAttemptsToSuccess: number;
  mostFailedStage: string;
  stageSuccessRates: Record<string, { attempts: number; successes: number; rate: number }>;
  dailyStats: Record<string, { sessions: number; successes: number; totalTime: number }>;
}
