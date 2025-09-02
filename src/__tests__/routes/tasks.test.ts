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

describe('Tasks Route - Story Completion Validation', () => {
  let app: express.Application;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    logger = createMockLogger();
    app.use('/api/tasks', createTaskRoutes(logger));

    // Clear all mocks and reset database service
    jest.clearAllMocks();
    (getDatabaseService as jest.Mock).mockReturnValue(mockDb);
  });

  describe('PUT /api/tasks/:id - Story Completion Validation', () => {
    const storyTask = {
      id: 'CODEGOAT-001',
      title: 'Implement user authentication', // Add required title field
      content: 'Implement user authentication',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      taskType: TaskType.STORY,
      executorId: null,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: null,
      duration: null,
      createdAt: new Date('2024-01-01T09:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      // Add other unified Task fields
      projectId: null,
      parentTaskAttempt: null,
      templateId: null,
      tags: null,
      description: null,
    };

    it('should prevent story completion without BDD scenarios', async () => {
      // Mock existing story task
      mockDb.task.findUnique.mockResolvedValue(storyTask);
      
      // Mock no BDD scenarios
      mockDb.bDDScenario.findMany.mockResolvedValue([]);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Story cannot be completed without at least one BDD scenario');
      expect(response.body.code).toBe('STORY_MISSING_BDD_SCENARIOS');
      
      // Ensure task update was not called
      expect(mockDb.task.update).not.toHaveBeenCalled();
    });

    it('should prevent story completion with unlinked BDD scenarios', async () => {
      // Mock existing story task
      mockDb.task.findUnique.mockResolvedValue(storyTask);
      
      // Mock BDD scenarios without test links
      const unlinkedScenarios = [
        {
          id: 'scenario-1',
          title: 'User can login',
          feature: 'Authentication',
          description: 'Test user login functionality',
          gherkinContent: 'Given user has valid credentials...',
          status: BDDScenarioStatus.PENDING,
          playwrightTestFile: null, // Not linked
          playwrightTestName: null, // Not linked
          taskId: 'CODEGOAT-001',
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: null,
          executionDuration: null,
          errorMessage: null,
        },
        {
          id: 'scenario-2',
          title: 'User can logout',
          feature: 'Authentication',
          description: 'Test user logout functionality',
          gherkinContent: 'Given user is logged in...',
          status: BDDScenarioStatus.PENDING,
          playwrightTestFile: 'auth.spec.ts', // Linked
          playwrightTestName: 'should logout user', // Linked
          taskId: 'CODEGOAT-001',
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: null,
          executionDuration: null,
          errorMessage: null,
        },
      ];
      
      mockDb.bDDScenario.findMany.mockResolvedValue(unlinkedScenarios);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('1 BDD scenario(s) that are not linked to E2E tests');
      expect(response.body.code).toBe('STORY_SCENARIOS_NOT_LINKED');
      expect(response.body.details.unlinkedScenarios).toHaveLength(1);
      expect(response.body.details.unlinkedScenarios[0].id).toBe('scenario-1');
      
      // Ensure task update was not called
      expect(mockDb.task.update).not.toHaveBeenCalled();
    });

    it('should prevent story completion with non-passed BDD scenarios', async () => {
      // Mock existing story task
      mockDb.task.findUnique.mockResolvedValue(storyTask);
      
      // Mock BDD scenarios that are linked but not passed
      const nonPassedScenarios = [
        {
          id: 'scenario-1',
          title: 'User can login',
          feature: 'Authentication',
          description: 'Test user login functionality',
          gherkinContent: 'Given user has valid credentials...',
          status: BDDScenarioStatus.FAILED, // Failed test
          playwrightTestFile: 'auth.spec.ts',
          playwrightTestName: 'should login user',
          taskId: 'CODEGOAT-001',
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: new Date(),
          executionDuration: 5000,
          errorMessage: 'Authentication failed',
        },
        {
          id: 'scenario-2',
          title: 'User can logout',
          feature: 'Authentication',
          description: 'Test user logout functionality',
          gherkinContent: 'Given user is logged in...',
          status: BDDScenarioStatus.PENDING, // Still pending
          playwrightTestFile: 'auth.spec.ts',
          playwrightTestName: 'should logout user',
          taskId: 'CODEGOAT-001',
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: null,
          executionDuration: null,
          errorMessage: null,
        },
      ];
      
      mockDb.bDDScenario.findMany.mockResolvedValue(nonPassedScenarios);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('2 BDD scenario(s) that have not passed');
      expect(response.body.code).toBe('STORY_SCENARIOS_NOT_PASSED');
      expect(response.body.details.nonPassedScenarios).toHaveLength(2);
      expect(response.body.details.nonPassedScenarios[0].status).toBe('failed');
      expect(response.body.details.nonPassedScenarios[1].status).toBe('pending');
      
      // Ensure task update was not called
      expect(mockDb.task.update).not.toHaveBeenCalled();
    });

    it('should allow story completion with valid linked and passed BDD scenarios', async () => {
      // Mock existing story task
      mockDb.task.findUnique.mockResolvedValue(storyTask);
      
      // Mock BDD scenarios that are linked and passed
      const passedScenarios = [
        {
          id: 'scenario-1',
          title: 'User can login',
          feature: 'Authentication',
          description: 'Test user login functionality',
          gherkinContent: 'Given user has valid credentials...',
          status: BDDScenarioStatus.PASSED,
          playwrightTestFile: 'auth.spec.ts',
          playwrightTestName: 'should login user',
          taskId: 'CODEGOAT-001',
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: new Date(),
          executionDuration: 5000,
          errorMessage: null,
        },
        {
          id: 'scenario-2',
          title: 'User can logout',
          feature: 'Authentication',
          description: 'Test user logout functionality',
          gherkinContent: 'Given user is logged in...',
          status: BDDScenarioStatus.PASSED,
          playwrightTestFile: 'auth.spec.ts',
          playwrightTestName: 'should logout user',
          taskId: 'CODEGOAT-001',
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: new Date(),
          executionDuration: 3000,
          errorMessage: null,
        },
      ];
      
      mockDb.bDDScenario.findMany.mockResolvedValue(passedScenarios);
      
      // Mock successful task update
      const completedTask = {
        ...storyTask,
        status: TaskStatus.COMPLETED,
        endTime: new Date('2024-01-01T12:00:00Z'),
        duration: '2h 0m',
      };
      
      mockDb.task.update.mockResolvedValue(completedTask);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      
      // Ensure task update was called
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-001' },
        data: expect.objectContaining({
          status: TaskStatus.COMPLETED,
          endTime: expect.any(Date),
          duration: expect.any(String),
        }),
      });
    });

    it('should allow regular task completion without BDD scenario validation', async () => {
      // Mock existing regular task (not story)
      const regularTask = {
        ...storyTask,
        taskType: TaskType.TASK,
      };
      
      mockDb.task.findUnique.mockResolvedValue(regularTask);
      
      // Mock successful task update
      const completedTask = {
        ...regularTask,
        status: TaskStatus.COMPLETED,
        endTime: new Date('2024-01-01T12:00:00Z'),
        duration: '2h 0m',
      };
      
      mockDb.task.update.mockResolvedValue(completedTask);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      
      // Ensure BDD scenario validation was not called for regular tasks
      expect(mockDb.bDDScenario.findMany).not.toHaveBeenCalled();
      
      // Ensure task update was called
      expect(mockDb.task.update).toHaveBeenCalled();
    });

    it('should allow non-completion status updates for stories without validation', async () => {
      // Mock existing story task
      mockDb.task.findUnique.mockResolvedValue(storyTask);
      
      // Mock successful task update
      const updatedTask = {
        ...storyTask,
        status: TaskStatus.PENDING,
      };
      
      mockDb.task.update.mockResolvedValue(updatedTask);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      
      // Ensure BDD scenario validation was not called for non-completion updates
      expect(mockDb.bDDScenario.findMany).not.toHaveBeenCalled();
      
      // Ensure task update was called
      expect(mockDb.task.update).toHaveBeenCalled();
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all todo tasks successfully', async () => {
      const mockTasks = [
        {
          id: 'CODEGOAT-001',
          title: 'Test Task 1',
          content: 'Test Task 1',
          status: TaskStatus.PENDING,
          priority: Priority.HIGH,
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
        {
          id: 'CODEGOAT-002',
          title: 'Test Task 2',
          content: 'Test Task 2',
          status: TaskStatus.COMPLETED,
          priority: Priority.MEDIUM,
          taskType: TaskType.STORY,
          executorId: 'user-123',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T12:00:00Z'),
          duration: '2h 0m',
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: null,
          parentTaskAttempt: null,
          templateId: null,
          tags: null,
          description: null,
        },
      ];

      mockDb.task.findMany.mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe('CODEGOAT-001');
      expect(response.body.data[0].status).toBe('pending');
      expect(response.body.data[1].id).toBe('CODEGOAT-002');
      expect(response.body.data[1].status).toBe('completed');

      expect(mockDb.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { projectId: null },
            { id: { startsWith: 'CODEGOAT-' } },
          ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should handle database errors', async () => {
      mockDb.task.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch tasks');
    });
  });

  describe('GET /api/tasks/analytics', () => {
    it('should handle database errors in analytics', async () => {
      mockDb.task.count.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks/analytics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch task analytics');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a specific task successfully', async () => {
      const mockTask = {
        id: 'CODEGOAT-001',
        title: 'Test Task',
        content: 'Test Task',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        taskType: TaskType.STORY,
        executorId: 'user-123',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
        parentTaskAttempt: null,
        templateId: null,
        tags: null,
        description: null,
        validationRuns: [],
        bddScenarios: [],
      };

      mockDb.task.findUnique.mockResolvedValue(mockTask);

      const response = await request(app)
        .get('/api/tasks/CODEGOAT-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('CODEGOAT-001');
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.data.executorId).toBe('user-123');

      expect(mockDb.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-001' },
        include: {
          validationRuns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          bddScenarios: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    it('should return 404 for non-existent task', async () => {
      mockDb.task.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/tasks/CODEGOAT-999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Task not found');
    });

    it('should handle database errors when fetching task', async () => {
      mockDb.task.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks/CODEGOAT-001')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch task');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const newTaskData = {
        content: 'New test task',
        priority: 'high',
        taskType: 'task',
      };

      // Mock finding existing tasks to generate ID
      mockDb.task.findMany.mockResolvedValue([
        { id: 'CODEGOAT-005' }
      ]);

      const createdTask = {
        id: 'CODEGOAT-006',
        title: 'New test task',
        content: 'New test task',
        status: TaskStatus.PENDING,
        priority: Priority.HIGH,
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

      mockDb.task.create.mockResolvedValue(createdTask);

      const response = await request(app)
        .post('/api/tasks')
        .send(newTaskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('CODEGOAT-006');
      expect(response.body.data.content).toBe('New test task');
      expect(response.body.data.status).toBe('pending');

      expect(mockDb.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'CODEGOAT-006',
          title: 'New test task',
          content: 'New test task',
          status: TaskStatus.PENDING,
          priority: Priority.HIGH,
          taskType: TaskType.TASK,
        }),
      });
    });

    it('should handle missing content', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          priority: 'high',
          taskType: 'task',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Task content is required');
    });

    it('should handle database errors during task creation', async () => {
      mockDb.task.findMany.mockResolvedValue([]);
      mockDb.task.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/tasks')
        .send({
          content: 'Test task',
          priority: 'high',
          taskType: 'task',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create task');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task successfully', async () => {
      const existingTask = {
        id: 'CODEGOAT-001',
        title: 'Test Task',
        content: 'Test Task',
        status: TaskStatus.PENDING,
        priority: Priority.HIGH,
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

      mockDb.task.findUnique.mockResolvedValue(existingTask);
      mockDb.task.delete.mockResolvedValue(existingTask);

      const response = await request(app)
        .delete('/api/tasks/CODEGOAT-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');

      expect(mockDb.task.delete).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-001' },
      });
    });

    it('should return 404 when deleting non-existent task', async () => {
      mockDb.task.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/tasks/CODEGOAT-999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Task not found');
      expect(mockDb.task.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      mockDb.task.findUnique.mockResolvedValue({
        id: 'CODEGOAT-001',
        status: TaskStatus.PENDING,
      });
      mockDb.task.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/tasks/CODEGOAT-001')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to delete task');
    });
  });
});