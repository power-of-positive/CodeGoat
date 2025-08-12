/**
 * Tests for Project Test Utilities
 * 
 * Ensures test utilities work correctly and maintain type safety.
 * These utilities are used across multiple project test files.
 */

import { describe, test, expect, vi } from 'vitest';
import { 
  createTestProjectData,
  createMultipleProjectsData,
  cleanupProjects,
  createAndTrackProject
} from './project-test-utils';

describe('Project Test Utilities', () => {
  test('should create test project data with defaults', () => {
    const projectData = createTestProjectData();
    
    expect(projectData.name).toBe('Test Project');
    expect(projectData.git_repo_path).toMatch(/^\/tmp\/test-project-\d+-[a-z0-9]+$/);
    expect(projectData.use_existing_repo).toBe(false);
    expect(projectData.setup_script).toBeNull();
    expect(projectData.dev_script).toBeNull();
    expect(projectData.cleanup_script).toBeNull();
  });

  test('should create test project data with overrides', () => {
    const overrides = {
      name: 'Custom Project',
      setup_script: 'custom setup',
      git_repo_path: '/tmp/custom-project'
    };
    
    const projectData = createTestProjectData(overrides);
    
    expect(projectData.name).toBe('Custom Project');
    expect(projectData.setup_script).toBe('custom setup');
    expect(projectData.git_repo_path).toBe('/tmp/custom-project');
  });

  test('should create multiple projects data', () => {
    const projectsData = createMultipleProjectsData(3, 'Multi Project');
    
    expect(projectsData).toHaveLength(3);
    expect(projectsData[0].name).toBe('Multi Project 1');
    expect(projectsData[1].name).toBe('Multi Project 2');
    expect(projectsData[2].name).toBe('Multi Project 3');
    expect(projectsData[0].git_repo_path).toMatch(/^\/tmp\/test-project-\d+-1-[a-z0-9]+$/);
    expect(projectsData[1].git_repo_path).toMatch(/^\/tmp\/test-project-\d+-2-[a-z0-9]+$/);
    expect(projectsData[2].git_repo_path).toMatch(/^\/tmp\/test-project-\d+-3-[a-z0-9]+$/);
  });

  test('should handle cleanup with successful deletions', async () => {
    const mockApiClient = {
      projects: {
        delete: vi.fn().mockResolvedValue(undefined)
      }
    } as any;
    
    const projectIds = ['id1', 'id2', 'id3'];
    
    await cleanupProjects(mockApiClient, projectIds);
    
    expect(mockApiClient.projects.delete).toHaveBeenCalledTimes(3);
    expect(mockApiClient.projects.delete).toHaveBeenCalledWith('id1');
    expect(mockApiClient.projects.delete).toHaveBeenCalledWith('id2');
    expect(mockApiClient.projects.delete).toHaveBeenCalledWith('id3');
  });

  test('should handle cleanup with failed deletions', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    const mockApiClient = {
      projects: {
        delete: vi.fn().mockRejectedValue(new Error('Delete failed'))
      }
    } as any;
    
    const projectIds = ['id1', 'id2'];
    
    await cleanupProjects(mockApiClient, projectIds);
    
    expect(mockApiClient.projects.delete).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3); // 2 individual + 1 summary
    
    consoleErrorSpy.mockRestore();
  });

  test('should create and track project', async () => {
    const mockProject = { id: 'new-project-id', name: 'New Project' };
    const mockApiClient = {
      projects: {
        create: vi.fn().mockResolvedValue(mockProject)
      }
    } as any;
    
    const projectIds: string[] = [];
    const projectData = createTestProjectData();
    
    const result = await createAndTrackProject(mockApiClient, projectIds, projectData);
    
    expect(result).toBe(mockProject);
    expect(projectIds).toContain('new-project-id');
    expect(mockApiClient.projects.create).toHaveBeenCalledWith(projectData);
  });
});