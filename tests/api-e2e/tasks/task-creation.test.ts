/**
 * Task Creation Tests
 * 
 * Tests for creating tasks with various configurations.
 * Uses API-based approach for reliable test execution.
 */

import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Task Creation', () => {
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

  test('should create a task with minimal required fields', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Task Creation Test Project ${timestamp}`,
      git_repo_path: `/tmp/task-creation-test-${timestamp}`
    }));
    
    const taskData = {
      project_id: project.id,
      title: 'Simple Task',
      description: 'A basic task for testing',
      parent_task_attempt: null
    };
    
    const task = await apiClient.tasks.create(project.id, taskData);

    expect(task).toBeDefined();
    expect(task.title).toBe('Simple Task');
    expect(task.description).toBe('A basic task for testing');
    expect(task.project_id).toBe(project.id);
    expect(task.status).toBe('todo');
    expect(task.parent_task_attempt).toBeNull();
  });

  test('should create task with only title', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Minimal Task Test Project ${timestamp}`,
      git_repo_path: `/tmp/minimal-task-test-${timestamp}`
    }));
    
    const taskData = {
      project_id: project.id,
      title: 'Title Only Task',
      description: null,
      parent_task_attempt: null
    };
    
    const task = await apiClient.tasks.create(project.id, taskData);

    expect(task.title).toBe('Title Only Task');
    expect(task.description).toBeNull();
    expect(task.project_id).toBe(project.id);
  });

  test('should fail to create task for non-existent project', async () => {
    const taskData = {
      project_id: 'non-existent-project-id',
      title: 'Invalid Task',
      description: 'Should fail',
      parent_task_attempt: null
    };

    await expect(
      apiClient.tasks.create('non-existent-project-id', taskData)
    ).rejects.toThrow();
  });

  test('should create task with empty title', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Empty Title Test Project ${timestamp}`,
      git_repo_path: `/tmp/empty-title-test-${timestamp}`
    }));
    
    const taskData = {
      project_id: project.id,
      title: '',
      description: 'Task with empty title',
      parent_task_attempt: null
    };

    const task = await apiClient.tasks.create(project.id, taskData);
    
    expect(task.title).toBe('');
    expect(task.description).toBe('Task with empty title');
  });

  // Note: Parent task attempt tests are moved to task-parent-relationship.test.ts
  // due to complexity with task attempt API

  test('should validate task data structure', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Data Structure Test Project ${timestamp}`,
      git_repo_path: `/tmp/data-structure-test-${timestamp}`
    }));
    
    const taskData = {
      project_id: project.id,
      title: 'Validation Test Task',
      description: 'Testing data structure',
      parent_task_attempt: null
    };
    
    const task = await apiClient.tasks.create(project.id, taskData);

    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('project_id', project.id);
    expect(task).toHaveProperty('title', 'Validation Test Task');
    expect(task).toHaveProperty('description', 'Testing data structure');
    expect(task).toHaveProperty('status', 'todo');
    expect(task).toHaveProperty('parent_task_attempt', null);
    expect(task).toHaveProperty('created_at');
    expect(task).toHaveProperty('updated_at');
  });
});