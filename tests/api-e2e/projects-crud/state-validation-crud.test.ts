/**
 * Project State Validation - CRUD Operations
 * 
 * Tests for project CRUD operations consistency using API-based approach.
 * Converted from database-based setup for reliable test execution.
 */

import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { UpdateProject } from 'shared/types';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Project State Validation - CRUD Operations', () => {
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

  test('should maintain API consistency across CRUD operations', async () => {
    const projectData = createTestProjectData({
      name: 'State Validation Test Project',
      git_repo_path: '/tmp/state-validation-test'
    });
    
    const project = await createAndTrackProject(apiClient, createdProjectIds, projectData);
    
    expect(project.id).toBeDefined();
    expect(project.name).toBe(projectData.name);
    expect(project.git_repo_path).toBe(projectData.git_repo_path);
    
    const updateData: UpdateProject = { 
      name: 'Updated State Validation Project' 
    };
    const updatedProject = await apiClient.projects.update(project.id, updateData);
    
    expect(updatedProject.id).toBe(project.id);
    expect(updatedProject.name).toBe(updateData.name);
    expect(updatedProject.git_repo_path).toBe(project.git_repo_path);
    
    const fetchedProject = await apiClient.projects.getById(project.id);
    expect(fetchedProject.id).toBe(project.id);
    expect(fetchedProject.name).toBe(updateData.name);
    expect(fetchedProject.git_repo_path).toBe(project.git_repo_path);
    
    const allProjects = await apiClient.projects.getAll();
    const foundProject = allProjects.find(p => p.id === project.id);
    expect(foundProject).toBeDefined();
    expect(foundProject?.name).toBe(updateData.name);
  });

  test('should handle concurrent project operations gracefully', async () => {
    const projectPromises = Array.from({ length: 3 }, (_, i) => 
      createAndTrackProject(apiClient, createdProjectIds, createTestProjectData({
        name: `Concurrent Project ${i + 1}`,
        git_repo_path: `/tmp/concurrent-test-${i + 1}`
      }))
    );
    
    const projects = await Promise.all(projectPromises);
    
    expect(projects).toHaveLength(3);
    projects.forEach((project, i) => {
      expect(project.name).toBe(`Concurrent Project ${i + 1}`);
      expect(project.git_repo_path).toBe(`/tmp/concurrent-test-${i + 1}`);
    });
    
    const updatePromises = projects.map((project, i) => 
      apiClient.projects.update(project.id, {
        name: `Updated Concurrent Project ${i + 1}`
      })
    );
    
    const updatedProjects = await Promise.all(updatePromises);
    
    updatedProjects.forEach((project, i) => {
      expect(project.name).toBe(`Updated Concurrent Project ${i + 1}`);
      expect(project.id).toBe(projects[i].id);
    });
  });
});