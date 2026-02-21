import { Router } from 'express';
import { getDatabaseService } from '../services/database';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';
import { asyncHandler, throwNotFound, throwBadRequest } from '../middleware/error-handler';
import { parsePagination } from '../middleware/pagination';
import { createDataResponse, createCollectionResponse } from '../utils/api-response';
import { AgentType } from '../types/generated/prisma-enums';

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  gitRepoPath: z.string().min(1, 'Git repository path is required'),
  agentType: z.enum([
    AgentType.CLAUDE_CODE,
    AgentType.OPENAI_CODEX,
    AgentType.OPENAI_O1,
    AgentType.ANTHROPIC_API,
    AgentType.CUSTOM,
  ]).default(AgentType.CLAUDE_CODE),
  setupScript: z.string().default(''),
  devScript: z.string().default(''),
  cleanupScript: z.string().default(''),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  gitRepoPath: z.string().min(1).optional(),
  agentType: z.enum([
    AgentType.CLAUDE_CODE,
    AgentType.OPENAI_CODEX,
    AgentType.OPENAI_O1,
    AgentType.ANTHROPIC_API,
    AgentType.CUSTOM,
  ]).optional(),
  setupScript: z.string().optional(),
  devScript: z.string().optional(),
  cleanupScript: z.string().optional(),
});

// GET /api/projects - List all projects
router.get(
  '/',
  parsePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabaseService();
    const { page, perPage, offset } = req.pagination;

    const [projects, total] = await Promise.all([
      db.project.findMany({
        skip: offset,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { tasks: true, taskTemplates: true },
          },
        },
      }),
      db.project.count(),
    ]);

    res.json(createCollectionResponse(projects, total, page, perPage, req.baseUrl));
  })
);

// GET /api/projects/:id - Get project by ID
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = getDatabaseService();
    const project = await db.project.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { tasks: true, taskTemplates: true },
        },
      },
    });

    if (!project) {
      throwNotFound('Project not found');
    }

    res.json(createDataResponse(project));
  })
);

// POST /api/projects - Create new project
router.post(
  '/',
  validateRequest(createProjectSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabaseService();
    const data = req.body;

    // Check if git repo path already exists
    const existing = await db.project.findUnique({
      where: { gitRepoPath: data.gitRepoPath },
    });

    if (existing) {
      throwBadRequest('A project with this git repository path already exists');
    }

    const project = await db.project.create({
      data: {
        name: data.name,
        description: data.description,
        gitRepoPath: data.gitRepoPath,
        agentType: data.agentType || AgentType.CLAUDE_CODE,
        setupScript: data.setupScript || '',
        devScript: data.devScript || '',
        cleanupScript: data.cleanupScript || '',
      },
    });

    res.status(201).json(createDataResponse(project));
  })
);

// PATCH /api/projects/:id - Update project
router.patch(
  '/:id',
  validateRequest(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabaseService();
    const { id } = req.params;
    const data = req.body;

    // Check if project exists
    const existing = await db.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throwNotFound('Project not found');
      return; // TypeScript doesn't know throwNotFound never returns
    }

    // If updating gitRepoPath, check for duplicates
    if (data.gitRepoPath && data.gitRepoPath !== existing.gitRepoPath) {
      const duplicate = await db.project.findUnique({
        where: { gitRepoPath: data.gitRepoPath },
      });

      if (duplicate) {
        throwBadRequest('A project with this git repository path already exists');
      }
    }

    const project = await db.project.update({
      where: { id },
      data,
    });

    res.json(createDataResponse(project));
  })
);

// DELETE /api/projects/:id - Delete project
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = getDatabaseService();
    const { id } = req.params;

    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      throwNotFound('Project not found');
    }

    await db.project.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

export default router;
