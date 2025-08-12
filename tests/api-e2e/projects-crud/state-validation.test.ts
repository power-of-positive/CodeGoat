/**
 * Project State Validation - Core Tests
 * 
 * Core state validation tests using API-based approach.
 * Converted from database-based setup for reliable test execution.
 */

import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../setup/api-client';
import { 
  createTestProjectData, 
  cleanupProjects, 
  createAndTrackProject 
} from '../test-helpers/project-test-utils';

describe('Project State Validation - Core', () => {
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

  test('should validate core project state consistency', async () => {
    const projectData = createTestProjectData({
      name: 'Core State Validation Test Project',
      git_repo_path: '/tmp/core-state-validation-test'
    });
    
    const project = await createAndTrackProject(apiClient, createdProjectIds, projectData);
    
    expect(project.id).toBeDefined();
    expect(project.name).toBe(projectData.name);
    expect(project.git_repo_path).toBe(projectData.git_repo_path);
    
    const fetchedProject = await apiClient.projects.getById(project.id);
    expect(fetchedProject.id).toBe(project.id);
    expect(fetchedProject.name).toBe(project.name);
    expect(fetchedProject.git_repo_path).toBe(project.git_repo_path);
    
    const allProjects = await apiClient.projects.getAll();
    const foundProject = allProjects.find(p => p.id === project.id);
    expect(foundProject).toBeDefined();
    expect(foundProject?.name).toBe(project.name);
  });
});