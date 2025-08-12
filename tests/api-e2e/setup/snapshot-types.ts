import { Project, Task, TaskAttempt, ExecutionProcess, TaskTemplate } from 'shared/types';

/**
 * Complete database state snapshot for comparison
 */
export interface DatabaseSnapshot {
  projects: Project[];
  tasks: Task[];
  taskAttempts: TaskAttempt[];
  executionProcesses: ExecutionProcess[];
  taskTemplates: TaskTemplate[];
  metadata: {
    timestamp: Date;
    testName?: string;
    recordCount: number;
  };
}

/**
 * Differences found between two database snapshots
 */
export interface SnapshotDiff {
  identical: boolean;
  differences: {
    projects: EntityDiff<Project>;
    tasks: EntityDiff<Task>;
    taskAttempts: EntityDiff<TaskAttempt>;
    executionProcesses: EntityDiff<ExecutionProcess>;
    taskTemplates: EntityDiff<TaskTemplate>;
  };
  summary: {
    totalChanges: number;
    tablesChanged: string[];
  };
}

export interface EntityDiff<T> {
  added: T[];
  removed: T[];
  modified: Array<{
    before: T;
    after: T;
    changes: string[];
  }>;
}