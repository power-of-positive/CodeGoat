/**
 * Database utilities for migration testing
 */
import Database from 'better-sqlite3';

export interface Project {
  id: string;
  name: string;
  git_repo_path: string;
  use_existing_repo: boolean;
  setup_script?: string;
  dev_script?: string;
  cleanup_script?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  parent_task_attempt?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAttempt {
  id: string;
  task_id: string;
  executor?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  worktree_path?: string;
  branch?: string;
  created_at: string;
  updated_at: string;
}

export class DatabaseValidator {
  private db: Database.Database;

  constructor(dbPath: string = '../../prisma/kanban.db') {
    this.db = new Database(dbPath);
  }

  getDbProject(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const result = stmt.get(id) as Record<string, unknown>;
    if (!result) return null;

    return {
      ...result,
      id: result.id as string,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    } as Project;
  }

  getDbTask(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const result = stmt.get(id) as Record<string, unknown>;
    if (!result) return null;

    return {
      ...result,
      id: result.id as string,
      project_id: result.project_id as string,
      parent_task_attempt: result.parent_task_attempt as string | undefined,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    } as Task;
  }

  getDbTaskAttempt(id: string): TaskAttempt | null {
    const stmt = this.db.prepare('SELECT * FROM task_attempts WHERE id = ?');
    const result = stmt.get(id) as Record<string, unknown>;
    if (!result) return null;

    return {
      ...result,
      id: result.id as string,
      task_id: result.task_id as string,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    } as TaskAttempt;
  }

  validateForeignKeys(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const orphanTasks = this.db
      .prepare(
        `SELECT t.id, t.project_id FROM tasks t 
         LEFT JOIN projects p ON t.project_id = p.id WHERE p.id IS NULL`
      )
      .all();

    if (orphanTasks.length > 0) {
      errors.push(`Found ${orphanTasks.length} orphan tasks without valid project`);
    }

    const orphanAttempts = this.db
      .prepare(
        `SELECT ta.id, ta.task_id FROM task_attempts ta 
         LEFT JOIN tasks t ON ta.task_id = t.id WHERE t.id IS NULL`
      )
      .all();

    if (orphanAttempts.length > 0) {
      errors.push(`Found ${orphanAttempts.length} orphan task attempts without valid task`);
    }

    return { valid: errors.length === 0, errors };
  }

  getCounts(): { projects: number; tasks: number; attempts: number } {
    const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as {
      count: number;
    };
    const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as {
      count: number;
    };
    const attemptCount = this.db.prepare('SELECT COUNT(*) as count FROM task_attempts').get() as {
      count: number;
    };

    return {
      projects: projectCount.count,
      tasks: taskCount.count,
      attempts: attemptCount.count,
    };
  }

  validateCascadeDelete(projectId: string): {
    valid: boolean;
    remainingTasks: number;
    remainingAttempts: number;
  } {
    const remainingTasks = this.db
      .prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?')
      .get(projectId) as { count: number };
    const remainingAttempts = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM task_attempts ta 
         JOIN tasks t ON ta.task_id = t.id WHERE t.project_id = ?`
      )
      .get(projectId) as { count: number };

    return {
      valid: remainingTasks.count === 0 && remainingAttempts.count === 0,
      remainingTasks: remainingTasks.count,
      remainingAttempts: remainingAttempts.count,
    };
  }

  close(): void {
    this.db.close();
  }
}
