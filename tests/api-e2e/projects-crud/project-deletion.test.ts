/**
 * Project Deletion Operations Tests
 * 
 * Tests for project deletion operations using API-based approach.
 * Converted from database-based setup for reliable test execution.
 */

import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Project Deletion Operations', () => {
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

  test('should delete project and maintain referential integrity', async () => {
    const timestamp = Date.now();
    // Create project with tasks
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: 'Project to Delete',
      git_repo_path: `/tmp/delete-test-project-${timestamp}`
    }));
    
    // Create some tasks for the project to test cascade deletion
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
    
    // Verify project and tasks exist before deletion
    const projectBefore = await apiClient.projects.getById(project.id);
    expect(projectBefore.id).toBe(project.id);
    
    const tasksBefore = await apiClient.tasks.getAll(project.id);
    expect(tasksBefore).toHaveLength(2);
    
    // Delete the project
    await apiClient.projects.delete(project.id);
    
    // Remove from tracking since it's been deleted
    const projectIndex = createdProjectIds.indexOf(project.id);
    if (projectIndex > -1) {
      createdProjectIds.splice(projectIndex, 1);
    }
    
    // Verify project is deleted
    await expect(apiClient.projects.getById(project.id)).rejects.toThrow();
    
    // Verify tasks are cascade deleted
    await expect(apiClient.tasks.getAll(project.id)).rejects.toThrow();
  });

  test('should handle deletion of non-existent project gracefully', async () => {
    // Attempt to delete non-existent project
    await expect(apiClient.projects.delete('non-existent-id')).rejects.toThrow();
  });

  test('should delete project without tasks', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: 'Empty Project to Delete',
      git_repo_path: `/tmp/empty-delete-test-project-${timestamp}`
    }));
    
    // Verify project exists
    const projectBefore = await apiClient.projects.getById(project.id);
    expect(projectBefore.id).toBe(project.id);
    
    // Delete the project
    await apiClient.projects.delete(project.id);
    
    // Remove from tracking
    const projectIndex = createdProjectIds.indexOf(project.id);
    if (projectIndex > -1) {
      createdProjectIds.splice(projectIndex, 1);
    }
    
    // Verify project is deleted
    await expect(apiClient.projects.getById(project.id)).rejects.toThrow();
  });

  test('should not affect other projects when deleting one', async () => {
    const timestamp = Date.now();
    const project1 = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: 'Project 1',
      git_repo_path: `/tmp/keep-project-1-${timestamp}`
    }));
    
    const project2 = await createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
      name: 'Project 2', 
      git_repo_path: `/tmp/delete-project-2-${timestamp}`
    }));
    
    // Delete second project
    await apiClient.projects.delete(project2.id);
    
    // Remove from tracking
    const project2Index = createdProjectIds.indexOf(project2.id);
    if (project2Index > -1) {
      createdProjectIds.splice(project2Index, 1);
    }
    
    // Verify first project still exists
    const remainingProject = await apiClient.projects.getById(project1.id);
    expect(remainingProject.id).toBe(project1.id);
    expect(remainingProject.name).toBe('Project 1');
    
    // Verify second project is deleted
    await expect(apiClient.projects.getById(project2.id)).rejects.toThrow();
  });
});