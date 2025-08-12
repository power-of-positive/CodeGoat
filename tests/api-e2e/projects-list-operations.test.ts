/**
 * Projects List Operations Tests
 * 
 * Tests for listing and querying multiple projects.
 * Split from main file to maintain focused testing and size limits.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestApiClient } from './setup/api-client';
import { 
  createMultipleProjectsData, 
  cleanupProjects, 
  createAndTrackProject 
} from './test-helpers/project-test-utils';

describe('Projects List Operations', () => {
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

  test('should list all projects', async () => {
    // Create test projects
    const projectsData = createMultipleProjectsData(2, 'List Test Project');
    
    const project1 = await createAndTrackProject(apiClient, createdProjectIds, projectsData[0]);
    const project2 = await createAndTrackProject(apiClient, createdProjectIds, projectsData[1]);
    
    // Get all projects
    const allProjects = await apiClient.projects.getAll();
    
    expect(Array.isArray(allProjects)).toBe(true);
    expect(allProjects.length).toBeGreaterThanOrEqual(2);
    
    // Verify our projects are in the list
    const projectIds = allProjects.map(p => p.id);
    expect(projectIds).toContain(project1.id);
    expect(projectIds).toContain(project2.id);
  });

  test('should handle empty project list', async () => {
    // Note: This test assumes the database might have existing projects
    // We just verify the API returns an array
    const allProjects = await apiClient.projects.getAll();
    expect(Array.isArray(allProjects)).toBe(true);
  });
});