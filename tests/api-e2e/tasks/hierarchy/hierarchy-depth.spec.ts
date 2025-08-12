import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../../setup/api-client';
import { cleanupProjects } from '../../test-helpers/project-test-utils';

function calculateTaskDepth(task: any, allTasks: any[]): number {
  if (!task.parent_task) return 0;
  const parent = allTasks.find(t => t.id === task.parent_task);
  if (!parent) return 0;
  return 1 + calculateTaskDepth(parent, allTasks);
}

describe('Task Hierarchy Depth Management', () => {
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

  test('should organize tasks by creation order', async () => {
    const timestamp = Date.now();
    const project = await apiClient.projects.create({
      name: `Task Depth Test Project ${timestamp}`,
      git_repo_path: `/tmp/task-depth-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const level0 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Level 0',
      description: 'Root level',
      parent_task_attempt: null
    });

    const level1 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Level 1',
      description: 'First level',
      parent_task: level0.id,
      parent_task_attempt: null
    });

    const level2 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Level 2',
      description: 'Second level',
      parent_task: level1.id,
      parent_task_attempt: null
    });

    const allTasks = await apiClient.tasks.getAll(project.id);
    expect(allTasks).toHaveLength(3);
    
    const titles = allTasks.map(t => t.title).sort();
    expect(titles).toEqual(['Level 0', 'Level 1', 'Level 2']);
    
    const foundLevel0 = allTasks.find(t => t.title === 'Level 0');
    const foundLevel1 = allTasks.find(t => t.title === 'Level 1');
    const foundLevel2 = allTasks.find(t => t.title === 'Level 2');
    
    expect(foundLevel0!.id).toBe(level0.id);
    expect(foundLevel1!.id).toBe(level1.id);
    expect(foundLevel2!.id).toBe(level2.id);
  });
});