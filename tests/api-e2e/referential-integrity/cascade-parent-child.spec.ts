import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Parent-Child Cascade Deletion Tests', () => {
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

  test('should handle deletion of parent tasks with children', async () => {
    const timestamp = Date.now();
    // Create a project with parent and child tasks
    const project = await apiClient.projects.create({
      name: `Parent Task Delete Test Project ${timestamp}`,
      git_repo_path: `/tmp/parent-task-delete-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    // Create parent task
    const parentTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Parent Task',
      description: 'Parent task to be deleted',
      parent_task_attempt: null
    });
    
    // Create child task
    const childTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Child Task',
      description: 'Child task',
      parent_task: parentTask.id,
      parent_task_attempt: null
    });
    
    // Verify tasks exist
    const tasksBefore = await apiClient.tasks.getAll(project.id);
    expect(tasksBefore).toHaveLength(2);
    
    // Test parent task deletion behavior
    await apiClient.tasks.delete(project.id, parentTask.id);
    
    // Verify parent task was deleted but child task remains
    const tasksAfter = await apiClient.tasks.getAll(project.id);
    expect(tasksAfter).toHaveLength(1); // One task should remain
    expect(tasksAfter[0].id).toBe(childTask.id); // Child task should remain
    expect(tasksAfter.find(t => t.id === parentTask.id)).toBeUndefined(); // Parent should be deleted
  });
});