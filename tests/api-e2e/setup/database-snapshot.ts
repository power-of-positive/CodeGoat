import { TestDatabase } from './test-database';
import { SnapshotCapture } from './snapshot-capture';
import { SnapshotCompare } from './snapshot-compare';
import { DatabaseSnapshot, SnapshotDiff } from './snapshot-types';

export * from './snapshot-types';

/**
 * Database snapshot utilities for state validation testing
 */
export class DatabaseSnapshotManager {
  private capture: SnapshotCapture;
  private compare: SnapshotCompare;

  constructor(private db: TestDatabase) {
    this.capture = new SnapshotCapture(db);
    this.compare = new SnapshotCompare();
  }

  async captureSnapshot(testName?: string): Promise<DatabaseSnapshot> {
    return this.capture.captureSnapshot(testName);
  }

  compareSnapshots(before: DatabaseSnapshot, after: DatabaseSnapshot): SnapshotDiff {
    return this.compare.compareSnapshots(before, after);
  }

  /**
   * Generate human-readable diff report
   */
  generateDiffReport(diff: SnapshotDiff): string {
    if (diff.identical) {
      return 'Database snapshots are identical - no changes detected.';
    }

    const lines: string[] = [];
    lines.push(`Database State Changes Summary:`);
    lines.push(`- Total changes: ${diff.summary.totalChanges}`);
    lines.push(`- Tables affected: ${diff.summary.tablesChanged.join(', ')}`);
    lines.push('');

    this.addProjectChanges(lines, diff);
    this.addTaskChanges(lines, diff);
    this.addAttemptChanges(lines, diff);
    this.addProcessChanges(lines, diff);

    return lines.join('\n');
  }

  private addProjectChanges(lines: string[], diff: SnapshotDiff): void {
    if (diff.differences.projects.added.length > 0) {
      lines.push(`Projects Added (${diff.differences.projects.added.length}):`);
      diff.differences.projects.added.forEach(p => 
        lines.push(`  + ${p.name} (${p.id}) at ${p.git_repo_path}`)
      );
    }

    if (diff.differences.projects.removed.length > 0) {
      lines.push(`Projects Removed (${diff.differences.projects.removed.length}):`);
      diff.differences.projects.removed.forEach(p => 
        lines.push(`  - ${p.name} (${p.id}) at ${p.git_repo_path}`)
      );
    }

    if (diff.differences.projects.modified.length > 0) {
      lines.push(`Projects Modified (${diff.differences.projects.modified.length}):`);
      diff.differences.projects.modified.forEach(mod => 
        lines.push(`  ~ ${mod.before.name} (${mod.before.id}): ${mod.changes.join(', ')}`)
      );
    }
  }

  private addTaskChanges(lines: string[], diff: SnapshotDiff): void {
    if (diff.differences.tasks.added.length > 0) {
      lines.push(`Tasks Added (${diff.differences.tasks.added.length}):`);
      diff.differences.tasks.added.forEach(t => 
        lines.push(`  + ${t.title} (${t.id})`)
      );
    }

    if (diff.differences.tasks.removed.length > 0) {
      lines.push(`Tasks Removed (${diff.differences.tasks.removed.length}):`);
      diff.differences.tasks.removed.forEach(t => 
        lines.push(`  - ${t.title} (${t.id})`)
      );
    }
  }

  private addAttemptChanges(lines: string[], diff: SnapshotDiff): void {
    if (diff.differences.taskAttempts.added.length > 0) {
      lines.push(`Task Attempts Added (${diff.differences.taskAttempts.added.length}):`);
      diff.differences.taskAttempts.added.forEach(a => 
        lines.push(`  + Attempt ${a.id} for task ${a.task_id}`)
      );
    }

    if (diff.differences.taskAttempts.removed.length > 0) {
      lines.push(`Task Attempts Removed (${diff.differences.taskAttempts.removed.length}):`);
      diff.differences.taskAttempts.removed.forEach(a => 
        lines.push(`  - Attempt ${a.id} for task ${a.task_id}`)
      );
    }
  }

  private addProcessChanges(lines: string[], diff: SnapshotDiff): void {
    if (diff.differences.executionProcesses.added.length > 0) {
      lines.push(`Execution Processes Added (${diff.differences.executionProcesses.added.length}):`);
      diff.differences.executionProcesses.added.forEach(p => 
        lines.push(`  + ${p.process_type} process ${p.id} (${p.status})`)
      );
    }

    if (diff.differences.executionProcesses.removed.length > 0) {
      lines.push(`Execution Processes Removed (${diff.differences.executionProcesses.removed.length}):`);
      diff.differences.executionProcesses.removed.forEach(p => 
        lines.push(`  - ${p.process_type} process ${p.id} (${p.status})`)
      );
    }
  }
}

/**
 * Helper functions for easy snapshot operations
 */
export async function captureDbSnapshot(db: TestDatabase, testName?: string): Promise<DatabaseSnapshot> {
  const manager = new DatabaseSnapshotManager(db);
  return manager.captureSnapshot(testName);
}

export function compareDbSnapshots(before: DatabaseSnapshot, after: DatabaseSnapshot): SnapshotDiff {
  const manager = new DatabaseSnapshotManager(null as any);
  return manager.compareSnapshots(before, after);
}

export function generateDbDiffReport(diff: SnapshotDiff): string {
  const manager = new DatabaseSnapshotManager(null as any);
  return manager.generateDiffReport(diff);
}