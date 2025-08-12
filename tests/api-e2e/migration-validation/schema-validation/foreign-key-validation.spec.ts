import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../../setup/api-client';
import { cleanupProjects } from '../../test-helpers/project-test-utils';

describe('Foreign Key Schema Validation', () => {
  let apiClient: TestApiClient;
  let createdProjectIds: string[] = [];
  
  beforeEach(async () => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    apiClient = new TestApiClient(baseUrl);
    await apiClient.waitForServer();
  });

  afterEach(async () => {
    await cleanupProjects(apiClient, createdProjectIds);
    createdProjectIds = [];
  });

  test('should validate foreign key relationships through API operations', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `FK Test Project ${timestamp}`,
      git_repo_path: `/tmp/fk-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    await expect(
      apiClient.tasks.create('invalid-project-id', {
        project_id: 'invalid-project-id',
        title: 'Invalid FK Task',
        description: 'Should fail',
        parent_task_attempt: null
      })
    ).rejects.toThrow();
    
    const validTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Valid FK Task',
      description: 'Should succeed',
      parent_task_attempt: null
    });
    
    expect(validTask.project_id).toBe(project.id);
    
    await expect(
      apiClient.templates.create({
        template_name: `Invalid FK Template ${timestamp}`,
        title: 'Should fail',
        description: 'Template with invalid project_id',
        is_global: false,
        project_id: 'invalid-project-id'
      })
    ).rejects.toThrow();
    
    const validTemplate = await apiClient.templates.create({
      template_name: `Valid FK Template ${timestamp}`,
      title: 'Should succeed',
      description: 'Template with valid project_id',
      is_global: false,
      project_id: project.id
    });
    
    expect(validTemplate.project_id).toBe(project.id);
  });
});