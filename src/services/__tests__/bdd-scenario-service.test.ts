import { PrismaClient, BDDScenarioStatus, TodoTask, BDDScenario } from '@prisma/client';
import { BDDScenarioService, BDDScenarioInput } from '../bdd-scenario-service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock Prisma Client
const mockPrismaClient = {
  bDDScenario: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  bDDScenarioExecution: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  todoTask: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
} as any;

describe('BDDScenarioService', () => {
  let service: BDDScenarioService;

  beforeEach(() => {
    service = new BDDScenarioService(mockPrismaClient as PrismaClient);
    jest.clearAllMocks();
  });

  describe('parseComprehensiveBDDScenarios', () => {
    it('should parse BDD scenarios from feature file', async () => {
      const mockFeatureContent = `
Feature: CodeGoat Test Scenarios

  Scenario: User creates a new task
    Given I am on the Tasks page
    When I click the "Add Task" button
    Then I should see the task form

  Scenario: User edits an existing task
    Given I have a task in pending status
    When I edit the task
    Then I should see the updated task
      `;

      mockFs.readFile.mockResolvedValue(mockFeatureContent);

      const scenarios = await service.parseComprehensiveBDDScenarios();

      expect(scenarios).toHaveLength(2);
      expect(scenarios[0]).toMatchObject({
        title: 'User creates a new task',
        feature: 'CodeGoat Test Scenarios',
        todoTaskId: 'comprehensive-bdd',
      });
      expect(scenarios[1]).toMatchObject({
        title: 'User edits an existing task',
        feature: 'CodeGoat Test Scenarios',
        todoTaskId: 'comprehensive-bdd',
      });
      expect(scenarios[0].gherkinContent).toContain('Given I am on the Tasks page');
      expect(scenarios[1].gherkinContent).toContain('When I edit the task');
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.parseComprehensiveBDDScenarios()).rejects.toThrow(
        'Failed to read comprehensive BDD scenarios file'
      );
    });
  });

  describe('createScenario', () => {
    it('should create a new BDD scenario', async () => {
      const scenarioInput: BDDScenarioInput = {
        todoTaskId: 'test-task-id',
        title: 'Test Scenario',
        feature: 'Test Feature',
        description: 'Test Description',
        gherkinContent: 'Given something When something Then something',
      };

      const mockScenario: BDDScenario = {
        id: 'scenario-id',
        todoTaskId: scenarioInput.todoTaskId,
        title: scenarioInput.title,
        feature: scenarioInput.feature,
        description: scenarioInput.description,
        gherkinContent: scenarioInput.gherkinContent,
        playwrightTestFile: scenarioInput.playwrightTestFile ?? null,
        playwrightTestName: scenarioInput.playwrightTestName ?? null,
        status: BDDScenarioStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        executedAt: null,
        executionDuration: null,
        errorMessage: null,
        cucumberSteps: null,
      };

      mockPrismaClient.bDDScenario.create.mockResolvedValue(mockScenario);

      const result = await service.createScenario(scenarioInput);

      expect(mockPrismaClient.bDDScenario.create).toHaveBeenCalledWith({
        data: {
          todoTaskId: scenarioInput.todoTaskId,
          title: scenarioInput.title,
          feature: scenarioInput.feature,
          description: scenarioInput.description,
          gherkinContent: scenarioInput.gherkinContent,
          status: BDDScenarioStatus.PENDING,
          playwrightTestFile: undefined,
          playwrightTestName: undefined,
          cucumberSteps: null,
        },
      });
      expect(result).toEqual(mockScenario);
    });

    it('should handle creation errors', async () => {
      const scenarioInput: BDDScenarioInput = {
        todoTaskId: 'test-task-id',
        title: 'Test Scenario',
        feature: 'Test Feature',
        description: 'Test Description',
        gherkinContent: 'Given something',
      };

      mockPrismaClient.bDDScenario.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createScenario(scenarioInput)).rejects.toThrow(
        'Failed to create BDD scenario'
      );
    });
  });

  describe('getScenariosByTaskId', () => {
    it('should fetch scenarios for a specific task', async () => {
      const taskId = 'test-task-id';
      const mockScenarios = [
        { id: '1', title: 'Scenario 1', todoTaskId: taskId },
        { id: '2', title: 'Scenario 2', todoTaskId: taskId },
      ] as BDDScenario[];

      mockPrismaClient.bDDScenario.findMany.mockResolvedValue(mockScenarios);

      const result = await service.getScenariosByTaskId(taskId);

      expect(mockPrismaClient.bDDScenario.findMany).toHaveBeenCalledWith({
        where: { todoTaskId: taskId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockScenarios);
    });

    it('should handle fetch errors', async () => {
      mockPrismaClient.bDDScenario.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getScenariosByTaskId('test-id')).rejects.toThrow(
        'Failed to fetch BDD scenarios'
      );
    });
  });

  describe('updateScenarioStatus', () => {
    it('should update scenario status successfully', async () => {
      const scenarioId = 'scenario-id';
      const status = BDDScenarioStatus.PASSED;
      const mockScenario = {
        id: scenarioId,
        status,
        executedAt: expect.any(Date),
      } as BDDScenario;

      mockPrismaClient.bDDScenario.update.mockResolvedValue(mockScenario);

      const result = await service.updateScenarioStatus(scenarioId, status);

      expect(mockPrismaClient.bDDScenario.update).toHaveBeenCalledWith({
        where: { id: scenarioId },
        data: {
          status,
          errorMessage: undefined,
          executedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockScenario);
    });

    it('should update scenario status with error message', async () => {
      const scenarioId = 'scenario-id';
      const status = BDDScenarioStatus.FAILED;
      const errorMessage = 'Test failed';
      const mockScenario = {
        id: scenarioId,
        status,
        errorMessage,
      } as BDDScenario;

      mockPrismaClient.bDDScenario.update.mockResolvedValue(mockScenario);

      const result = await service.updateScenarioStatus(scenarioId, status, errorMessage);

      expect(mockPrismaClient.bDDScenario.update).toHaveBeenCalledWith({
        where: { id: scenarioId },
        data: {
          status,
          errorMessage,
          executedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockScenario);
    });
  });

  describe('getExecutionStats', () => {
    it('should return correct execution statistics', async () => {
      mockPrismaClient.bDDScenario.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(70)  // passed
        .mockResolvedValueOnce(20)  // failed
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(5);  // skipped

      const stats = await service.getExecutionStats();

      expect(stats).toEqual({
        total: 100,
        passed: 70,
        failed: 20,
        pending: 5,
        skipped: 5,
        passRate: 70, // 70/100 * 100 = 70%
      });
    });

    it('should handle zero scenarios', async () => {
      mockPrismaClient.bDDScenario.count.mockResolvedValue(0);

      const stats = await service.getExecutionStats();

      expect(stats).toEqual({
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        passRate: 0,
      });
    });
  });

  describe('createComprehensiveScenarios', () => {
    beforeEach(() => {
      // Mock file reading
      const mockFeatureContent = `
Feature: Test Feature

  Scenario: Test Scenario 1
    Given something
    When something
    Then something

  Scenario: Test Scenario 2
    Given something else
    When something else
    Then something else
      `;
      mockFs.readFile.mockResolvedValue(mockFeatureContent);
    });

    it('should create comprehensive scenarios successfully', async () => {
      const mockMasterTask = {
        id: 'comprehensive-bdd',
        content: 'Comprehensive BDD Scenarios for All User-Facing Features',
      } as TodoTask;

      const mockScenarios = [
        { id: '1', title: 'Test Scenario 1' },
        { id: '2', title: 'Test Scenario 2' },
      ] as BDDScenario[];

      // Mock task creation
      mockPrismaClient.todoTask.findFirst.mockResolvedValue(null);
      mockPrismaClient.todoTask.create.mockResolvedValue(mockMasterTask);

      // Mock scenario creation
      mockPrismaClient.bDDScenario.findFirst.mockResolvedValue(null);
      mockPrismaClient.bDDScenario.create
        .mockResolvedValueOnce(mockScenarios[0])
        .mockResolvedValueOnce(mockScenarios[1]);

      const result = await service.createComprehensiveScenarios();

      expect(result.created).toBe(2);
      expect(result.scenarios).toHaveLength(2);
      expect(mockPrismaClient.todoTask.create).toHaveBeenCalledWith({
        data: {
          id: 'comprehensive-bdd',
          content: 'Comprehensive BDD Scenarios for All User-Facing Features',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          taskType: 'STORY',
          executorId: 'system',
        },
      });
    });

    it('should use existing master task', async () => {
      const mockMasterTask = {
        id: 'comprehensive-bdd',
        content: 'Existing task',
      } as TodoTask;

      mockPrismaClient.todoTask.findFirst.mockResolvedValue(mockMasterTask);
      mockPrismaClient.bDDScenario.findFirst.mockResolvedValue(null);
      mockPrismaClient.bDDScenario.create.mockResolvedValue({} as BDDScenario);

      await service.createComprehensiveScenarios();

      expect(mockPrismaClient.todoTask.create).not.toHaveBeenCalled();
    });

    it('should skip existing scenarios', async () => {
      const mockMasterTask = {
        id: 'comprehensive-bdd',
        content: 'Existing task',
      } as TodoTask;

      const existingScenario = {
        id: 'existing',
        title: 'Test Scenario 1',
      } as BDDScenario;

      mockPrismaClient.todoTask.findFirst.mockResolvedValue(mockMasterTask);
      mockPrismaClient.bDDScenario.findFirst
        .mockResolvedValueOnce(existingScenario) // First scenario exists
        .mockResolvedValueOnce(null); // Second scenario doesn't exist
      mockPrismaClient.bDDScenario.create.mockResolvedValue({} as BDDScenario);

      const result = await service.createComprehensiveScenarios();

      expect(result.created).toBe(1); // Only one new scenario created
      expect(mockPrismaClient.bDDScenario.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeScenario', () => {
    it('should execute scenario and record results', async () => {
      const scenarioId = 'scenario-id';
      const mockScenario = {
        id: scenarioId,
        title: 'Test Scenario',
      } as BDDScenario;

      mockPrismaClient.bDDScenario.findUnique.mockResolvedValue(mockScenario);
      mockPrismaClient.bDDScenarioExecution.create.mockResolvedValue({});
      mockPrismaClient.bDDScenario.update.mockResolvedValue(mockScenario);

      const result = await service.executeScenario(scenarioId);

      expect(result.scenarioId).toBe(scenarioId);
      expect([BDDScenarioStatus.PASSED, BDDScenarioStatus.FAILED]).toContain(result.status);
      expect(result.executionDuration).toBeGreaterThan(0);
      expect(mockPrismaClient.bDDScenarioExecution.create).toHaveBeenCalled();
    });

    it('should handle scenario not found', async () => {
      mockPrismaClient.bDDScenario.findUnique.mockResolvedValue(null);

      await expect(service.executeScenario('non-existent')).rejects.toThrow(
        'Scenario not found'
      );
    });

    it('should handle execution errors', async () => {
      const mockScenario = { id: 'scenario-id' } as BDDScenario;
      mockPrismaClient.bDDScenario.findUnique.mockResolvedValue(mockScenario);
      mockPrismaClient.bDDScenarioExecution.create.mockRejectedValue(new Error('Database error'));

      await expect(service.executeScenario('scenario-id')).rejects.toThrow(
        'Failed to execute BDD scenario'
      );
    });
  });
});