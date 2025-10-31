import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { BDDScenarioStatus } from '../../types/enums';
import bddScenariosRouter from '../bdd-scenarios';

// Mock the BDDScenarioService
jest.mock('../../services/bdd-scenario-service');

const app = express();
app.use(express.json());
app.use('/api/bdd-scenarios', bddScenariosRouter);

// Mock service methods
const mockService = {
  getAllScenarios: jest.fn(),
  getScenariosByTaskId: jest.fn(),
  getExecutionStats: jest.fn(),
  createComprehensiveScenarios: jest.fn(),
  createScenario: jest.fn(),
  updateScenarioStatus: jest.fn(),
  executeScenario: jest.fn(),
  getExecutionHistory: jest.fn(),
  linkToPlaywrightTest: jest.fn(),
};

// Replace the actual service with mock
jest.doMock('../../services/bdd-scenario-service', () => ({
  BDDScenarioService: jest.fn().mockImplementation(() => mockService),
}));

describe('BDD Scenarios API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bdd-scenarios', () => {
    it('should return all BDD scenarios', async () => {
      const mockScenarios = [
        {
          id: '1',
          title: 'User creates a new task',
          feature: 'Task Management',
          status: BDDScenarioStatus.PASSED,
        },
        {
          id: '2',
          title: 'User edits an existing task',
          feature: 'Task Management',
          status: BDDScenarioStatus.PENDING,
        },
      ];

      mockService.getAllScenarios.mockResolvedValue(mockScenarios);

      const response = await request(app).get('/api/bdd-scenarios');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockScenarios,
      });
      expect(mockService.getAllScenarios).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching scenarios', async () => {
      mockService.getAllScenarios.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/bdd-scenarios');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to fetch BDD scenarios',
        error: 'Database error',
      });
    });
  });

  describe('GET /api/bdd-scenarios/task/:taskId', () => {
    it('should return scenarios for a specific task', async () => {
      const taskId = 'test-task-id';
      const mockScenarios = [
        {
          id: '1',
          title: 'Task specific scenario',
          todoTaskId: taskId,
        },
      ];

      mockService.getScenariosByTaskId.mockResolvedValue(mockScenarios);

      const response = await request(app).get(`/api/bdd-scenarios/task/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockScenarios,
      });
      expect(mockService.getScenariosByTaskId).toHaveBeenCalledWith(taskId);
    });
  });

  describe('GET /api/bdd-scenarios/stats', () => {
    it('should return BDD execution statistics', async () => {
      const mockStats = {
        total: 100,
        passed: 75,
        failed: 15,
        pending: 10,
        skipped: 0,
        passRate: 75,
      };

      mockService.getExecutionStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/api/bdd-scenarios/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockStats,
      });
    });
  });

  describe('POST /api/bdd-scenarios/comprehensive', () => {
    it('should create comprehensive BDD scenarios', async () => {
      const mockResult = {
        created: 25,
        scenarios: new Array(25).fill(null).map((_, i) => ({ id: `scenario-${i}` })),
      };

      mockService.createComprehensiveScenarios.mockResolvedValue(mockResult);

      const response = await request(app).post('/api/bdd-scenarios/comprehensive');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Created 25 comprehensive BDD scenarios',
        data: {
          created: 25,
          total: 25,
        },
      });
    });
  });

  describe('POST /api/bdd-scenarios', () => {
    it('should create a new BDD scenario', async () => {
      const scenarioData = {
        todoTaskId: 'task-id',
        title: 'New Scenario',
        feature: 'Test Feature',
        description: 'Test scenario description',
        gherkinContent: 'Given something When something Then something',
      };

      const mockCreatedScenario = {
        id: 'new-scenario-id',
        ...scenarioData,
        status: BDDScenarioStatus.PENDING,
      };

      mockService.createScenario.mockResolvedValue(mockCreatedScenario);

      const response = await request(app).post('/api/bdd-scenarios').send(scenarioData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: mockCreatedScenario,
      });
      expect(mockService.createScenario).toHaveBeenCalledWith(scenarioData);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        title: 'New Scenario',
      };

      const response = await request(app).post('/api/bdd-scenarios').send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Missing required fields: todoTaskId, title, and gherkinContent are required',
      });
    });
  });

  describe('PUT /api/bdd-scenarios/:scenarioId/status', () => {
    it('should update scenario status', async () => {
      const scenarioId = 'scenario-id';
      const status = BDDScenarioStatus.PASSED;
      const mockUpdatedScenario = {
        id: scenarioId,
        status,
      };

      mockService.updateScenarioStatus.mockResolvedValue(mockUpdatedScenario);

      const response = await request(app)
        .put(`/api/bdd-scenarios/${scenarioId}/status`)
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedScenario,
      });
      expect(mockService.updateScenarioStatus).toHaveBeenCalledWith(scenarioId, status, undefined);
    });

    it('should validate status values', async () => {
      const scenarioId = 'scenario-id';
      const invalidStatus = 'invalid-status';

      const response = await request(app)
        .put(`/api/bdd-scenarios/${scenarioId}/status`)
        .send({ status: invalidStatus });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });
  });

  describe('POST /api/bdd-scenarios/:scenarioId/execute', () => {
    it('should execute a scenario', async () => {
      const scenarioId = 'scenario-id';
      const mockExecutionResult = {
        scenarioId,
        status: BDDScenarioStatus.PASSED,
        executionDuration: 1500,
        environment: 'test',
        executedBy: 'system',
      };

      mockService.executeScenario.mockResolvedValue(mockExecutionResult);

      const response = await request(app).post(`/api/bdd-scenarios/${scenarioId}/execute`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockExecutionResult,
      });
      expect(mockService.executeScenario).toHaveBeenCalledWith(scenarioId);
    });
  });

  describe('GET /api/bdd-scenarios/:scenarioId/history', () => {
    it('should return execution history', async () => {
      const scenarioId = 'scenario-id';
      const mockHistory = [
        {
          id: 'execution-1',
          scenarioId,
          status: BDDScenarioStatus.PASSED,
          executedAt: new Date(),
        },
        {
          id: 'execution-2',
          scenarioId,
          status: BDDScenarioStatus.FAILED,
          executedAt: new Date(),
        },
      ];

      mockService.getExecutionHistory.mockResolvedValue(mockHistory);

      const response = await request(app).get(`/api/bdd-scenarios/${scenarioId}/history`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockHistory,
      });
    });
  });

  describe('PUT /api/bdd-scenarios/:scenarioId/link-test', () => {
    it('should link scenario to Playwright test', async () => {
      const scenarioId = 'scenario-id';
      const testFile = 'task-management.spec.ts';
      const testName = 'should create new task';
      const mockLinkedScenario = {
        id: scenarioId,
        playwrightTestFile: testFile,
        playwrightTestName: testName,
      };

      mockService.linkToPlaywrightTest.mockResolvedValue(mockLinkedScenario);

      const response = await request(app)
        .put(`/api/bdd-scenarios/${scenarioId}/link-test`)
        .send({ testFile, testName });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockLinkedScenario,
      });
      expect(mockService.linkToPlaywrightTest).toHaveBeenCalledWith(scenarioId, testFile, testName);
    });

    it('should validate required fields for linking', async () => {
      const scenarioId = 'scenario-id';

      const response = await request(app)
        .put(`/api/bdd-scenarios/${scenarioId}/link-test`)
        .send({ testFile: 'test.spec.ts' }); // Missing testName

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'testFile and testName are required',
      });
    });
  });

  describe('POST /api/bdd-scenarios/execute-all', () => {
    it('should execute all scenarios', async () => {
      const mockScenarios = [
        { id: '1', title: 'Scenario 1' },
        { id: '2', title: 'Scenario 2' },
      ];

      const mockExecutionResults = [
        { scenarioId: '1', status: BDDScenarioStatus.PASSED },
        { scenarioId: '2', status: BDDScenarioStatus.FAILED },
      ];

      mockService.getAllScenarios.mockResolvedValue(mockScenarios);
      mockService.executeScenario
        .mockResolvedValueOnce(mockExecutionResults[0])
        .mockResolvedValueOnce(mockExecutionResults[1]);

      const response = await request(app).post('/api/bdd-scenarios/execute-all');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Executed 2 scenarios',
        data: {
          results: mockExecutionResults,
          stats: {
            total: 2,
            passed: 1,
            failed: 1,
          },
        },
      });
    });

    it('should handle individual scenario execution failures', async () => {
      const mockScenarios = [
        { id: '1', title: 'Scenario 1' },
        { id: '2', title: 'Scenario 2' },
      ];

      mockService.getAllScenarios.mockResolvedValue(mockScenarios);
      mockService.executeScenario
        .mockResolvedValueOnce({ scenarioId: '1', status: BDDScenarioStatus.PASSED })
        .mockRejectedValueOnce(new Error('Execution failed'));

      const response = await request(app).post('/api/bdd-scenarios/execute-all');

      expect(response.status).toBe(200);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.results[1]).toEqual({
        scenarioId: '2',
        status: BDDScenarioStatus.FAILED,
        errorMessage: 'Execution failed',
      });
    });
  });
});
