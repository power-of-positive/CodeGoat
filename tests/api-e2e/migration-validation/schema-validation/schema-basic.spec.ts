import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../../setup/api-client';
import { cleanupProjects } from '../../test-helpers/project-test-utils';

describe('Basic API Schema Validation', () => {
  let apiClient: TestApiClient;
  let createdProjectIds: string[] = [];
  
  beforeEach(async () => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    apiClient = new TestApiClient(baseUrl);
    await apiClient.waitForServer();
  });

  afterEach(async () => {
    await cleanupProjects(apiClient, createdProjectIds);
    createdProjectIds = [];
  });

  test('should validate API schema through operations on all entity types', async () => {
    const timestamp = Date.now();
    const projects = await apiClient.projects.getAll();
    expect(Array.isArray(projects)).toBe(true);
    
    const project = await apiClient.projects.create({
      name: `Schema Test Project ${timestamp}`,
      git_repo_path: `/tmp/schema-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    expect(project.id).toBeDefined();
    expect(project.name).toBe(`Schema Test Project ${timestamp}`);
    
    const tasks = await apiClient.tasks.getAll(project.id);
    expect(Array.isArray(tasks)).toBe(true);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Schema Test Task',
      description: 'Task for schema validation',
      parent_task_attempt: null
    });
    
    expect(task.id).toBeDefined();
    expect(task.project_id).toBe(project.id);
    
    const templates = await apiClient.templates.getAll();
    expect(Array.isArray(templates)).toBe(true);
    
    const template = await apiClient.templates.create({
      template_name: `Schema Test Template ${timestamp}`,
      title: 'Template for schema validation',
      description: 'Template description',
      is_global: false,
      project_id: project.id
    });
    
    expect(template.template_name).toBe(`Schema Test Template ${timestamp}`);
    expect(template.project_id).toBe(project.id);
  });

  test('should validate API performance indicating proper indexes', async () => {
    const timestamp = Date.now();
    const projectPromises = Array.from({ length: 5 }, (_, i) => 
      apiClient.projects.create({
        name: `Performance Test Project ${timestamp}-${i + 1}`,
        git_repo_path: `/tmp/perf-test-${timestamp}-${i + 1}`,
        use_existing_repo: false
      })
    );
    
    const projects = await Promise.all(projectPromises);
    createdProjectIds.push(...projects.map(p => p.id));
    
    const startTime = Date.now();
    
    const allProjects = await apiClient.projects.getAll();
    const projectById = await apiClient.projects.getById(projects[0].id);
    
    const queryTime = Date.now() - startTime;
    
    expect(allProjects.length).toBeGreaterThanOrEqual(5);
    expect(projectById.id).toBe(projects[0].id);
    expect(queryTime).toBeLessThan(5000);
  });
});