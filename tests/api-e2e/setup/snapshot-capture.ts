import { TestDatabase } from './test-database';
import { DatabaseSnapshot } from './snapshot-types';
import { Project, Task, TaskAttempt, ExecutionProcess, TaskTemplate } from 'shared/types';

/**
 * Database snapshot capture utilities
 */
export class SnapshotCapture {
  constructor(private db: TestDatabase) {}

  /**
   * Capture complete current database state
   */
  async captureSnapshot(testName?: string): Promise<DatabaseSnapshot> {
    const [projects, tasks, taskAttempts, executionProcesses, taskTemplates] = await Promise.all([
      this.captureProjects(),
      this.captureTasks(),
      this.captureTaskAttempts(),
      this.captureExecutionProcesses(),
      this.captureTaskTemplates()
    ]);

    const recordCount = projects.length + tasks.length + taskAttempts.length + 
                       executionProcesses.length + taskTemplates.length;

    return {
      projects,
      tasks,
      taskAttempts,
      executionProcesses,
      taskTemplates,
      metadata: {
        timestamp: new Date(),
        testName,
        recordCount
      }
    };
  }

  private async captureProjects(): Promise<Project[]> {
    return this.db.query<Project>(`
      SELECT 
        id, name, git_repo_path, setup_script, dev_script, cleanup_script,
        created_at, updated_at
      FROM projects 
      ORDER BY created_at
    `);
  }

  private async captureTasks(): Promise<Task[]> {
    return this.db.query<Task>(`
      SELECT 
        id, project_id, title, description, status, parent_task_attempt,
        created_at, updated_at
      FROM tasks 
      ORDER BY created_at
    `);
  }

  private async captureTaskAttempts(): Promise<TaskAttempt[]> {
    return this.db.query<TaskAttempt>(`
      SELECT 
        id, task_id, worktree_path, branch, base_branch, pr_url, pr_merged_at,
        executor, created_at, updated_at
      FROM task_attempts 
      ORDER BY created_at
    `);
  }

  private async captureExecutionProcesses(): Promise<ExecutionProcess[]> {
    return this.db.query<ExecutionProcess>(`
      SELECT 
        id, task_attempt_id, process_type, executor_type, status, command,
        args, working_directory, stdout, stderr, exit_code,
        started_at, completed_at, created_at, updated_at
      FROM execution_processes 
      ORDER BY started_at
    `);
  }

  private async captureTaskTemplates(): Promise<TaskTemplate[]> {
    return this.db.query<TaskTemplate>(`
      SELECT 
        id, template_name, title, description, project_id,
        created_at, updated_at
      FROM task_templates 
      ORDER BY created_at
    `);
  }
}