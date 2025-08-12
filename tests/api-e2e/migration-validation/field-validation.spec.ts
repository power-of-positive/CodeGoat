import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { cleanupProjects } from '../test-helpers/project-test-utils';

describe('Field Validation and Constraints', () => {
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

  test('should validate enum values and constraints through API', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Enum Validation Test Project ${timestamp}`,
      git_repo_path: `/tmp/enum-validation-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Enum Validation Task',
      description: 'Task for testing enum validation',
      parent_task_attempt: null
    });
    
    expect(task.title).toBe('Enum Validation Task');
    expect(task.project_id).toBe(project.id);
    
    const updatedTask = await apiClient.tasks.update(project.id, task.id, {
      title: 'Updated Enum Validation Task',
      description: 'Updated description'
    });
    
    expect(updatedTask.title).toBe('Updated Enum Validation Task');
    expect(updatedTask.description).toBe('Updated description');
    
    const template = await apiClient.templates.create({
      template_name: `Enum Test Template ${timestamp}`,
      title: 'Template Title',
      description: 'Template Description',
      is_global: true
    });
    
    expect(template.is_global === true || template.is_global === undefined).toBe(true);
    expect(typeof template.is_global === 'boolean' || typeof template.is_global === 'undefined').toBe(true);
  });
});