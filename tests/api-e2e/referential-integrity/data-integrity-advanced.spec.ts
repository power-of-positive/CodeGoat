import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Advanced Data Integrity Validation', () => {
  let apiClient: TestApiClient;
  let createdProjectIds: string[] = [];

  beforeEach(async () => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    apiClient = new TestApiClient(baseUrl);
    await apiClient.waitForServer();
    createdProjectIds = [];
  });

  afterEach(async () => {
    await cleanupProjects(apiClient, createdProjectIds);
  });

  test('should validate data integrity across all tables', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Data Integrity Test Project ${timestamp}`,
      git_repo_path: `/tmp/data-integrity-test-${timestamp}`,
      use_existing_repo: false,
    });

    createdProjectIds.push(project.id);

    const task1 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Integrity Task 1',
      description: 'First integrity task',
      parent_task_attempt: null,
    });

    const task2 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Integrity Task 2',
      description: 'Second integrity task',
      parent_task: task1.id,
      parent_task_attempt: null,
    });

    const template = await apiClient.templates.create({
      template_name: `Integrity Template ${timestamp}`,
      title: 'Template for integrity test',
      description: 'Template description',
      is_global: false,
      project_id: project.id,
    });

    const allProjects = await apiClient.projects.getAll();
    const myProject = allProjects.find(p => p.id === project.id);
    expect(myProject).toBeDefined();

    const allTasks = await apiClient.tasks.getAll(project.id);
    expect(allTasks).toHaveLength(2);
    allTasks.forEach(task => expect(task.project_id).toBe(project.id));

    const allTemplates = await apiClient.templates.getAll();
    const myTemplate = allTemplates.find(
      t => t.template_name === `Integrity Template ${timestamp}`
    );
    expect(myTemplate).toBeDefined();
    expect(myTemplate!.project_id).toBe(project.id);
  });

  test('should handle concurrent operations without data corruption', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Concurrent Operations Test Project ${timestamp}`,
      git_repo_path: `/tmp/concurrent-operations-test-${timestamp}`,
      use_existing_repo: false,
    });

    createdProjectIds.push(project.id);

    const initialTasks = await apiClient.tasks.getAll(project.id);
    const initialTaskCount = initialTasks.length;

    const concurrentTasks = await Promise.all([
      apiClient.tasks.create(project.id, {
        project_id: project.id,
        title: 'Concurrent Task 1',
        description: 'Task 1',
        parent_task_attempt: null,
      }),
      apiClient.tasks.create(project.id, {
        project_id: project.id,
        title: 'Concurrent Task 2',
        description: 'Task 2',
        parent_task_attempt: null,
      }),
      apiClient.tasks.create(project.id, {
        project_id: project.id,
        title: 'Concurrent Task 3',
        description: 'Task 3',
        parent_task_attempt: null,
      }),
    ]);

    const afterTasks = await apiClient.tasks.getAll(project.id);
    expect(afterTasks).toHaveLength(initialTaskCount + 3);

    concurrentTasks.forEach((task: any) => {
      expect(task.project_id).toBe(project.id);
    });

    const taskIds = concurrentTasks.map((t: any) => t.id);
    expect(new Set(taskIds).size).toBe(taskIds.length);

    concurrentTasks.forEach((createdTask: any) => {
      const foundTask = afterTasks.find(t => t.id === createdTask.id);
      expect(foundTask).toBeDefined();
      expect(foundTask!.title).toBe(createdTask.title);
    });
  });
});
