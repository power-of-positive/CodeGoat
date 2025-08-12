/**
 * Projects CRUD Operations Tests
 * 
 * Tests for basic Create, Read, Update, Delete operations.
 * Split from main file to maintain size limits and focused testing.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestApiClient } from './setup/api-client';
import { UpdateProject } from 'shared/types';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from './test-helpers/project-test-utils';

describe('Projects CRUD Operations', () => {
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

  test('should create, read, update, and delete a project', async () => {
    const timestamp = Date.now();
    // Create
    const createData = createTestProjectData({
      name: `CRUD Test Project ${timestamp}`,
      git_repo_path: `/tmp/crud-test-project-${timestamp}`,
      setup_script: 'npm install',
      dev_script: 'npm run dev',
      cleanup_script: 'npm run clean'
    });
    
    const createdProject = await createAndTrackProject(apiClient, createdProjectIds, createData);
    
    expect(createdProject.name).toBe(createData.name);
    expect(createdProject.git_repo_path).toBe(createData.git_repo_path);
    expect(createdProject.setup_script).toBe(createData.setup_script);
    expect(createdProject.id).toBeDefined();
    
    // Read
    const fetchedProject = await apiClient.projects.getById(createdProject.id);
    expect(fetchedProject).toEqual(createdProject);
    
    // Update
    const updateData: UpdateProject = {
      name: 'Updated CRUD Test Project',
      git_repo_path: null,
      setup_script: 'npm install && npm run build',
      dev_script: null,
      cleanup_script: null
    };
    
    const updatedProject = await apiClient.projects.update(createdProject.id, updateData);
    expect(updatedProject.id).toBe(createdProject.id);
    expect(updatedProject.name).toBe(updateData.name);
    expect(updatedProject.setup_script).toBe(updateData.setup_script);
    
    // Delete
    await apiClient.projects.delete(createdProject.id);
    
    // Verify deletion
    await expect(async () => {
      await apiClient.projects.getById(createdProject.id);
    }).rejects.toThrow();
    
    // Remove from cleanup list since we already deleted it
    createdProjectIds = createdProjectIds.filter(id => id !== createdProject.id);
  });

  test('should handle project creation with minimal data', async () => {
    const timestamp = Date.now();
    const minimalProject = await createAndTrackProject(
      apiClient, 
      createdProjectIds,
      createTestProjectData({
        name: `Minimal Project ${timestamp}`,
        git_repo_path: `/tmp/minimal-project-${timestamp}`
      })
    );
    
    expect(minimalProject.name).toBe(`Minimal Project ${timestamp}`);
    expect(minimalProject.setup_script).toBeNull();
    expect(minimalProject.dev_script).toBeNull();
    expect(minimalProject.cleanup_script).toBeNull();
  });
});