import { DatabaseSnapshot, SnapshotDiff, EntityDiff } from './snapshot-types';

/**
 * Database snapshot comparison utilities
 */
export class SnapshotCompare {
  /**
   * Compare two database snapshots and return differences
   */
  compareSnapshots(before: DatabaseSnapshot, after: DatabaseSnapshot): SnapshotDiff {
    const projectsDiff = this.compareEntityArrays(before.projects, after.projects, 'id');
    const tasksDiff = this.compareEntityArrays(before.tasks, after.tasks, 'id');
    const attemptsDiff = this.compareEntityArrays(before.taskAttempts, after.taskAttempts, 'id');
    const processesDiff = this.compareEntityArrays(before.executionProcesses, after.executionProcesses, 'id');
    const templatesDiff = this.compareEntityArrays(before.taskTemplates, after.taskTemplates, 'id');

    const totalChanges = [projectsDiff, tasksDiff, attemptsDiff, processesDiff, templatesDiff]
      .reduce((sum, diff) => sum + diff.added.length + diff.removed.length + diff.modified.length, 0);

    const tablesChanged = this.getTablesChanged([
      { name: 'projects', diff: projectsDiff },
      { name: 'tasks', diff: tasksDiff },
      { name: 'task_attempts', diff: attemptsDiff },
      { name: 'execution_processes', diff: processesDiff },
      { name: 'task_templates', diff: templatesDiff }
    ]);

    return {
      identical: totalChanges === 0,
      differences: {
        projects: projectsDiff,
        tasks: tasksDiff,
        taskAttempts: attemptsDiff,
        executionProcesses: processesDiff,
        taskTemplates: templatesDiff
      },
      summary: {
        totalChanges,
        tablesChanged
      }
    };
  }

  private getTablesChanged(diffs: Array<{ name: string; diff: EntityDiff<any> }>): string[] {
    return diffs
      .filter(({ diff }) => 
        diff.added.length || diff.removed.length || diff.modified.length
      )
      .map(({ name }) => name);
  }

  private compareEntityArrays<T extends { id: string }>(
    before: T[], 
    after: T[], 
    idField: keyof T
  ): EntityDiff<T> {
    const beforeMap = new Map(before.map(item => [item[idField], item]));
    const afterMap = new Map(after.map(item => [item[idField], item]));

    const added: T[] = [];
    const removed: T[] = [];
    const modified: Array<{ before: T; after: T; changes: string[] }> = [];

    // Find added items
    for (const [id, item] of afterMap) {
      if (!beforeMap.has(id)) {
        added.push(item);
      }
    }

    // Find removed items
    for (const [id, item] of beforeMap) {
      if (!afterMap.has(id)) {
        removed.push(item);
      }
    }

    // Find modified items
    for (const [id, beforeItem] of beforeMap) {
      const afterItem = afterMap.get(id);
      if (afterItem) {
        const changes = this.findObjectChanges(beforeItem, afterItem);
        if (changes.length > 0) {
          modified.push({ before: beforeItem, after: afterItem, changes });
        }
      }
    }

    return { added, removed, modified };
  }

  private findObjectChanges(before: any, after: any): string[] {
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const beforeVal = before[key];
      const afterVal = after[key];

      if (beforeVal !== afterVal) {
        if ((beforeVal == null) !== (afterVal == null)) {
          changes.push(`${key}: ${beforeVal} → ${afterVal}`);
        } else if (beforeVal != null && afterVal != null) {
          if (typeof beforeVal === 'object' || typeof afterVal === 'object') {
            if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
              changes.push(`${key}: [object changed]`);
            }
          } else {
            changes.push(`${key}: ${beforeVal} → ${afterVal}`);
          }
        }
      }
    }

    return changes;
  }
}