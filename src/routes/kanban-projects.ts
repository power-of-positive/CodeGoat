/**
 * Kanban Projects API Routes
 * Simplified main router using extracted handlers and utilities
 */

import { Router } from 'express';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import {
  handleListProjects,
  handleCreateProject,
  handleGetProject,
  handleUpdateProject,
  handleDeleteProject,
  handleGetProjectBranches,
  handleSearchProjectFiles,
} from './kanban-projects-handlers';

/**
 * Create projects API routes for Kanban system
 * @param kanbanDb - Database service instance
 * @param logger - Logger instance
 * @returns Express router with configured routes
 */
export function createKanbanProjectsRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();
  const dependencies = { prisma, logger };

  // Project CRUD operations
  router.get('/projects', (req, res) => 
    handleListProjects(req, res, dependencies)
  );
  
  router.post('/projects', (req, res) => 
    handleCreateProject(req, res, dependencies)
  );
  
  router.get('/projects/:id', (req, res) => 
    handleGetProject(req, res, dependencies)
  );
  
  router.put('/projects/:id', (req, res) => 
    handleUpdateProject(req, res, dependencies)
  );
  
  router.delete('/projects/:id', (req, res) => 
    handleDeleteProject(req, res, dependencies)
  );

  // Project-related operations
  router.get('/projects/:id/branches', (req, res) => 
    handleGetProjectBranches(req, res, dependencies)
  );
  
  router.get('/projects/:id/search', (req, res) => 
    handleSearchProjectFiles(req, res, dependencies)
  );

  return router;
}