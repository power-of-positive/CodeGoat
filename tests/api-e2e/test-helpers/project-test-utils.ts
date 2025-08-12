/**
 * Project Test Utilities
 * 
 * Common utilities and helpers for project API testing.
 * Extracted to reduce duplication and maintain DRY principles.
 */

import { CreateProject } from 'shared/types';
import { TestApiClient } from '../setup/api-client';

/**
 * Create test project data with defaults
 */
export function createTestProjectData(overrides: Partial<CreateProject> = {}): CreateProject {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return {
    name: 'Test Project',
    git_repo_path: `/tmp/test-project-${timestamp}-${randomId}`,
    use_existing_repo: false,
    setup_script: null,
    dev_script: null,
    cleanup_script: null,
    ...overrides
  };
}

/**
 * Create multiple test projects with unique paths
 */
export function createMultipleProjectsData(count: number, baseName = 'Test Project'): CreateProject[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const randomId = Math.random().toString(36).substring(2, 8);
    return {
      name: `${baseName} ${i + 1}`,
      git_repo_path: `/tmp/test-project-${timestamp}-${i + 1}-${randomId}`,
      use_existing_repo: false,
      setup_script: null,
      dev_script: null,
      cleanup_script: null
    };
  });
}

/**
 * Project cleanup utility for test teardown
 */
export async function cleanupProjects(
  apiClient: TestApiClient, 
  projectIds: string[]
): Promise<void> {
  const failures: string[] = [];
  
  for (const projectId of projectIds) {
    try {
      await apiClient.projects.delete(projectId);
    } catch (error) {
      // Only log as warning if it's a 404 (already deleted), otherwise track as failure
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.warn(`Project ${projectId} already deleted`);
      } else {
        console.error(`Failed to cleanup project ${projectId}:`, error.message);
        failures.push(projectId);
      }
    }
  }
  
  // If there were non-404 failures, this could indicate a problem
  if (failures.length > 0) {
    console.error(`Cleanup failed for ${failures.length} projects: ${failures.join(', ')}`);
  }
}

/**
 * Create and track a test project
 */
export async function createAndTrackProject(
  apiClient: TestApiClient,
  projectIds: string[],
  projectData: CreateProject
) {
  const project = await apiClient.projects.create(projectData);
  projectIds.push(project.id);
  return project;
}