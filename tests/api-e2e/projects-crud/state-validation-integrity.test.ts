/**
 * Project State Validation - Data Integrity
 * 
 * Tests for project data integrity and referential relationships.
 * Converted from database-based setup for reliable test execution.
 */

import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Project State Validation - Data Integrity', () => {
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

  test('should maintain referential integrity with tasks', async () => {
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: 'Referential Integrity Test Project',
      git_repo_path: '/tmp/referential-test'
    }));
    
    const task1 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Task 1',
      description: 'First task',
      parent_task_attempt: null
    });
    
    const task2 = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Task 2',
      description: 'Second task', 
      parent_task_attempt: null
    });
    
    const projectTasks = await apiClient.tasks.getAll(project.id);
    expect(projectTasks).toHaveLength(2);
    expect(projectTasks.map(t => t.title).sort()).toEqual(['Task 1', 'Task 2']);
    
    const updatedProject = await apiClient.projects.update(project.id, {
      name: 'Updated Project with Tasks'
    });
    
    const tasksAfterUpdate = await apiClient.tasks.getAll(project.id);
    expect(tasksAfterUpdate).toHaveLength(2);
    
    expect(updatedProject.name).toBe('Updated Project with Tasks');
  });

  test('should validate project data integrity', async () => {
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: 'Data Integrity Test',
      git_repo_path: '/tmp/integrity-test',
      setup_script: 'npm install',
      dev_script: 'npm run dev',
      cleanup_script: 'npm run clean'
    }));
    
    expect(project.name).toBe('Data Integrity Test');
    expect(project.git_repo_path).toBe('/tmp/integrity-test');
    expect(project.setup_script).toBe('npm install');
    expect(project.dev_script).toBe('npm run dev');
    expect(project.cleanup_script).toBe('npm run clean');
    
    expect(project.created_at).toBeDefined();
    expect(project.updated_at).toBeDefined();
    expect(new Date(project.created_at).getTime()).toBeGreaterThan(0);
    expect(new Date(project.updated_at).getTime()).toBeGreaterThan(0);
    
    const beforeUpdate = new Date(project.updated_at).getTime();
    
    const updatedProject = await apiClient.projects.update(project.id, {
      setup_script: 'npm ci && npm run setup'
    });
    
    expect(updatedProject.setup_script).toBe('npm ci && npm run setup');
    expect(updatedProject.created_at).toBe(project.created_at);
    expect(new Date(updatedProject.updated_at).getTime()).toBeGreaterThanOrEqual(beforeUpdate);
  });
});