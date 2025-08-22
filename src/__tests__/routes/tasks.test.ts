import request from 'supertest';
import express from 'express';
import { createTaskRoutes } from '../../routes/tasks';
import { WinstonLogger } from '../../logger-winston';
import { getDatabaseService } from '../../services/database';
import { TodoStatus, TodoPriority, TaskType, BDDScenarioStatus } from '@prisma/client';

// Mock the database service
jest.mock('../../services/database');

const mockDb = {
  todoTask: {
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
  let logger: WinstonLogger;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    logger = new WinstonLogger();
    app.use('/api/tasks', createTaskRoutes(logger));

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('PUT /api/tasks/:id - Story Completion Validation', () => {
    const storyTask = {
      id: 'CODEGOAT-001',
      content: 'Implement user authentication',
      status: TodoStatus.IN_PROGRESS,
      priority: TodoPriority.HIGH,
      taskType: TaskType.STORY,
      executorId: null,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: null,
      duration: null,
      createdAt: new Date('2024-01-01T09:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should prevent story completion without BDD scenarios', async () => {
      // Mock existing story task
      mockDb.todoTask.findUnique.mockResolvedValue(storyTask);
      
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
      expect(mockDb.todoTask.update).not.toHaveBeenCalled();
    });

    it('should prevent story completion with unlinked BDD scenarios', async () => {
      // Mock existing story task
      mockDb.todoTask.findUnique.mockResolvedValue(storyTask);
      
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
          todoTaskId: 'CODEGOAT-001',
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
          todoTaskId: 'CODEGOAT-001',
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
      expect(mockDb.todoTask.update).not.toHaveBeenCalled();
    });

    it('should prevent story completion with non-passed BDD scenarios', async () => {
      // Mock existing story task
      mockDb.todoTask.findUnique.mockResolvedValue(storyTask);
      
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
          todoTaskId: 'CODEGOAT-001',
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
          todoTaskId: 'CODEGOAT-001',
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
      expect(mockDb.todoTask.update).not.toHaveBeenCalled();
    });

    it('should allow story completion with valid linked and passed BDD scenarios', async () => {
      // Mock existing story task
      mockDb.todoTask.findUnique.mockResolvedValue(storyTask);
      
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
          todoTaskId: 'CODEGOAT-001',
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
          todoTaskId: 'CODEGOAT-001',
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
        status: TodoStatus.COMPLETED,
        endTime: new Date('2024-01-01T12:00:00Z'),
        duration: '2h 0m',
      };
      
      mockDb.todoTask.update.mockResolvedValue(completedTask);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      
      // Ensure task update was called
      expect(mockDb.todoTask.update).toHaveBeenCalledWith({
        where: { id: 'CODEGOAT-001' },
        data: expect.objectContaining({
          status: TodoStatus.COMPLETED,
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
      
      mockDb.todoTask.findUnique.mockResolvedValue(regularTask);
      
      // Mock successful task update
      const completedTask = {
        ...regularTask,
        status: TodoStatus.COMPLETED,
        endTime: new Date('2024-01-01T12:00:00Z'),
        duration: '2h 0m',
      };
      
      mockDb.todoTask.update.mockResolvedValue(completedTask);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      
      // Ensure BDD scenario validation was not called for regular tasks
      expect(mockDb.bDDScenario.findMany).not.toHaveBeenCalled();
      
      // Ensure task update was called
      expect(mockDb.todoTask.update).toHaveBeenCalled();
    });

    it('should allow non-completion status updates for stories without validation', async () => {
      // Mock existing story task
      mockDb.todoTask.findUnique.mockResolvedValue(storyTask);
      
      // Mock successful task update
      const updatedTask = {
        ...storyTask,
        status: TodoStatus.PENDING,
      };
      
      mockDb.todoTask.update.mockResolvedValue(updatedTask);

      const response = await request(app)
        .put('/api/tasks/CODEGOAT-001')
        .send({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      
      // Ensure BDD scenario validation was not called for non-completion updates
      expect(mockDb.bDDScenario.findMany).not.toHaveBeenCalled();
      
      // Ensure task update was called
      expect(mockDb.todoTask.update).toHaveBeenCalled();
    });
  });
});