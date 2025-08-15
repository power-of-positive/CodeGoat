import { Router } from 'express';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { WebSocketService } from '../services/websocket.service';
import { WorktreeExecutionService } from '../services/worktree-execution.service';
import {
  handleListTasks,
  handleCreateTask,
  handleCreateAndStartTask,
  handleGetTask,
  handleUpdateTask,
  handleDeleteTask,
} from './kanban-tasks-handlers';

/**
 * Create tasks API routes for Kanban system
 */
export function createKanbanTasksRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger,
  webSocketService: WebSocketService,
  worktreeExecutionService?: WorktreeExecutionService
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();
  
  // Create dependencies object for handlers
  const dependencies = {
    prisma,
    logger,
    webSocketService,
    worktreeExecutionService,
  };

  // Route definitions with extracted handlers
  router.get('/projects/:id/tasks', (req, res) => 
    handleListTasks(req, res, dependencies)
  );

  router.post('/projects/:id/tasks', (req, res) => 
    handleCreateTask(req, res, dependencies)
  );

  router.post('/tasks/create-and-start', (req, res) => 
    handleCreateAndStartTask(req, res, dependencies)
  );

  router.get('/projects/:project_id/tasks/:task_id', (req, res) => 
    handleGetTask(req, res, dependencies)
  );

  router.put('/projects/:project_id/tasks/:task_id', (req, res) => 
    handleUpdateTask(req, res, dependencies)
  );

  router.delete('/projects/:project_id/tasks/:task_id', (req, res) => 
    handleDeleteTask(req, res, dependencies)
  );

  return router;
}
