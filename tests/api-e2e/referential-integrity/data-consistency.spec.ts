import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Core Data Consistency Validation', () => {
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

  test('should ensure data consistency across API operations', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Core Consistency Test Project ${timestamp}`,
      git_repo_path: `/tmp/core-consistency-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task1 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Core Task 1',
      description: 'First core task',
      parent_task_attempt: null
    });
    
    const task2 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Core Task 2',
      description: 'Second core task',
      parent_task: task1.id,
      parent_task_attempt: null
    });
    
    const allTasks = await apiClient.tasks.getAll(project.id);
    expect(allTasks).toHaveLength(2);
    
    const fetchedTask1 = allTasks.find(t => t.id === task1.id);
    const fetchedTask2 = allTasks.find(t => t.id === task2.id);
    
    expect(fetchedTask1).toBeDefined();
    expect(fetchedTask2).toBeDefined();
    expect(fetchedTask1!.project_id).toBe(project.id);
    expect(fetchedTask2!.project_id).toBe(project.id);
  });

  test('should maintain transaction integrity on API failures', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Transaction Integrity Test Project ${timestamp}`,
      git_repo_path: `/tmp/transaction-integrity-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const tasksBefore = await apiClient.tasks.getAll(project.id);
    const initialTaskCount = tasksBefore.length;
    
    try {
      await apiClient.tasks.create(project.id, {
        project_id: 'invalid-project-id',
        title: 'Invalid Task',
        description: 'This task should not be created',
        parent_task_attempt: null
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
    
    const tasksAfter = await apiClient.tasks.getAll(project.id);
    expect(tasksAfter).toHaveLength(initialTaskCount);
  });
});
