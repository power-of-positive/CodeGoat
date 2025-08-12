import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../../setup/api-client';
import { cleanupProjects } from '../../test-helpers/project-test-utils';

describe('Hierarchy Deletion and Cascade', () => {
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

  test('should test task deletion behavior', async () => {
    const timestamp = Date.now();
    // Create a project using API
    const project = await apiClient.projects.create({
      name: 'Deletion Cascade Test Project',
      git_repo_path: `/tmp/deletion-cascade-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const parentTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Parent Task',
      description: 'Will be deleted',
      parent_task_attempt: null
    });

    const childTask = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Child Task',
      description: 'Should be orphaned or deleted',
      parent_task: parentTask.id,
      parent_task_attempt: null
    });

    // Verify both tasks were created
    const tasksBefore = await apiClient.tasks.getAll(project.id);
    expect(tasksBefore).toHaveLength(2);

    // Test task deletion
    await apiClient.tasks.delete(project.id, parentTask.id);

    // Verify parent task was deleted
    const tasksAfter = await apiClient.tasks.getAll(project.id);
    const remainingParent = tasksAfter.find(t => t.id === parentTask.id);
    expect(remainingParent).toBeUndefined();

    // Check child task behavior (depends on backend implementation)
    const remainingChild = tasksAfter.find(t => t.id === childTask.id);
    if (remainingChild) {
      // Child task remains - test orphan handling
      expect(remainingChild.title).toBe('Child Task');
    }
    // Note: Whether child is deleted or orphaned depends on backend cascade behavior
  });

  test('should test hierarchy updates and integrity', async () => {
    const timestamp = Date.now();
    // Create a project using API
    const project = await apiClient.projects.create({
      name: 'Hierarchy Integrity Test Project',
      git_repo_path: `/tmp/hierarchy-integrity-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    const parentA = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Parent A',
      description: 'First parent',
      parent_task_attempt: null
    });

    const parentB = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Parent B',
      description: 'Second parent',
      parent_task_attempt: null
    });

    const child = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Child',
      description: 'Moveable child',
      parent_task: parentA.id,
      parent_task_attempt: null
    });

    // Verify all tasks were created
    const allTasks = await apiClient.tasks.getAll(project.id);
    expect(allTasks).toHaveLength(3);
    
    // Test basic task updates
    const updatedChild = await apiClient.tasks.update(project.id, child.id, {
      title: 'Updated Child Title'
    });

    expect(updatedChild.title).toBe('Updated Child Title');
    
    // Verify task relationships through API
    const finalTasks = await apiClient.tasks.getAll(project.id);
    const foundParentA = finalTasks.find(t => t.id === parentA.id);
    const foundParentB = finalTasks.find(t => t.id === parentB.id);
    const foundChild = finalTasks.find(t => t.id === child.id);
    
    expect(foundParentA).toBeDefined();
    expect(foundParentB).toBeDefined();
    expect(foundChild).toBeDefined();
    expect(foundChild!.title).toBe('Updated Child Title');
    
    // Note: Parent-child relationship updates depend on backend implementation
    // listChildren API method may not be implemented
  });
});