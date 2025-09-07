import request from 'supertest';
import express from 'express';
import { createTaskRoutes } from '../../routes/tasks';
import { getDatabaseService } from '../../services/database';
import { TaskStatus, Priority, TaskType, BDDScenarioStatus } from '@prisma/client';
import { createMockLogger } from '../../test-helpers/logger.mock';
import type { ILogger } from '../../logger-interface';

// Mock the database service
jest.mock('../../services/database');

const mockDb = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  bDDScenario: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  bDDScenarioExecution: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

(getDatabaseService as jest.Mock).mockReturnValue(mockDb);

describe('Tasks Route - Additional Coverage', () => {
  let app: express.Application;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Re-initialize the mock database service
    (getDatabaseService as jest.Mock).mockReturnValue(mockDb);

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    logger = createMockLogger();
    app.use('/api/tasks', createTaskRoutes(logger));

    // Mock ID generation for POST requests
    mockDb.task.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Reset all mock implementations to prevent interference
    jest.resetAllMocks();
  });

  describe('POST /api/tasks - Edge cases', () => {
    it('should create task with in_progress status and set startTime', async () => {
      const newTask = {
        id: 'CODEGOAT-100',
        title: 'Test Task',
        content: 'Test Task',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        taskType: TaskType.TASK,
        executorId: null,
        startTime: new Date(),
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
      };

      mockDb.task.create.mockResolvedValue(newTask);

      const response = await request(app).post('/api/tasks').send({
        content: 'Test Task',
        status: 'in_progress',
        priority: 'medium',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockDb.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          startTime: expect.any(Date),
        }),
      });
    });

    it('should create task with completed status and set timing fields', async () => {
      const completedTask = {
        id: 'CODEGOAT-101',
        title: 'Completed Task',
        content: 'Completed Task',
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
        taskType: TaskType.TASK,
        executorId: null,
        startTime: new Date(),
        endTime: new Date(),
        duration: '0m',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
      };

      mockDb.task.create.mockResolvedValue(completedTask);

      const response = await request(app).post('/api/tasks').send({
        content: 'Completed Task',
        status: 'completed',
        priority: 'high',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockDb.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: TaskStatus.COMPLETED,
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: '0m',
        }),
      });
    });

    it('should handle database errors during task creation', async () => {
      mockDb.task.create.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).post('/api/tasks').send({
        content: 'Test Task',
        status: 'pending',
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create task');
    });

    it('should create task with executorId', async () => {
      const taskWithExecutor = {
        id: 'CODEGOAT-102',
        title: 'Task with executor',
        content: 'Task with executor',
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        taskType: TaskType.TASK,
        executorId: 'executor-123',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
      };

      mockDb.task.create.mockResolvedValue(taskWithExecutor);

      const response = await request(app).post('/api/tasks').send({
        content: 'Task with executor',
        executorId: 'executor-123',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.executorId).toBe('executor-123');
    });

    it('should create story task type', async () => {
      const storyTask = {
        id: 'CODEGOAT-103',
        title: 'User Story',
        content: 'User Story',
        status: TaskStatus.PENDING,
        priority: Priority.HIGH,
        taskType: TaskType.STORY,
        executorId: null,
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
      };

      mockDb.task.create.mockResolvedValue(storyTask);

      const response = await request(app).post('/api/tasks').send({
        content: 'User Story',
        taskType: 'story',
        priority: 'high',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.taskType).toBe('story');
    });
  });

  describe('PUT /api/tasks/:id - Edge cases', () => {
    const baseTask = {
      id: 'CODEGOAT-200',
      title: 'Test Task',
      content: 'Test Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      taskType: TaskType.TASK,
      executorId: null,
      startTime: null,
      endTime: null,
      duration: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: null,
      parentTaskAttempt: null,
      templateId: null,
      tags: null,
      description: null,
    };

    it('should update task content', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockResolvedValue({
        ...baseTask,
        content: 'Updated content',
        title: 'Updated content',
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        content: 'Updated content',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          content: 'Updated content',
          title: 'Updated content',
        }),
      });
    });

    it('should update task priority', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockResolvedValue({
        ...baseTask,
        priority: Priority.HIGH,
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        priority: 'high',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          priority: Priority.HIGH,
        }),
      });
    });

    it('should update task type', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockResolvedValue({
        ...baseTask,
        taskType: TaskType.STORY,
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        taskType: 'story',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          taskType: TaskType.STORY,
        }),
      });
    });

    it('should update executorId', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockResolvedValue({
        ...baseTask,
        executorId: 'new-executor',
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        executorId: 'new-executor',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          executorId: 'new-executor',
        }),
      });
    });

    it('should handle completing task that was never started', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.COMPLETED,
        startTime: new Date(),
        endTime: new Date(),
        duration: '0m',
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        status: 'completed',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          status: TaskStatus.COMPLETED,
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: '0m',
        }),
      });
    });

    it('should handle database errors during update', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        status: 'in_progress',
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to update task');
    }, 10000);

    it('should transition task from pending to in_progress with startTime', async () => {
      mockDb.task.findUnique.mockResolvedValue(baseTask);
      mockDb.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
        startTime: new Date(),
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        status: 'in_progress',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          startTime: expect.any(Date),
        }),
      });
    });

    it('should transition task from in_progress to completed with duration', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const inProgressTask = {
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
        startTime,
      };

      mockDb.task.findUnique.mockResolvedValue(inProgressTask);
      mockDb.task.update.mockResolvedValue({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        endTime: new Date(),
        duration: '30m',
      });

      const response = await request(app).put('/api/tasks/CODEGOAT-200').send({
        status: 'completed',
      });

      expect(response.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-200' },
        data: expect.objectContaining({
          status: TaskStatus.COMPLETED,
          endTime: expect.any(Date),
          duration: expect.any(String),
        }),
      });
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should successfully delete a task', async () => {
      const taskToDelete = {
        id: 'CODEGOAT-300',
        title: 'Task to delete',
        content: 'Task to delete',
        status: TaskStatus.PENDING,
        priority: Priority.LOW,
        taskType: TaskType.TASK,
        executorId: null,
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
      };

      mockDb.task.findUnique.mockResolvedValue(taskToDelete);
      mockDb.task.delete.mockResolvedValue(taskToDelete);

      const response = await request(app).delete('/api/tasks/CODEGOAT-300');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');
      expect(mockDb.task.delete).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-300' },
      });
    });

    it('should return 404 for non-existent task', async () => {
      mockDb.task.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/tasks/NON-EXISTENT').timeout(5000); // Add explicit timeout

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Task not found');
      expect(mockDb.task.delete).not.toHaveBeenCalled();
    }, 10000); // Increase test timeout

    it('should handle database errors during deletion', async () => {
      const task = {
        id: 'CODEGOAT-301',
        title: 'Task',
        content: 'Task',
        status: TaskStatus.PENDING,
        priority: Priority.LOW,
        taskType: TaskType.TASK,
        executorId: null,
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
      };

      mockDb.task.findUnique.mockResolvedValue(task);
      mockDb.task.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/tasks/CODEGOAT-301');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to delete task');
    });
  });

  describe('GET /api/tasks/analytics - Comprehensive tests', () => {
    it('should handle analytics with no tasks', async () => {
      mockDb.task.count.mockResolvedValue(0);
      mockDb.task.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/tasks/analytics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview.totalTasks).toBe(0);
      expect(response.body.data.overview.completionRate).toBe('0');
    });

    it('should calculate correct analytics with tasks', async () => {
      mockDb.task.count.mockImplementation((query: any) => {
        if (!query?.where?.status) {
          return 10;
        } // total
        if (query.where.status === TaskStatus.COMPLETED) {
          return 5;
        }
        if (query.where.status === TaskStatus.IN_PROGRESS) {
          return 3;
        }
        if (query.where.status === TaskStatus.PENDING) {
          return 2;
        }
        if (query.where.priority) {
          if (query.where.priority === Priority.HIGH) {
            return query.where.status === TaskStatus.COMPLETED ? 2 : 3;
          }
          if (query.where.priority === Priority.MEDIUM) {
            return query.where.status === TaskStatus.COMPLETED ? 2 : 4;
          }
          if (query.where.priority === Priority.LOW) {
            return query.where.status === TaskStatus.COMPLETED ? 1 : 3;
          }
        }
        return 0;
      });

      const completedTasks = [
        {
          id: 'CODEGOAT-1',
          title: 'Task 1',
          content: 'Task 1',
          status: TaskStatus.COMPLETED,
          priority: Priority.HIGH,
          taskType: TaskType.TASK,
          executorId: null,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:30:00Z'),
          duration: '30m',
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: null,
          parentTaskAttempt: null,
          templateId: null,
          tags: null,
          description: null,
        },
      ];

      mockDb.task.findMany.mockResolvedValue(completedTasks);

      const response = await request(app).get('/api/tasks/analytics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview.totalTasks).toBe(10);
      expect(response.body.data.overview.completedTasks).toBe(5);
      expect(response.body.data.overview.inProgressTasks).toBe(3);
      expect(response.body.data.overview.pendingTasks).toBe(2);
      expect(response.body.data.overview.completionRate).toBe('50.0');
    });

    it('should handle database errors in analytics', async () => {
      mockDb.task.count.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/tasks/analytics');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch task analytics');
    });
  });

  describe('GET /api/tasks/:id - With related data', () => {
    it('should fetch task with validation runs and BDD scenarios', async () => {
      const taskWithRelations = {
        id: 'CODEGOAT-400',
        title: 'Task with relations',
        content: 'Task with relations',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        taskType: TaskType.STORY,
        executorId: null,
        startTime: new Date(),
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
        validationRuns: [
          {
            id: 'val-1',
            taskId: 'CODEGOAT-400',
            status: 'passed',
            createdAt: new Date(),
          },
        ],
        bddScenarios: [
          {
            id: 'scenario-1',
            title: 'Test scenario',
            feature: 'Feature',
            description: 'Description',
            gherkinContent: 'Given...',
            status: BDDScenarioStatus.PASSED,
            playwrightTestFile: 'test.spec.ts',
            playwrightTestName: 'test',
            taskId: 'CODEGOAT-400',
            createdAt: new Date(),
            updatedAt: new Date(),
            executedAt: new Date(),
            executionDuration: 5000,
            errorMessage: null,
          },
        ],
      };

      mockDb.task.findUnique.mockResolvedValue(taskWithRelations);

      const response = await request(app).get('/api/tasks/CODEGOAT-400');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('CODEGOAT-400');
      expect(response.body.data.validationRuns).toHaveLength(1);
      expect(response.body.data.bddScenarios).toHaveLength(1);
      expect(response.body.data.bddScenarios[0].status).toBe('passed');
    });

    it('should handle database errors when fetching single task', async () => {
      mockDb.task.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/tasks/CODEGOAT-401');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch task');
    });
  });

  describe('GET /api/tasks - List with filters', () => {
    it('should list tasks with default filters', async () => {
      const tasks = [
        {
          id: 'CODEGOAT-500',
          title: 'Task 1',
          content: 'Task 1',
          status: TaskStatus.PENDING,
          priority: Priority.MEDIUM,
          taskType: TaskType.TASK,
          executorId: null,
          startTime: null,
          endTime: null,
          duration: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: null,
          parentTaskAttempt: null,
          templateId: null,
          tags: null,
          description: null,
        },
      ];

      mockDb.task.findMany.mockResolvedValue(tasks);

      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockDb.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ projectId: null }, { id: { startsWith: 'CODEGOAT-' } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should handle database errors when listing tasks', async () => {
      mockDb.task.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch tasks');
    });
  });

  describe('POST /api/tasks/:id/scenarios - BDD Scenario Creation', () => {
    const mockTask = {
      id: 'CODEGOAT-100',
      title: 'Test Task',
      content: 'Test task content',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      taskType: TaskType.STORY,
    };

    it('should create a BDD scenario successfully', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      const mockScenario = {
        id: 'scenario-1',
        taskId: 'CODEGOAT-100',
        title: 'Test Scenario',
        feature: 'User Authentication',
        description: 'Test description',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
        status: BDDScenarioStatus.PENDING,
        executedAt: null,
        executionDuration: null,
        errorMessage: null,
      };
      mockDb.bDDScenario.create.mockResolvedValue(mockScenario);

      const response = await request(app).post('/api/tasks/CODEGOAT-100/scenarios').send({
        title: 'Test Scenario',
        feature: 'User Authentication',
        description: 'Test description',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
        status: 'pending',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'scenario-1',
        title: 'Test Scenario',
        feature: 'User Authentication',
        description: 'Test description',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
        status: 'pending',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/api/tasks/CODEGOAT-100/scenarios').send({
        title: '',
        feature: 'User Authentication',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title, feature, and gherkin content are required');
    });

    it('should return 404 if task does not exist', async () => {
      mockDb.task.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/tasks/NONEXISTENT/scenarios').send({
        title: 'Test Scenario',
        feature: 'User Authentication',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Task not found');
    });

    it('should handle database errors during scenario creation', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/api/tasks/CODEGOAT-100/scenarios').send({
        title: 'Test Scenario',
        feature: 'User Authentication',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create BDD scenario');
    });

    it('should create scenario with default pending status when status not provided', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      const mockScenario = {
        id: 'scenario-1',
        taskId: 'CODEGOAT-100',
        title: 'Test Scenario',
        feature: 'User Authentication',
        description: '',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
        status: BDDScenarioStatus.PENDING,
        executedAt: null,
        executionDuration: null,
        errorMessage: null,
      };
      mockDb.bDDScenario.create.mockResolvedValue(mockScenario);

      const response = await request(app).post('/api/tasks/CODEGOAT-100/scenarios').send({
        title: 'Test Scenario',
        feature: 'User Authentication',
        gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockDb.bDDScenario.create).toHaveBeenCalledWith({
        data: {
          taskId: 'CODEGOAT-100',
          title: 'Test Scenario',
          feature: 'User Authentication',
          description: '',
          gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
          status: BDDScenarioStatus.PENDING,
        },
      });
    });
  });

  describe('PUT /api/tasks/:id/scenarios/:scenarioId - BDD Scenario Updates', () => {
    const mockTask = {
      id: 'CODEGOAT-100',
      title: 'Test Task',
      content: 'Test task content',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      taskType: TaskType.STORY,
    };

    const mockScenario = {
      id: 'scenario-1',
      taskId: 'CODEGOAT-100',
      title: 'Test Scenario',
      feature: 'User Authentication',
      description: 'Test description',
      gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
      status: BDDScenarioStatus.PENDING,
      executedAt: null,
      executionDuration: null,
      errorMessage: null,
    };

    it('should update scenario status successfully', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(mockScenario);
      const updatedScenario = { ...mockScenario, status: BDDScenarioStatus.PASSED };
      mockDb.bDDScenario.update.mockResolvedValue(updatedScenario);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-100/scenarios/scenario-1')
        .send({ status: 'passed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('passed');
    });

    it('should return 404 if task does not exist', async () => {
      mockDb.task.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/tasks/NONEXISTENT/scenarios/scenario-1')
        .send({ status: 'passed' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Task not found');
    });

    it('should return 404 if scenario does not exist', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-100/scenarios/nonexistent')
        .send({ status: 'passed' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Scenario not found');
    });

    it('should update multiple scenario fields', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(mockScenario);
      const updatedScenario = {
        ...mockScenario,
        title: 'Updated Title',
        status: BDDScenarioStatus.PASSED,
        executionDuration: 5000,
        errorMessage: null,
      };
      mockDb.bDDScenario.update.mockResolvedValue(updatedScenario);

      const response = await request(app).put('/api/tasks/CODEGOAT-100/scenarios/scenario-1').send({
        title: 'Updated Title',
        status: 'passed',
        executionDuration: 5000,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.status).toBe('passed');
    });

    it('should handle database errors during scenario update', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(mockScenario);
      mockDb.bDDScenario.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-100/scenarios/scenario-1')
        .send({ status: 'passed' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to update BDD scenario');
    });

    it('should set executedAt timestamp when status changes to passed or failed', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(mockScenario);
      const updatedScenario = {
        ...mockScenario,
        status: BDDScenarioStatus.PASSED,
        executedAt: new Date(),
      };
      mockDb.bDDScenario.update.mockResolvedValue(updatedScenario);

      const response = await request(app).put('/api/tasks/CODEGOAT-100/scenarios/scenario-1').send({
        status: 'passed',
        executedAt: new Date().toISOString(),
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockDb.bDDScenario.update).toHaveBeenCalledWith({
        where: { id: 'scenario-1' },
        data: expect.objectContaining({
          status: BDDScenarioStatus.PASSED,
          executedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('DELETE /api/tasks/:id/scenarios/:scenarioId - BDD Scenario Deletion', () => {
    const mockTask = {
      id: 'CODEGOAT-100',
      title: 'Test Task',
      content: 'Test task content',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      taskType: TaskType.STORY,
    };

    const mockScenario = {
      id: 'scenario-1',
      taskId: 'CODEGOAT-100',
      title: 'Test Scenario',
      feature: 'User Authentication',
      description: 'Test description',
      gherkinContent: 'Given a user\nWhen they log in\nThen they see dashboard',
      status: BDDScenarioStatus.PENDING,
      executedAt: null,
      executionDuration: null,
      errorMessage: null,
    };

    it('should delete scenario successfully', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(mockScenario);
      mockDb.bDDScenario.delete.mockResolvedValue(mockScenario);

      const response = await request(app).delete('/api/tasks/CODEGOAT-100/scenarios/scenario-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('BDD scenario deleted successfully');
    });

    it('should return 404 if scenario does not exist for nonexistent task', async () => {
      mockDb.bDDScenario.findFirst.mockResolvedValue(null);

      const response = await request(app).delete('/api/tasks/NONEXISTENT/scenarios/scenario-1');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Scenario not found');
    });

    it('should return 404 if scenario does not exist', async () => {
      mockDb.task.findUnique.mockResolvedValue(mockTask);
      mockDb.bDDScenario.findFirst.mockResolvedValue(null);

      const response = await request(app).delete('/api/tasks/CODEGOAT-100/scenarios/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Scenario not found');
    });

    it('should handle database errors during scenario deletion', async () => {
      mockDb.bDDScenario.findFirst.mockResolvedValue(mockScenario);
      mockDb.bDDScenario.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/tasks/CODEGOAT-100/scenarios/scenario-1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to delete BDD scenario');
    }, 30000);
  });
});
