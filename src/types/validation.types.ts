export interface ValidationStageConfig {
  stageId: string;
  name: string;
  enabled: boolean;
  priority?: number;
  command?: string;
  timeout?: number;
  continueOnFailure?: boolean;
  description?: string;
  environment?: string | null;
  category?: string | null;
  consolidatedFrom?: string[]; // Added for tracking consolidated stages
}

export interface ConsolidatedStageConfig extends ValidationStageConfig {
  consolidatedFrom?: string[];
}

export interface StageStatistics {
  stageName: string;
  stageId: string;
  totalRuns: number;
  successCount: number;
  totalDuration: number;
  successRate?: number;
  averageDuration?: number;
}

export interface ConsolidationMapping {
  [oldStageId: string]: string; // Maps old stage ID to consolidated stage ID
}
