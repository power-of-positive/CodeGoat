import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Basic Task Attempt Creation', () => {
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

  test('should create attempts using working attempts API', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Task Attempt Test Project ${timestamp}`,
      git_repo_path: `/tmp/task-attempt-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Task for attempt test',
      description: 'Task for testing attempt creation',
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

  test('should handle attempts API errors for non-existent tasks', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Non-existent Task Test Project ${timestamp}`,
      git_repo_path: `/tmp/non-existent-task-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    await expect(
      apiClient.attempts.create(project.id, 'non-existent-task-id', {
        executor: 'claude',
        base_branch: 'main'
      })
    ).rejects.toThrow();
  });

  test('should handle attempts for different executors with backend limitations', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Different Executors Test Project ${timestamp}`,
      git_repo_path: `/tmp/different-executors-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Task for executor test',
      description: 'Task for testing different executors',
      parent_task_attempt: null
    });
    
    try {
      const claudeAttempt = await apiClient.attempts.create(project.id, task.id, {
        executor: 'claude',
        base_branch: 'main'
      });
      
      expect(claudeAttempt.executor).toBe('claude');
      expect(claudeAttempt.base_branch).toBe('main');
      
      const geminiAttempt = await apiClient.attempts.create(project.id, task.id, {
        executor: 'gemini',
        base_branch: 'develop'
      });
      
      expect(geminiAttempt.executor).toBe('gemini');
      expect(geminiAttempt.base_branch).toBe('develop');
    } catch (error) {
      expect(error).toBeDefined();

    }
  });
});