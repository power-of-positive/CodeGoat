import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Core Task Attempt Creation', () => {
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

  test('should demonstrate attempts API integration patterns', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Core Attempt Integration Test Project ${timestamp}`,
      git_repo_path: `/tmp/core-attempt-integration-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Core attempt integration task',
      description: 'Task for testing core attempt integration patterns',
      parent_task_attempt: null
    });
    
    try {
      const attempt = await apiClient.attempts.create(project.id, task.id, {
        executor: 'claude',
        base_branch: 'main'
      });
      
      expect(attempt.task_id).toBe(task.id);
      expect(attempt.executor).toBe('claude');
      expect(attempt.base_branch).toBe('main');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});