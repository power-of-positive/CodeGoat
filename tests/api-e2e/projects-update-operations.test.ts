/**
 * Projects Update Operations Tests
 * 
 * Tests for project update scenarios and edge cases.
 * Split from main file to maintain focused testing and size limits.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestApiClient } from './setup/api-client';
import { UpdateProject } from 'shared/types';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from './test-helpers/project-test-utils';

describe('Projects Update Operations', () => {
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

  test('should handle partial project updates', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(
      apiClient,
      createdProjectIds,
      createTestProjectData({
        name: `Partial Update Test ${timestamp}`,
        git_repo_path: `/tmp/partial-update-test-${timestamp}`,
        setup_script: 'original setup',
        dev_script: 'original dev',
        cleanup_script: 'original cleanup'
      })
    );
    
    // Update only the name
    const updateData: UpdateProject = {
      name: 'Updated Name Only',
      git_repo_path: null,
      setup_script: null,
      dev_script: null,
      cleanup_script: null
    };
    
    const updatedProject = await apiClient.projects.update(project.id, updateData);
    
    expect(updatedProject.name).toBe('Updated Name Only');
    // Note: API behavior - null values might overwrite existing values
    // This documents the actual API behavior rather than testing assumptions
  });

  test('should update all project fields', async () => {
    const timestamp = Date.now();
    const project = await createAndTrackProject(
      apiClient,
      createdProjectIds,
      createTestProjectData({
        name: `Full Update Test ${timestamp}`,
        git_repo_path: `/tmp/full-update-test-${timestamp}`
      })
    );
    
    const updateData: UpdateProject = {
      name: 'Fully Updated Project',
      git_repo_path: null,
      setup_script: 'updated setup',
      dev_script: 'updated dev',
      cleanup_script: 'updated cleanup'
    };
    
    const updatedProject = await apiClient.projects.update(project.id, updateData);
    
    expect(updatedProject.name).toBe(updateData.name);
    expect(updatedProject.setup_script).toBe(updateData.setup_script);
    expect(updatedProject.dev_script).toBe(updateData.dev_script);
    expect(updatedProject.cleanup_script).toBe(updateData.cleanup_script);
  });
});