import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { 
  cleanupProjects, 
  createTestProjectData, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Core Data Migration Compatibility', () => {
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

  test('should demonstrate core migration compatibility patterns', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: `Core Migration Test Project ${timestamp}`,
      git_repo_path: `/tmp/core-migration-test-${timestamp}`
    }));
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Core Migration Task',
      description: 'Task demonstrating migration compatibility',
      parent_task_attempt: null
    });
    
    const retrievedProject = await apiClient.projects.getById(project.id);
    expect(retrievedProject.name).toBe(project.name);
    expect(retrievedProject.git_repo_path).toBe(project.git_repo_path);
    
    const allTasks = await apiClient.tasks.getAll(project.id);
    expect(allTasks).toHaveLength(1);
    expect(allTasks[0].title).toBe('Core Migration Task');
  });
});
