import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import { TestApiClient } from '../../setup/api-client';
import { cleanupProjects } from '../../test-helpers/project-test-utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

describe('Migration Schema Validation through API', () => {
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

  test('should validate migration files exist and have valid syntax', async () => {
    const migrationsDir = join(__dirname, '../../../../backend/migrations');
    const migrationFiles = glob.sync('*.sql', { cwd: migrationsDir }).sort();
    
    expect(migrationFiles.length).toBeGreaterThan(0);
    
    for (const file of migrationFiles) {
      const migrationPath = join(migrationsDir, file);
      const migrationSql = readFileSync(migrationPath, 'utf8');
      
      expect(migrationSql.trim().length).toBeGreaterThan(0);
      expect(migrationSql).toMatch(/(CREATE|ALTER|INSERT|UPDATE|DELETE)/i);
      
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      expect(statements.length).toBeGreaterThan(0);
    }
    
    // Validate API server is responding (indicates migrations applied successfully)
    const projects = await apiClient.projects.getAll();
    expect(Array.isArray(projects)).toBe(true);
  });

  test('should validate schema through API operations (indicates correct migration order)', async () => {
    const timestamp = Date.now();
    // Test that all expected entity types are accessible through API
    // This validates that migrations created all required tables in correct order
    
    // Test projects table exists and is accessible
    const projects = await apiClient.projects.getAll();
    expect(Array.isArray(projects)).toBe(true);
    
    // Create project to test foreign key relationships are working
    const project = await apiClient.projects.create({
      name: `Migration Order Test Project ${timestamp}`,
      git_repo_path: `/tmp/migration-order-test-${timestamp}`,
      use_existing_repo: false
    });
    
    createdProjectIds.push(project.id);
    
    // Test tasks table exists and foreign key to projects works
    const tasks = await apiClient.tasks.getAll(project.id);
    expect(Array.isArray(tasks)).toBe(true);
    
    const task = await apiClient.tasks.create(project.id, {
      project_id: project.id,
      title: 'Migration Test Task',
      description: 'Task to test migration order',
      parent_task_attempt: null
    });
    
    expect(task.project_id).toBe(project.id);
    
    // Test templates table exists and foreign key to projects works
    const templates = await apiClient.templates.getAll();
    expect(Array.isArray(templates)).toBe(true);
    
    const template = await apiClient.templates.create({
      template_name: `Migration Order Test Template ${timestamp}`,
      title: 'Template for migration order test',
      description: 'Template description',
      is_global: false,
      project_id: project.id
    });
    
    expect(template.project_id).toBe(project.id);
  });
});
