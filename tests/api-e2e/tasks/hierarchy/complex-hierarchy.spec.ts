import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../../setup/api-client';
import { cleanupProjects } from '../../test-helpers/project-test-utils';

describe('Complex Task Hierarchy Integration', () => {
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

  test('should handle complex multi-level hierarchy integration', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Complex Integration Hierarchy Test Project ${timestamp}`,
      git_repo_path: `/tmp/complex-integration-hierarchy-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const rootTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Integration Root Task',
      description: 'Top level integration task',
      parent_task_attempt: null
    });

    const branchTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Integration Branch',
      description: 'Branch task for integration testing',
      parent_task: rootTask.id,
      parent_task_attempt: null
    });

    const leafTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Integration Leaf',
      description: 'Leaf task for integration testing',
      parent_task: branchTask.id,
      parent_task_attempt: null
    });

    expect(rootTask.title).toBe('Integration Root Task');
    expect(branchTask.title).toBe('Integration Branch');
    expect(leafTask.title).toBe('Integration Leaf');
    
    expect(rootTask.project_id).toBe(project.id);
    expect(branchTask.project_id).toBe(project.id);
    expect(leafTask.project_id).toBe(project.id);
    
    const allTasks = await apiClient.tasks.getAll(project.id);
    expect(allTasks).toHaveLength(3);
  });
});