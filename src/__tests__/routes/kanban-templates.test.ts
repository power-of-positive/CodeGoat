import request from 'supertest';
import express from 'express';
import { createKanbanTemplatesRoutes } from '../../routes/kanban-templates';
import { KanbanDatabaseService } from '../../services/kanban-database.service';
import { ILogger } from '../../logger-interface';

// Mock dependencies
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  middleware: jest.fn().mockReturnValue(jest.fn()),
};

const mockPrisma = {
  taskTemplate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
};

const mockKanbanDb: KanbanDatabaseService = {
  getClient: jest.fn().mockReturnValue(mockPrisma),
} as any;

describe('Templates Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', createKanbanTemplatesRoutes(mockKanbanDb, mockLogger));
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /templates', () => {
    const mockTemplates = [
      {
        id: 'template-1',
        projectId: null,
        templateName: 'Global Template',
        title: 'Global Test Template',
        description: 'A global template for testing',
        defaultPrompt: 'Test prompt',
        tags: null,
        estimatedHours: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        project: null,
      },
      {
        id: 'template-2',
        projectId: 'project-1',
        templateName: 'Project Template',
        title: 'Project Test Template',
        description: 'A project template for testing',
        defaultPrompt: 'Project test prompt',
        tags: '["test", "template"]',
        estimatedHours: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        project: { id: 'project-1', name: 'Test Project' },
      },
    ];

    it('should list all templates when no filters are provided', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue(mockTemplates);

      const response = await request(app).get('/api/templates');

      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [
          { projectId: 'asc' },
          { templateName: 'asc' },
        ],
        include: {
          project: true,
        },
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'template-1',
            template_name: 'Global Template',
          }),
          expect.objectContaining({
            id: 'template-2',
            project_id: 'project-1',
            template_name: 'Project Template',
          }),
        ]),
        error_data: null,
        message: null,
      });
    });

    it('should filter global templates when global=true', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([mockTemplates[0]]);

      const response = await request(app).get('/api/templates?global=true');

      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: { projectId: null },
        orderBy: [
          { projectId: 'asc' },
          { templateName: 'asc' },
        ],
        include: {
          project: true,
        },
      });
      expect(response.status).toBe(200);
    });

    it('should filter by project_id when provided', async () => {
      const projectId = '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce';
      mockPrisma.project.findUnique.mockResolvedValue({ id: projectId, name: 'Test Project' });
      mockPrisma.taskTemplate.findMany.mockResolvedValue([mockTemplates[1]]);

      const response = await request(app).get(`/api/templates?project_id=${projectId}`);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { projectId: null },
            { projectId: projectId },
          ],
        },
        orderBy: [
          { projectId: 'asc' },
          { templateName: 'asc' },
        ],
        include: {
          project: true,
        },
      });
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid project_id format', async () => {
      const response = await request(app).get('/api/templates?project_id=invalid-id');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        data: null,
        error_data: null,
        message: 'Invalid project ID format',
      });
    });

    it('should return 404 when project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/templates?project_id=780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        data: null,
        error_data: null,
        message: 'Project not found',
      });
    });
  });

  describe('POST /templates', () => {
    const validTemplateData = {
      project_id: null,
      template_name: 'Test Template',
      title: 'Test Template Title',
      description: 'Test template description',
      default_prompt: 'Test prompt',
      tags: ['test', 'template'],
      estimated_hours: 2,
    };

    it('should create a global template successfully', async () => {
      const createdTemplate = {
        id: 'template-1',
        projectId: null,
        templateName: 'Test Template',
        title: 'Test Template Title',
        description: 'Test template description',
        defaultPrompt: 'Test prompt',
        tags: '["test", "template"]',
        estimatedHours: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: null,
      };

      mockPrisma.taskTemplate.findFirst.mockResolvedValue(null); // No duplicate
      mockPrisma.taskTemplate.create.mockResolvedValue(createdTemplate);

      const response = await request(app)
        .post('/api/templates')
        .send(validTemplateData);

      expect(mockPrisma.taskTemplate.create).toHaveBeenCalledWith({
        data: {
          projectId: null,
          templateName: 'Test Template',
          title: 'Test Template Title',
          description: 'Test template description',
          defaultPrompt: 'Test prompt',
          tags: '["test","template"]',
          estimatedHours: 2,
        },
        include: {
          project: true,
        },
      });
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'template-1',
          template_name: 'Test Template',
        }),
        error_data: null,
        message: 'Template created successfully',
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          title: 'Test Template Title',
          // Missing template_name
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        data: null,
        error_data: null,
        message: expect.stringContaining('template_name'),
      });
    });

    it('should return 409 for duplicate template name', async () => {
      mockPrisma.taskTemplate.findFirst.mockResolvedValue({
        id: 'existing-template',
        templateName: 'Test Template',
      });

      const response = await request(app)
        .post('/api/templates')
        .send(validTemplateData);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        data: null,
        error_data: null,
        message: 'Global template name already exists',
      });
    });
  });

  describe('GET /templates/:id', () => {
    it('should get template by id successfully', async () => {
      const mockTemplate = {
        id: '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce',
        projectId: null,
        templateName: 'Test Template',
        title: 'Test Template Title',
        description: 'Test template description',
        defaultPrompt: 'Test prompt',
        tags: null,
        estimatedHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: null,
      };

      mockPrisma.taskTemplate.findUnique.mockResolvedValue(mockTemplate);

      const response = await request(app).get('/api/templates/780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce');

      expect(mockPrisma.taskTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce' },
        include: {
          project: true,
        },
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce',
          template_name: 'Test Template',
        }),
        error_data: null,
        message: null,
      });
    });

    it('should return 404 when template not found', async () => {
      mockPrisma.taskTemplate.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/templates/780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        data: null,
        error_data: null,
        message: 'Template not found',
      });
    });
  });

  describe('DELETE /templates/:id', () => {
    it('should delete template successfully when not in use', async () => {
      const mockTemplate = {
        id: '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce',
        templateName: 'Test Template',
        _count: { tasks: 0 },
      };

      mockPrisma.taskTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.taskTemplate.delete.mockResolvedValue(mockTemplate);

      const response = await request(app).delete('/api/templates/780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce');

      expect(mockPrisma.taskTemplate.delete).toHaveBeenCalledWith({
        where: { id: '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce' },
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: null,
        error_data: null,
        message: 'Template deleted successfully',
      });
    });

    it('should return 409 when template is in use by tasks', async () => {
      const mockTemplate = {
        id: '780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce',
        templateName: 'Test Template',
        _count: { tasks: 3 },
      };

      mockPrisma.taskTemplate.findUnique.mockResolvedValue(mockTemplate);

      const response = await request(app).delete('/api/templates/780e3e9a-c4d7-4cdd-913a-8f3d1f6e45ce');

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        data: null,
        error_data: null,
        message: 'Cannot delete template: 3 task(s) are using this template',
      });
    });
  });
});