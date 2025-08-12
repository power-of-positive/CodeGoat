import { faker } from '@faker-js/faker';
import { Project, Task, TaskAttempt, TaskTemplate, ExecutionProcess } from 'shared/types';
import { TestDatabase } from './test-database';
import { DataFactory } from './fixture-data';

// Insert project into database
export async function insertProject(
  db: TestDatabase,
  data: Partial<Parameters<typeof DataFactory.createProjectData>[0]> = {}
): Promise<Project> {
  const projectData = DataFactory.createProjectData(data);
  const id = faker.string.uuid();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO projects (
      id, name, git_repo_path, setup_script, dev_script, cleanup_script,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, projectData.name, projectData.git_repo_path, projectData.setup_script, projectData.dev_script, projectData.cleanup_script, now, now]);

  return createProjectResult(id, projectData, now);
}

function createProjectResult(id: string, projectData: any, now: string): Project {
  return { id, ...projectData, created_at: now, updated_at: now };
}

// Insert task into database
export async function insertTask(
  db: TestDatabase,
  projectId: string,
  data: Partial<Parameters<typeof DataFactory.createTaskData>[0]> = {}
): Promise<Task> {
  const taskData = DataFactory.createTaskData(data);
  const id = faker.string.uuid();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO tasks (
      id, project_id, title, description, status, parent_task_attempt,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, projectId, taskData.title, taskData.description, 'todo', taskData.parent_task_attempt, now, now]);

  return createTaskResult(id, projectId, taskData, now);
}

function createTaskResult(id: string, projectId: string, taskData: any, now: string): Task {
  return { id, status: 'todo', ...taskData, project_id: projectId, created_at: now, updated_at: now };
}

// Insert task attempt into database
export async function insertTaskAttempt(
  db: TestDatabase,
  taskId: string,
  data: Partial<Parameters<typeof DataFactory.createTaskAttemptData>[0]> = {}
): Promise<TaskAttempt> {
  const attemptData = DataFactory.createTaskAttemptData(data);
  const id = faker.string.uuid();
  const now = new Date().toISOString();
  const branchName = `task-${taskId.slice(0, 8)}-${Date.now()}`;

  await db.run(`
    INSERT INTO task_attempts (
      id, task_id, worktree_path, branch, base_branch, pr_url, pr_merged_at,
      executor, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, taskId, `/tmp/worktrees/${branchName}`, branchName, attemptData.base_branch, null, null, attemptData.executor, now, now]);

  return createTaskAttemptResult(id, taskId, branchName, attemptData, now);
}

function createTaskAttemptResult(id: string, taskId: string, branchName: string, attemptData: any, now: string): TaskAttempt {
  return { id, task_id: taskId, worktree_path: `/tmp/worktrees/${branchName}`, branch: branchName, 
    base_branch: attemptData.base_branch || 'main', pr_url: null, pr_merged_at: null, 
    executor: attemptData.executor || 'claude', created_at: now, updated_at: now };
}

// Insert task template into database
export async function insertTaskTemplate(
  db: TestDatabase,
  data: Partial<Parameters<typeof DataFactory.createTaskTemplateData>[0]> = {}
): Promise<TaskTemplate> {
  const templateData = DataFactory.createTaskTemplateData(data);
  const id = faker.string.uuid();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO task_templates (
      id, template_name, title, description, project_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, templateData.template_name, templateData.title, templateData.description, templateData.project_id, now, now]);

  return createTaskTemplateResult(id, templateData, now);
}

function createTaskTemplateResult(id: string, templateData: any, now: string): TaskTemplate {
  return { id, ...templateData, created_at: now, updated_at: now };
}

// Insert execution process into database
export async function insertExecutionProcess(
  db: TestDatabase,
  attemptId: string,
  data: Partial<ExecutionProcess> = {}
): Promise<ExecutionProcess> {
  const id = faker.string.uuid();
  const now = new Date().toISOString();
  const startedAt = data.started_at || now;
  const processData = createProcessData(data);

  await db.run(`
    INSERT INTO execution_processes (
      id, task_attempt_id, process_type, executor_type, status, command,
      args, working_directory, stdout, stderr, exit_code,
      started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, attemptId, processData.process_type, processData.executor_type, processData.status, processData.command, JSON.stringify(processData.args), processData.working_directory, processData.stdout, processData.stderr, processData.exit_code, startedAt, processData.completed_at, now, now]);

  return { id, task_attempt_id: attemptId, ...processData, started_at: startedAt, created_at: now, updated_at: now };
}

function createProcessData(data: Partial<ExecutionProcess> = {}) {
  return { process_type: 'codingagent', executor_type: 'claude', status: 'running', command: 'claude-code', 
    args: ['--task', 'implement feature'], working_directory: '/tmp/worktree', stdout: null, stderr: null,
    exit_code: null, completed_at: null, ...data };
}
