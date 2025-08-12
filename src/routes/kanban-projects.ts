import { Router, Request, Response } from 'express';
import { ApiResponse, Project, GitBranch, SearchResult, ProjectWithBranch } from '../types/kanban.types';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { mapPrismaProjectToApi } from '../utils/kanban-mappers';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  git_repo_path: z.string().min(1, 'Git repository path is required'),
  use_existing_repo: z.boolean(),
  setup_script: z.string().optional(),
  dev_script: z.string().optional(), 
  cleanup_script: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  git_repo_path: z.string().min(1).optional(),
  setup_script: z.string().optional(),
  dev_script: z.string().optional(),
  cleanup_script: z.string().optional(),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Query parameter is required'),
});

/**
 * Create projects API routes for Kanban system
 */
export function createKanbanProjectsRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();

  /**
   * GET /projects - List all projects
   * Returns array of projects with current branch info
   */
  router.get('/projects', async (req: Request, res: Response) => {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      const projectsWithBranch: ProjectWithBranch[] = [];

      // Get current branch for each project
      for (const project of projects) {
        const apiProject = mapPrismaProjectToApi(project);
        let currentBranch: string | undefined;

        try {
          if (fs.existsSync(project.gitRepoPath)) {
            currentBranch = await getCurrentBranch(project.gitRepoPath);
          }
        } catch (error) {
          logger?.warn?.(`Failed to get current branch for project ${project.id}`, {
            error: error as Error,
            projectId: project.id,
          });
        }

        projectsWithBranch.push({
          ...apiProject,
          current_branch: currentBranch,
        });
      }

      const response = {
        success: true,
        data: projectsWithBranch,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to list projects', error as Error);
      
      const response = {
        success: false,
        data: null,
        error_data: null,
        message: 'Failed to retrieve projects',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * POST /projects - Create new project
   * Creates a new project with git repository setup
   */
  router.post('/projects', async (req: Request, res: Response) => {
    try {
      const validation = CreateProjectSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response: ApiResponse<Project> = {
          success: false,
          data: null,
          error_data: null,
                    message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(200).json(response);
      }

      const projectData = validation.data;

      // Check if git repository path exists (for existing repos)
      if (projectData.use_existing_repo) {
        if (!fs.existsSync(projectData.git_repo_path)) {
          const response: ApiResponse<Project> = {
            success: false,
            data: null,
            error_data: null,
                        message: 'Git repository path does not exist',
          };
          
          return res.status(200).json(response);
        }

        // Verify it's a git repository
        const gitDir = path.join(projectData.git_repo_path, '.git');
        if (!fs.existsSync(gitDir)) {
          const response: ApiResponse<Project> = {
            success: false,
            data: null,
            error_data: null,
                        message: 'Directory is not a git repository',
          };
          
          return res.status(200).json(response);
        }
      }

      // Create project in database
      const newProject = await prisma.project.create({
        data: {
          name: projectData.name,
          gitRepoPath: projectData.git_repo_path,
          setupScript: projectData.setup_script || '',
          devScript: projectData.dev_script || '',
          cleanupScript: projectData.cleanup_script || '',
        },
      });

      const apiProject = mapPrismaProjectToApi(newProject);

      const response = {
        success: true,
        data: apiProject,
        message: 'Project created successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to create project', error as Error);
      
      const response: ApiResponse<Project> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to create project',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /projects/:id - Get specific project
   */
  router.get('/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid UUID
      const idValidation = z.string().uuid().safeParse(id);
      if (!idValidation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Invalid project ID format',
        };
        
        return res.status(400).json(response);
      }

      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        const response: ApiResponse<Project> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Project not found',
        };
        
        return res.status(200).json(response);
      }

      const apiProject = mapPrismaProjectToApi(project);

      const response = {
        success: true,
        data: apiProject,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get project', error as Error);
      
      const response: ApiResponse<Project> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to retrieve project',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * PUT /projects/:id - Update project
   */
  router.put('/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = UpdateProjectSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response: ApiResponse<Project> = {
          success: false,
          data: null,
          error_data: null,
                    message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(200).json(response);
      }

      const updateData = validation.data;

      // Check if project exists
      const existingProject = await prisma.project.findUnique({
        where: { id },
      });

      if (!existingProject) {
        const response: ApiResponse<Project> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Project not found',
        };
        
        return res.status(200).json(response);
      }

      // Update project
      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.git_repo_path && { gitRepoPath: updateData.git_repo_path }),
          ...(updateData.setup_script !== undefined && { setupScript: updateData.setup_script }),
          ...(updateData.dev_script !== undefined && { devScript: updateData.dev_script }),
          ...(updateData.cleanup_script !== undefined && { cleanupScript: updateData.cleanup_script }),
        },
      });

      const apiProject = mapPrismaProjectToApi(updatedProject);

      const response = {
        success: true,
        data: apiProject,
        message: 'Project updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to update project', error as Error);
      
      const response: ApiResponse<Project> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to update project',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * DELETE /projects/:id - Delete project and all related data
   */
  router.delete('/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if project exists
      const existingProject = await prisma.project.findUnique({
        where: { id },
      });

      if (!existingProject) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Project not found',
        };
        
        return res.status(200).json(response);
      }

      // Delete project (cascades to tasks and attempts due to schema constraints)
      await prisma.project.delete({
        where: { id },
      });

      const response = {
        success: true,
        data: null,
        message: 'Project deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to delete project', error as Error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to delete project',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /projects/:id/branches - Get git branches for project
   */
  router.get('/projects/:id/branches', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        const response: ApiResponse<GitBranch[]> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Project not found',
        };
        
        return res.status(200).json(response);
      }

      // Get git branches
      const branches = await getGitBranches(project.gitRepoPath);

      const response = {
        success: true,
        data: branches,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get git branches', error as Error);
      
      const response: ApiResponse<GitBranch[]> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to retrieve git branches',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /projects/:id/search - Search files in project
   */
  router.get('/projects/:id/search', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = SearchQuerySchema.safeParse(req.query);
      
      if (!validation.success) {
        const response: ApiResponse<SearchResult[]> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Query parameter is required',
        };
        
        return res.status(200).json(response);
      }

      const { q } = validation.data;

      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        const response: ApiResponse<SearchResult[]> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Project not found',
        };
        
        return res.status(200).json(response);
      }

      // Search files in project directory
      const results = await searchFiles(project.gitRepoPath, q);

      const response = {
        success: true,
        data: results,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to search files', error as Error);
      
      const response: ApiResponse<SearchResult[]> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to search files',
      };
      
      res.status(200).json(response);
    }
  });

  return router;
}

/**
 * Get current git branch
 */
async function getCurrentBranch(repoPath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const git = spawn('git', ['branch', '--show-current'], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';
    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim() || undefined);
      } else {
        resolve(undefined);
      }
    });

    git.on('error', () => {
      resolve(undefined);
    });
  });
}

/**
 * Get all git branches for a repository
 */
async function getGitBranches(repoPath: string): Promise<GitBranch[]> {
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['branch', '-a', '--format=%(refname:short),%(HEAD),%(upstream:short),%(committerdate)'], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        const branches: GitBranch[] = [];
        const lines = output.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 4) {
            const name = parts[0].replace('origin/', '');
            const isCurrent = parts[1] === '*';
            const isRemote = parts[0].startsWith('origin/');
            const dateStr = parts[3];

            // Skip remote HEAD references
            if (name === 'HEAD') continue;
            if (name.includes('->')) continue;

            branches.push({
              name,
              is_current: isCurrent,
              is_remote: isRemote,
              last_commit_date: new Date(dateStr || new Date()),
            });
          }
        }

        // Remove duplicates (local and remote versions of same branch)
        const uniqueBranches = branches.reduce((acc: GitBranch[], branch) => {
          const existing = acc.find(b => b.name === branch.name);
          if (!existing) {
            acc.push(branch);
          } else if (branch.is_current) {
            // Prefer current branch info
            const index = acc.findIndex(b => b.name === branch.name);
            acc[index] = branch;
          }
          return acc;
        }, []);

        resolve(uniqueBranches);
      } else {
        reject(new Error(`Git command failed: ${errorOutput}`));
      }
    });

    git.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Search for files and directories in project
 */
async function searchFiles(projectPath: string, query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const maxResults = 100;

  async function searchRecursively(currentPath: string, relativePath: string = ''): Promise<void> {
    if (results.length >= maxResults) return;

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
        if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === 'dist') continue;

        const fullPath = path.join(currentPath, entry.name);
        const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        // Check for matches
        const nameMatch = entry.name.toLowerCase().includes(query.toLowerCase());
        const pathMatch = entryRelativePath.toLowerCase().includes(query.toLowerCase());

        if (nameMatch || pathMatch) {
          let matchType: 'FileName' | 'DirectoryName' | 'FullPath' = 'FullPath';
          
          if (nameMatch) {
            matchType = entry.isDirectory() ? 'DirectoryName' : 'FileName';
          }

          results.push({
            path: entryRelativePath,
            is_file: entry.isFile(),
            match_type: matchType,
          });
        }

        // Recursively search directories
        if (entry.isDirectory() && results.length < maxResults) {
          await searchRecursively(fullPath, entryRelativePath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await searchRecursively(projectPath);
  return results;
}