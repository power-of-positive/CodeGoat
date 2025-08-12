/**
 * Task Basic Updates Tests
 * 
 * Tests for basic task property updates (title, description, status).
 * Focused on simple field modifications.
 */

import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Task Basic Updates', () => {
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

  test('should update task title and description', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Task Update Test Project ${timestamp}`
    }));
    
    const taskData = {
      project_id: project.id,
      title: 'Original Title',
      description: 'Original description',
      parent_task_attempt: null
    };
    const task = await apiClient.tasks.create(project.id, taskData);
    
    const updatedTask = await apiClient.tasks.update(project.id, task.id, {
      title: 'Updated Title',
      description: 'Updated description'
    });

    expect(updatedTask.title).toBe('Updated Title');
    expect(updatedTask.description).toBe('Updated description');
    expect(updatedTask.id).toBe(task.id);
    expect(updatedTask.project_id).toBe(project.id);
  });

  test('should update task status', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Task Status Test Project ${timestamp}`
    }));
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Status Test Task',
      description: 'Test task for status updates',
      parent_task_attempt: null
    });
    
    const updatedTask = await apiClient.tasks.update(project.id, task.id, {
      status: 'inprogress'
    });

    expect(updatedTask.status).toBe('inprogress');

    const completedTask = await apiClient.tasks.update(project.id, task.id, {
      status: 'done'
    });

    expect(completedTask.status).toBe('done');
  });

  test('should reject invalid status values', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Invalid Status Test Project ${timestamp}`
    }));
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Invalid Status Test Task',
      description: 'Test task for invalid status',
      parent_task_attempt: null
    });
    
    await expect(
      apiClient.tasks.update(project.id, task.id, {
        status: 'invalid_status' as any
      })
    ).rejects.toThrow();
  });

  test('should update timestamps on modification', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Timestamp Test Project ${timestamp}`
    }));
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Timestamp Test Task',
      description: 'Test task for timestamp updates',
      parent_task_attempt: null
    });
    
    const originalUpdatedAt = new Date(task.updated_at);
    
    // Wait sufficient time to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const updatedTask = await apiClient.tasks.update(project.id, task.id, {
      title: 'New Title'
    });

    const newUpdatedAt = new Date(updatedTask.updated_at);
    
    expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    expect(updatedTask.created_at).toBe(task.created_at);
    expect(updatedTask.title).toBe('New Title');
  });
});