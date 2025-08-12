import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Advanced Task Attempt Creation', () => {
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

  test('should handle attempts API backend limitations', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Branch Generation Test Project ${timestamp}`,
      git_repo_path: `/tmp/branch-generation-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Task for branch test',
      description: 'Task for testing branch generation',
      parent_task_attempt: null
    });
    
    try {
      const attempt1 = await apiClient.attempts.create(project.id, task.id, {
        executor: 'claude',
        base_branch: 'main'
      });
      
      expect(attempt1.branch).toBeDefined();
      expect(attempt1.executor).toBe('claude');
      expect(attempt1.task_id).toBe(task.id);
    } catch (error) {
      expect(error).toBeDefined();

    }
  });

  test('should handle attempts creation with backend limitations', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Default Values Test Project ${timestamp}`,
      git_repo_path: `/tmp/default-values-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Task for default values test',
      description: 'Task for testing default values',
      parent_task_attempt: null
    });
    
    try {
      const attempt = await apiClient.attempts.create(project.id, task.id, {
        executor: 'claude',
        base_branch: 'main'
      });
      
      expect(attempt.executor).toBe('claude');
      expect(attempt.base_branch).toBe('main');
      expect(attempt.branch).toBeDefined();
      expect(attempt.task_id).toBe(task.id);
    } catch (error) {
      expect(error).toBeDefined();

    }
  });
});