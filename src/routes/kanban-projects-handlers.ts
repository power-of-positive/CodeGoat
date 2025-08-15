/**
 * Route handlers for kanban projects API
 * Extracted from kanban-projects.ts to reduce complexity
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '../logger-interface';
import {
  ApiResponse,
  Project,
  ProjectWithBranch,
  GitBranch,
  SearchResult,
} from '../types/kanban.types';
import { mapPrismaProjectToApi } from '../utils/kanban-mappers';
import { getCurrentBranch, getGitBranches } from '../utils/git-utils';
import { searchFiles, isValidGitRepository } from '../utils/file-utils';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createInvalidIdResponse,
  handleCreateProjectError,
} from '../utils/response-utils';
import { z } from 'zod';
// Validation schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  git_repo_path: z.string().min(1, 'Git repository path is required'),
  use_existing_repo: z.boolean(),
  setup_script: z.string().optional(),
  dev_script: z.string().optional(),
  cleanup_script: z.string().optional(),
});
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  git_repo_path: z.string().min(1).optional(),
  setup_script: z.string().optional(),
  dev_script: z.string().optional(),
  cleanup_script: z.string().optional(),
});
export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Query parameter is required'),
});
interface HandlerDependencies {
  prisma: PrismaClient;
  logger: ILogger;
}
/**
 * Handler for GET /projects - List all projects
 */
export async function handleListProjects(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    const projectsWithBranch = await getProjectsWithBranches(projects, logger);
    const response = createSuccessResponse(projectsWithBranch);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to list projects', error as Error);
    const response = createErrorResponse('Failed to retrieve projects');
    res.status(500).json(response);
  }
}
/**
 * Handler for POST /projects - Create new project
 */
export async function handleCreateProject(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const validation = CreateProjectSchema.safeParse(req.body);
    if (!validation.success) {
      const response = createValidationErrorResponse(validation.error);
      res.status(400).json(response);
      return;
    }
    const projectData = validation.data;
    const validationError = await validateProjectData(projectData);
    
    if (validationError) {
      res.status(400).json(validationError);
      return;
    }
    const newProject = await createProjectInDatabase(prisma, projectData);
    const response = createSuccessResponse(newProject, 'Project created successfully');
    res.status(201).json(response);
  } catch (error) {
    logger.error('Failed to create project', error as Error);
    const response = handleCreateProjectError(error);
    res.status(400).json(response);
  }
}
/**
 * Handler for GET /projects/:id - Get project by ID
 */
export async function handleGetProject(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const { id } = req.params;
    // Validate ID is a valid UUID
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      const response = createInvalidIdResponse('project');
      res.status(400).json(response);
      return;
    }
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      const response = createNotFoundResponse('Project');
      res.status(404).json(response);
      return;
    }
    const apiProject = mapPrismaProjectToApi(project);
    const response = createSuccessResponse(apiProject);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get project', error as Error);
    const response = createErrorResponse('Failed to retrieve project');
    res.status(500).json(response);
  }
}
/**
 * Handler for PUT /projects/:id - Update project
 */
export async function handleUpdateProject(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const validationResult = validateUpdateProjectRequest(req);
    if (validationResult) {
      res.status(400).json(validationResult);
      return;
    }
    const { id } = req.params;
    const updateData = UpdateProjectSchema.parse(req.body);
    
    // Check if project exists first
    const existingProject = await prisma.project.findUnique({ where: { id } });
    if (!existingProject) {
      const response = createNotFoundResponse('Project');
      res.status(404).json(response);
      return;
    }
    const updatedProject = await updateProjectInDatabase(prisma, id, updateData);
    const response = createSuccessResponse(updatedProject, 'Project updated successfully');
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to update project', error as Error);
    const response = createErrorResponse('Failed to update project');
    res.status(500).json(response);
  }
}
/**
 * Handler for DELETE /projects/:id - Delete project
 */
export async function handleDeleteProject(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const { id } = req.params;
    // Validate ID is a valid UUID
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      const response = createInvalidIdResponse('project');
      res.status(400).json(response);
      return;
    }
    // Check if project exists first
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });
    if (!existingProject) {
      const response = createNotFoundResponse('Project');
      res.status(404).json(response);
      return;
    }
    await prisma.project.delete({
      where: { id },
    });
    const response = createSuccessResponse(null, 'Project deleted successfully');
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to delete project', error as Error);
    const response = createErrorResponse('Failed to delete project');
    res.status(500).json(response);
  }
}
/**
 * Handler for GET /projects/:id/branches - Get git branches for project
 */
export async function handleGetProjectBranches(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const { id } = req.params;
    // Validate ID is a valid UUID
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      const response = createInvalidIdResponse('project');
      res.status(400).json(response);
      return;
    }
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      const response = createNotFoundResponse<GitBranch[]>('Project');
      res.status(404).json(response);
      return;
    }
    const branches = await getGitBranches(project.gitRepoPath);
    const response = createSuccessResponse(branches);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get git branches', error as Error);
    const response = createErrorResponse<GitBranch[]>('Failed to retrieve git branches');
    res.status(500).json(response);
  }
}
/**
 * Handler for GET /projects/:id/search - Search files in project
 */
export async function handleSearchProjectFiles(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const validationResult = validateSearchRequest(req);
    if (validationResult) {
      res.status(400).json(validationResult);
      return;
    }
    const { id } = req.params;
    const { q } = SearchQuerySchema.parse(req.query);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      const response = createNotFoundResponse<SearchResult[]>('Project');
      res.status(404).json(response);
      return;
    }
    const results = await searchFiles(project.gitRepoPath, q);
    const response = createSuccessResponse(results);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to search files', error as Error);
    const response = createErrorResponse<SearchResult[]>('Failed to search files');
    res.status(500).json(response);
  }
}
// Helper functions
/**
 * Get projects with current branch information
 */
async function getProjectsWithBranches(
  projects: any[],
  logger: ILogger
): Promise<ProjectWithBranch[]> {
  const projectsWithBranch: ProjectWithBranch[] = [];
  for (const project of projects) {
    const apiProject = mapPrismaProjectToApi(project);
    const currentBranch = await getCurrentBranchSafely(project, logger);
    
    projectsWithBranch.push({
      ...apiProject,
      current_branch: currentBranch,
    });
  }
  return projectsWithBranch;
}
/**
 * Safely get current branch for a project
 */
async function getCurrentBranchSafely(
  project: any,
  logger: ILogger
): Promise<string | undefined> {
  try {
    if (isValidGitRepository(project.gitRepoPath)) {
      return await getCurrentBranch(project.gitRepoPath);
    }
  } catch (error) {
    logger?.warn?.(`Failed to get current branch for project ${project.id}`, {
      error: error as Error,
      projectId: project.id,
    });
  }
  return undefined;
}
/**
 * Validate project data for creation
 */
async function validateProjectData(projectData: any): Promise<ApiResponse<Project> | null> {
  if (projectData.use_existing_repo) {
    if (!isValidGitRepository(projectData.git_repo_path)) {
      return createErrorResponse('Directory does not exist or is not a git repository');
    }
  }
  return null;
}
/**
 * Create project in database
 */
async function createProjectInDatabase(prisma: PrismaClient, projectData: any): Promise<Project> {
  const newProject = await prisma.project.create({
    data: {
      name: projectData.name,
      gitRepoPath: projectData.git_repo_path,
      setupScript: projectData.setup_script || '',
      devScript: projectData.dev_script || '',
      cleanupScript: projectData.cleanup_script || '',
    },
  });
  return mapPrismaProjectToApi(newProject);
}
/**
 * Update project in database
 */
async function updateProjectInDatabase(
  prisma: PrismaClient,
  projectId: string,
  updateData: any
): Promise<Project> {
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.git_repo_path && { gitRepoPath: updateData.git_repo_path }),
      ...(updateData.setup_script !== undefined && { setupScript: updateData.setup_script }),
      ...(updateData.dev_script !== undefined && { devScript: updateData.dev_script }),
      ...(updateData.cleanup_script !== undefined && { cleanupScript: updateData.cleanup_script }),
    },
  });
  return mapPrismaProjectToApi(updatedProject);
}
// Additional validation helper functions
/**
 * Validate update project request parameters and body
 */
function validateUpdateProjectRequest(req: Request): ApiResponse<null> | null {
  const { id } = req.params;
  
  const idValidation = z.string().uuid().safeParse(id);
  if (!idValidation.success) {
    return createInvalidIdResponse('project');
  }
  const validation = UpdateProjectSchema.safeParse(req.body);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }
  return null;
}
/**
 * Validate search request parameters
 */
function validateSearchRequest(req: Request): ApiResponse<null> | null {
  const { id } = req.params;
  
  const idValidation = z.string().uuid().safeParse(id);
  if (!idValidation.success) {
    return createInvalidIdResponse('project');
  }
  const validation = SearchQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return createErrorResponse('Query parameter is required');
  }
  return null;
}