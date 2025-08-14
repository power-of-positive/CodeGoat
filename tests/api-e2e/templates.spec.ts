import { spec } from 'pactum';
import { DatabaseTestHelper } from './shared/kanban-database';

describe('Task Templates API', () => {
  let dbHelper: DatabaseTestHelper;

  beforeAll(async () => {
    dbHelper = new DatabaseTestHelper();
    await dbHelper.initializeDatabase();
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  beforeEach(async () => {
    await dbHelper.cleanupData();
  });

  describe('Template CRUD Operations', () => {
    it('should create a global template', async () => {
      const templateData = {
        project_id: null,
        template_name: 'Bug Fix Template',
        title: 'Fix bug in [component]',
        description: 'Template for fixing bugs with proper testing and documentation',
        tags: ['bug', 'fix'],
        estimated_hours: 4
      };

      await spec()
        .post('/api/templates')
        .withJson(templateData)
        .expectStatus(201)
        .expectJsonMatch({
          id: /^[0-9a-f-]{36}$/,
          project_id: null,
          template_name: 'Bug Fix Template',
          title: 'Fix bug in [component]',
          description: 'Template for fixing bugs with proper testing and documentation',
          tags: ['bug', 'fix'],
          estimated_hours: 4,
          created_at: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          updated_at: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        });
    });

    it('should create a project-specific template', async () => {
      // First create a project
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Template Test Project',
          description: 'Project for testing templates',
          git_repo_path: '/tmp/template-test-repo',
          setup_script: 'npm install',
          dev_script: 'npm run dev',
          cleanup_script: 'npm run clean'
        })
        .expectStatus(201)
        .returns('id');

      const templateData = {
        project_id: project,
        template_name: 'Feature Development',
        title: 'Implement [feature name]',
        description: 'Template for implementing new features in this project',
        tags: ['feature', 'development'],
        estimated_hours: 8
      };

      await spec()
        .post('/api/templates')
        .withJson(templateData)
        .expectStatus(201)
        .expectJsonMatch({
          id: /^[0-9a-f-]{36}$/,
          project_id: project,
          template_name: 'Feature Development',
          title: 'Implement [feature name]',
          description: 'Template for implementing new features in this project',
          tags: ['feature', 'development'],
          estimated_hours: 8
        });
    });

    it('should retrieve all global templates', async () => {
      // Create multiple global templates
      const template1 = await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Bug Fix',
          title: 'Fix bug',
          description: 'Bug fix template'
        })
        .expectStatus(201);

      const template2 = await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Feature Request',
          title: 'New feature',
          description: 'Feature template'
        })
        .expectStatus(201);

      await spec()
        .get('/api/templates/global')
        .expectStatus(200)
        .expectJsonLength(2)
        .expectJsonMatch([
          { template_name: 'Bug Fix' },
          { template_name: 'Feature Request' }
        ]);
    });

    it('should retrieve templates by project', async () => {
      // Create a project
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Project Template Test',
          git_repo_path: '/tmp/project-template-test'
        })
        .expectStatus(201)
        .returns('id');

      // Create project-specific templates
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Project Bug Fix',
          title: 'Fix project bug',
          description: 'Project-specific bug fix'
        })
        .expectStatus(201);

      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Project Feature',
          title: 'New project feature',
          description: 'Project-specific feature'
        })
        .expectStatus(201);

      // Create global template (should not appear in project results)
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Global Template',
          title: 'Global title',
          description: 'Global template'
        })
        .expectStatus(201);

      const projectTemplates = await spec()
        .get(`/api/templates/project/${project}`)
        .expectStatus(200)
        .expectJsonLength(2);

      // Verify only project templates are returned
      const templateNames = projectTemplates.json.map((t: any) => t.template_name);
      expect(templateNames).toContain('Project Bug Fix');
      expect(templateNames).toContain('Project Feature');
      expect(templateNames).not.toContain('Global Template');
    });

    it('should update a template', async () => {
      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Original Template',
          title: 'Original Title',
          description: 'Original description'
        })
        .expectStatus(201);

      const templateId = template.json.id;

      await spec()
        .put(`/api/templates/${templateId}`)
        .withJson({
          template_name: 'Updated Template',
          title: 'Updated Title',
          description: 'Updated description',
          tags: ['updated'],
          estimated_hours: 6
        })
        .expectStatus(200)
        .expectJsonMatch({
          id: templateId,
          template_name: 'Updated Template',
          title: 'Updated Title',
          description: 'Updated description',
          tags: ['updated'],
          estimated_hours: 6,
          updated_at: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        });
    });

    it('should delete a template', async () => {
      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Template to Delete',
          title: 'Will be deleted',
          description: 'This template will be deleted'
        })
        .expectStatus(201);

      const templateId = template.json.id;

      await spec()
        .delete(`/api/templates/${templateId}`)
        .expectStatus(204);

      // Verify template is deleted
      await spec()
        .get(`/api/templates/${templateId}`)
        .expectStatus(404);
    });

    it('should get a specific template by id', async () => {
      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Specific Template',
          title: 'Specific Title',
          description: 'Specific description'
        })
        .expectStatus(201);

      const templateId = template.json.id;

      await spec()
        .get(`/api/templates/${templateId}`)
        .expectStatus(200)
        .expectJsonMatch({
          id: templateId,
          template_name: 'Specific Template',
          title: 'Specific Title',
          description: 'Specific description'
        });
    });
  });

  describe('Template Validation', () => {
    it('should require template_name and title', async () => {
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          description: 'Missing required fields'
        })
        .expectStatus(400)
        .expectJsonMatch({
          error: /template_name.*required|title.*required/i
        });
    });

    it('should validate template_name uniqueness within project scope', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Unique Template Test Project',
          git_repo_path: '/tmp/unique-template-test'
        })
        .expectStatus(201)
        .returns('id');

      // Create first template
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Unique Template Name',
          title: 'First Template',
          description: 'First template with this name'
        })
        .expectStatus(201);

      // Try to create another with same name in same project
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Unique Template Name',
          title: 'Second Template',
          description: 'Second template with same name'
        })
        .expectStatus(409)
        .expectJsonMatch({
          error: /already exists|duplicate|unique/i
        });
    });

    it('should allow same template name in different projects', async () => {
      const project1 = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Project 1',
          git_repo_path: '/tmp/project1'
        })
        .expectStatus(201)
        .returns('id');

      const project2 = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Project 2',
          git_repo_path: '/tmp/project2'
        })
        .expectStatus(201)
        .returns('id');

      // Create template in first project
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project1,
          template_name: 'Common Template Name',
          title: 'Project 1 Template',
          description: 'Template for project 1'
        })
        .expectStatus(201);

      // Create template with same name in second project - should succeed
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project2,
          template_name: 'Common Template Name',
          title: 'Project 2 Template',
          description: 'Template for project 2'
        })
        .expectStatus(201);
    });

    it('should allow same template name in global and project scopes', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Global vs Project Template Test',
          git_repo_path: '/tmp/global-vs-project'
        })
        .expectStatus(201)
        .returns('id');

      // Create global template
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Shared Template Name',
          title: 'Global Template',
          description: 'Global template'
        })
        .expectStatus(201);

      // Create project template with same name - should succeed
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Shared Template Name',
          title: 'Project Template',
          description: 'Project template'
        })
        .expectStatus(201);
    });

    it('should validate field lengths', async () => {
      const longString = 'a'.repeat(1000);

      await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: longString,
          title: longString,
          description: longString
        })
        .expectStatus(400)
        .expectJsonMatch({
          error: /too long|length/i
        });
    });

    it('should handle invalid project_id', async () => {
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: 'invalid-uuid',
          template_name: 'Invalid Project Template',
          title: 'Invalid Title',
          description: 'Invalid description'
        })
        .expectStatus(400)
        .expectJsonMatch({
          error: /invalid.*project|project.*not found/i
        });
    });

    it('should validate JSON fields properly', async () => {
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'JSON Test Template',
          title: 'JSON Test',
          description: 'Testing JSON fields',
          tags: ['valid', 'tags', 'array'],
          estimated_hours: 5
        })
        .expectStatus(201)
        .expectJsonMatch({
          tags: ['valid', 'tags', 'array'],
          estimated_hours: 5
        });
    });
  });

  describe('Template Usage in Tasks', () => {
    it('should use template when creating task with template_id', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Template Usage Project',
          git_repo_path: '/tmp/template-usage'
        })
        .expectStatus(201)
        .returns('id');

      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Feature Template',
          title: 'Implement [feature]',
          description: 'Template description for features',
          tags: ['feature', 'template']
        })
        .expectStatus(201);

      // Create task using template
      await spec()
        .post('/api/tasks')
        .withJson({
          project_id: project,
          template_id: template.json.id,
          title: 'Implement user authentication', // Override template title
          description: 'Add OAuth2 authentication' // Override template description
        })
        .expectStatus(201)
        .expectJsonMatch({
          project_id: project,
          template_id: template.json.id,
          title: 'Implement user authentication',
          description: 'Add OAuth2 authentication'
        });
    });

    it('should inherit template values when not overridden', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Template Inheritance Project',
          git_repo_path: '/tmp/template-inheritance'
        })
        .expectStatus(201)
        .returns('id');

      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Bug Fix Template',
          title: 'Fix bug in [component]',
          description: 'Default bug fix description'
        })
        .expectStatus(201);

      // Create task using template without overriding values
      await spec()
        .post('/api/tasks')
        .withJson({
          project_id: project,
          template_id: template.json.id
        })
        .expectStatus(201)
        .expectJsonMatch({
          project_id: project,
          template_id: template.json.id,
          title: 'Fix bug in [component]',
          description: 'Default bug fix description'
        });
    });

    it('should validate template belongs to project when creating task', async () => {
      const project1 = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Project 1',
          git_repo_path: '/tmp/project1-validation'
        })
        .expectStatus(201)
        .returns('id');

      const project2 = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Project 2',
          git_repo_path: '/tmp/project2-validation'
        })
        .expectStatus(201)
        .returns('id');

      // Create template for project 1
      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: project1,
          template_name: 'Project 1 Template',
          title: 'Project 1 Title',
          description: 'Project 1 Description'
        })
        .expectStatus(201);

      // Try to use project 1 template in project 2 task
      await spec()
        .post('/api/tasks')
        .withJson({
          project_id: project2,
          template_id: template.json.id,
          title: 'Task in Project 2',
          description: 'Using wrong template'
        })
        .expectStatus(400)
        .expectJsonMatch({
          error: /template.*not found|template.*project/i
        });
    });

    it('should allow global templates in any project task', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Global Template Usage Project',
          git_repo_path: '/tmp/global-template-usage'
        })
        .expectStatus(201)
        .returns('id');

      // Create global template
      const globalTemplate = await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Global Bug Fix',
          title: 'Global bug fix template',
          description: 'Global description'
        })
        .expectStatus(201);

      // Use global template in project task
      await spec()
        .post('/api/tasks')
        .withJson({
          project_id: project,
          template_id: globalTemplate.json.id,
          title: 'Fix login issue',
          description: 'Fix the login authentication issue'
        })
        .expectStatus(201)
        .expectJsonMatch({
          project_id: project,
          template_id: globalTemplate.json.id,
          title: 'Fix login issue',
          description: 'Fix the login authentication issue'
        });
    });
  });

  describe('Template Cascade Deletion', () => {
    it('should delete project templates when project is deleted', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Cascade Delete Project',
          git_repo_path: '/tmp/cascade-delete'
        })
        .expectStatus(201);

      // Create project templates
      const template1 = await spec()
        .post('/api/templates')
        .withJson({
          project_id: project.json.id,
          template_name: 'Template 1',
          title: 'Title 1',
          description: 'Description 1'
        })
        .expectStatus(201);

      const template2 = await spec()
        .post('/api/templates')
        .withJson({
          project_id: project.json.id,
          template_name: 'Template 2',
          title: 'Title 2',
          description: 'Description 2'
        })
        .expectStatus(201);

      // Delete project
      await spec()
        .delete(`/api/projects/${project.json.id}`)
        .expectStatus(204);

      // Verify templates are deleted
      await spec()
        .get(`/api/templates/${template1.json.id}`)
        .expectStatus(404);

      await spec()
        .get(`/api/templates/${template2.json.id}`)
        .expectStatus(404);
    });

    it('should handle task template_id when template is deleted', async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Template Deletion Project',
          git_repo_path: '/tmp/template-deletion'
        })
        .expectStatus(201)
        .returns('id');

      const template = await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Deletable Template',
          title: 'Will be deleted',
          description: 'This template will be deleted'
        })
        .expectStatus(201);

      // Create task using template
      const task = await spec()
        .post('/api/tasks')
        .withJson({
          project_id: project,
          template_id: template.json.id,
          title: 'Task using template',
          description: 'Task description'
        })
        .expectStatus(201);

      // Delete template
      await spec()
        .delete(`/api/templates/${template.json.id}`)
        .expectStatus(204);

      // Task should still exist but template_id should be null
      await spec()
        .get(`/api/tasks/${task.json.id}`)
        .expectStatus(200)
        .expectJsonMatch({
          id: task.json.id,
          template_id: null,
          title: 'Task using template',
          description: 'Task description'
        });
    });
  });

  describe('Template Search and Filtering', () => {
    beforeEach(async () => {
      const project = await spec()
        .post('/api/projects')
        .withJson({
          name: 'Search Test Project',
          git_repo_path: '/tmp/search-test'
        })
        .expectStatus(201)
        .returns('id');

      // Create various templates for testing
      await spec()
        .post('/api/templates')
        .withJson({
          project_id: null,
          template_name: 'Bug Fix Global',
          title: 'Fix bugs globally',
          description: 'Global bug fixing template',
          tags: ['bug', 'global']
        })
        .expectStatus(201);

      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Feature Development',
          title: 'Develop new features',
          description: 'Project-specific feature development',
          tags: ['feature', 'development']
        })
        .expectStatus(201);

      await spec()
        .post('/api/templates')
        .withJson({
          project_id: project,
          template_name: 'Bug Fix Project',
          title: 'Fix project bugs',
          description: 'Project-specific bug fixing',
          tags: ['bug', 'project']
        })
        .expectStatus(201);
    });

    it('should filter templates by project correctly', async () => {
      const projects = await spec()
        .get('/api/projects')
        .expectStatus(200);

      const project = projects.json.find((p: any) => p.name === 'Search Test Project');

      const projectTemplates = await spec()
        .get(`/api/templates/project/${project.id}`)
        .expectStatus(200);

      expect(projectTemplates.json).toHaveLength(2);
      const names = projectTemplates.json.map((t: any) => t.template_name);
      expect(names).toContain('Feature Development');
      expect(names).toContain('Bug Fix Project');
      expect(names).not.toContain('Bug Fix Global');
    });

    it('should filter global templates correctly', async () => {
      const globalTemplates = await spec()
        .get('/api/templates/global')
        .expectStatus(200);

      expect(globalTemplates.json.length).toBeGreaterThan(0);
      const names = globalTemplates.json.map((t: any) => t.template_name);
      expect(names).toContain('Bug Fix Global');
    });
  });
});