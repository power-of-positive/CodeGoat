import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/kanban.types';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { mapPrismaTaskTemplateToApi } from '../utils/kanban-mappers';
import { z } from 'zod';

// Validation schemas
const CreateTaskTemplateSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  template_name: z.string().min(1, 'Template name is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  default_prompt: z.string().optional().default(''),
  tags: z.array(z.string()).optional().nullable(),
  estimated_hours: z.number().int().positive().optional().nullable(),
});

const UpdateTaskTemplateSchema = z.object({
  template_name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  default_prompt: z.string().optional(),
  tags: z.array(z.string()).optional().nullable(),
  estimated_hours: z.number().int().positive().optional().nullable(),
});

// Helper functions
function createErrorResponse<T>(message: string): ApiResponse<T> {
  return {
    success: false,
    data: null,
    error_data: null,
    message,
  };
}

function createSuccessResponse<T>(data: T, message: string | null = null): ApiResponse<T> {
  return {
    success: true,
    data,
    error_data: null,
    message,
  };
}

/**
 * Create task templates API routes for Kanban system
 */
export function createKanbanTemplatesRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();

  /**
   * GET /templates - List all templates (global and project-specific)
   * Query parameters:
   * - global: boolean (only return global templates)
   * - project_id: string (only return templates for specific project)
   */
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const { global, project_id } = req.query;

      // Build where clause based on query parameters
      let whereClause: any = {};

      if (global === 'true') {
        // Only global templates
        whereClause.projectId = null;
      } else if (project_id && typeof project_id === 'string') {
        // Validate project_id format
        const validation = z.string().uuid().safeParse(project_id);
        if (!validation.success) {
          return res.status(400).json(createErrorResponse('Invalid project ID format'));
        }

        // Check if project exists
        const project = await prisma.project.findUnique({ where: { id: project_id } });
        if (!project) {
          return res.status(404).json(createErrorResponse('Project not found'));
        }

        // Templates for specific project (both global and project-specific)
        whereClause = {
          OR: [
            { projectId: null }, // Global templates
            { projectId: project_id }, // Project-specific templates
          ],
        };
      }
      // If no filters, return all templates

      const templates = await prisma.taskTemplate.findMany({
        where: whereClause,
        orderBy: [
          { projectId: 'asc' }, // Global first (null values first in SQLite)
          { templateName: 'asc' },
        ],
        include: {
          project: true,
        },
      });

      const apiTemplates = templates.map(mapPrismaTaskTemplateToApi);

      return res.status(200).json(createSuccessResponse(apiTemplates));
    } catch (error) {
      logger.error('Failed to list templates', error as Error);
      return res.status(500).json(createErrorResponse('Failed to retrieve templates'));
    }
  });

  /**
   * GET /templates/:id - Get a specific template by ID
   */
  router.get('/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const validation = z.string().uuid().safeParse(id);
      if (!validation.success) {
        return res.status(400).json(createErrorResponse('Invalid template ID format'));
      }

      const template = await prisma.taskTemplate.findUnique({
        where: { id },
        include: {
          project: true,
        },
      });

      if (!template) {
        return res.status(404).json(createErrorResponse('Template not found'));
      }

      const apiTemplate = mapPrismaTaskTemplateToApi(template);

      return res.status(200).json(createSuccessResponse(apiTemplate));
    } catch (error) {
      logger.error(`Failed to get template ${req.params.id}`, error as Error);
      return res.status(500).json(createErrorResponse('Failed to retrieve template'));
    }
  });

  /**
   * POST /templates - Create a new template
   */
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const validation = CreateTaskTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessage = validation.error.issues
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return res.status(400).json(createErrorResponse(errorMessage));
      }

      const {
        project_id,
        template_name,
        title,
        description,
        default_prompt,
        tags,
        estimated_hours,
      } = validation.data;

      // If project_id is provided, verify the project exists
      if (project_id) {
        const project = await prisma.project.findUnique({ where: { id: project_id } });
        if (!project) {
          return res.status(404).json(createErrorResponse('Project not found'));
        }

        // Check for duplicate template name within project
        const existingTemplate = await prisma.taskTemplate.findFirst({
          where: {
            projectId: project_id,
            templateName: template_name,
          },
        });

        if (existingTemplate) {
          return res.status(409).json(createErrorResponse('Template name already exists in this project'));
        }
      } else {
        // Check for duplicate global template name
        const existingTemplate = await prisma.taskTemplate.findFirst({
          where: {
            projectId: null,
            templateName: template_name,
          },
        });

        if (existingTemplate) {
          return res.status(409).json(createErrorResponse('Global template name already exists'));
        }
      }

      const template = await prisma.taskTemplate.create({
        data: {
          projectId: project_id || null,
          templateName: template_name,
          title,
          description: description || null,
          defaultPrompt: default_prompt || '',
          tags: tags ? JSON.stringify(tags) : null,
          estimatedHours: estimated_hours || null,
        },
        include: {
          project: true,
        },
      });

      const apiTemplate = mapPrismaTaskTemplateToApi(template);

      return res.status(201).json(createSuccessResponse(apiTemplate, 'Template created successfully'));
    } catch (error) {
      logger.error('Failed to create template', error as Error);
      return res.status(500).json(createErrorResponse('Failed to create template'));
    }
  });

  /**
   * PUT /templates/:id - Update an existing template
   */
  router.put('/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const idValidation = z.string().uuid().safeParse(id);
      if (!idValidation.success) {
        return res.status(400).json(createErrorResponse('Invalid template ID format'));
      }

      const validation = UpdateTaskTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessage = validation.error.issues
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return res.status(400).json(createErrorResponse(errorMessage));
      }

      // Check if template exists
      const existingTemplate = await prisma.taskTemplate.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!existingTemplate) {
        return res.status(404).json(createErrorResponse('Template not found'));
      }

      const {
        template_name,
        title,
        description,
        default_prompt,
        tags,
        estimated_hours,
      } = validation.data;

      // Check for duplicate template name if template_name is being updated
      if (template_name && template_name !== existingTemplate.templateName) {
        const duplicateTemplate = await prisma.taskTemplate.findFirst({
          where: {
            projectId: existingTemplate.projectId,
            templateName: template_name,
            id: { not: id }, // Exclude current template
          },
        });

        if (duplicateTemplate) {
          const scope = existingTemplate.projectId ? 'project' : 'global';
          return res.status(409).json(createErrorResponse(`Template name already exists in this ${scope}`));
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (template_name !== undefined) updateData.templateName = template_name;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (default_prompt !== undefined) updateData.defaultPrompt = default_prompt;
      if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;
      if (estimated_hours !== undefined) updateData.estimatedHours = estimated_hours;

      const updatedTemplate = await prisma.taskTemplate.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
        },
      });

      const apiTemplate = mapPrismaTaskTemplateToApi(updatedTemplate);

      return res.status(200).json(createSuccessResponse(apiTemplate, 'Template updated successfully'));
    } catch (error) {
      logger.error(`Failed to update template ${req.params.id}`, error as Error);
      return res.status(500).json(createErrorResponse('Failed to update template'));
    }
  });

  /**
   * DELETE /templates/:id - Delete a template
   */
  router.delete('/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const validation = z.string().uuid().safeParse(id);
      if (!validation.success) {
        return res.status(400).json(createErrorResponse('Invalid template ID format'));
      }

      // Check if template exists and get associated tasks count
      const template = await prisma.taskTemplate.findUnique({
        where: { id },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });

      if (!template) {
        return res.status(404).json(createErrorResponse('Template not found'));
      }

      // Check if template is being used by tasks
      if (template._count.tasks > 0) {
        return res.status(409).json(
          createErrorResponse(`Cannot delete template: ${template._count.tasks} task(s) are using this template`)
        );
      }

      await prisma.taskTemplate.delete({
        where: { id },
      });

      return res.status(200).json(createSuccessResponse(null, 'Template deleted successfully'));
    } catch (error) {
      logger.error(`Failed to delete template ${req.params.id}`, error as Error);
      return res.status(500).json(createErrorResponse('Failed to delete template'));
    }
  });

  /**
   * POST /templates/:id/duplicate - Duplicate a template
   */
  router.post('/templates/:id/duplicate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { project_id, template_name } = req.body;

      const validation = z.string().uuid().safeParse(id);
      if (!validation.success) {
        return res.status(400).json(createErrorResponse('Invalid template ID format'));
      }

      // Validate request body
      const bodyValidation = z.object({
        project_id: z.string().uuid().optional().nullable(),
        template_name: z.string().min(1, 'Template name is required'),
      }).safeParse(req.body);

      if (!bodyValidation.success) {
        const errorMessage = bodyValidation.error.issues
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return res.status(400).json(createErrorResponse(errorMessage));
      }

      // Get original template
      const originalTemplate = await prisma.taskTemplate.findUnique({
        where: { id },
      });

      if (!originalTemplate) {
        return res.status(404).json(createErrorResponse('Template not found'));
      }

      // If project_id is provided, verify the project exists
      if (project_id) {
        const project = await prisma.project.findUnique({ where: { id: project_id } });
        if (!project) {
          return res.status(404).json(createErrorResponse('Target project not found'));
        }
      }

      // Check for duplicate template name in target scope
      const existingTemplate = await prisma.taskTemplate.findFirst({
        where: {
          projectId: project_id || null,
          templateName: template_name,
        },
      });

      if (existingTemplate) {
        const scope = project_id ? 'target project' : 'global scope';
        return res.status(409).json(createErrorResponse(`Template name already exists in ${scope}`));
      }

      // Create duplicate template
      const duplicatedTemplate = await prisma.taskTemplate.create({
        data: {
          projectId: project_id || null,
          templateName: template_name,
          title: originalTemplate.title,
          description: originalTemplate.description,
          defaultPrompt: originalTemplate.defaultPrompt,
          tags: originalTemplate.tags,
          estimatedHours: originalTemplate.estimatedHours,
        },
        include: {
          project: true,
        },
      });

      const apiTemplate = mapPrismaTaskTemplateToApi(duplicatedTemplate);

      return res.status(201).json(createSuccessResponse(apiTemplate, 'Template duplicated successfully'));
    } catch (error) {
      logger.error(`Failed to duplicate template ${req.params.id}`, error as Error);
      return res.status(500).json(createErrorResponse('Failed to duplicate template'));
    }
  });

  return router;
}