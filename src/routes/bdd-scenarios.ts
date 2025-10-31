import { Router, Request, Response } from 'express';
import { BDDScenarioStatus } from '../types/enums';
import { BDDScenarioService } from '../services/bdd-scenario-service';
import { getDatabaseService } from '../services/database';
import { validateRequest, validateParams } from '../middleware/validate';
import {
  GetTaskScenariosParamsSchema,
  CreateBDDScenarioRequestSchema,
  UpdateScenarioStatusParamsSchema,
  UpdateScenarioStatusRequestSchema,
  ExecuteBDDScenarioParamsSchema,
  GetExecutionHistoryParamsSchema,
  LinkTestParamsSchema,
  LinkTestRequestSchema,
} from '../shared/schemas';

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Lazy initialization of BDD service
let bddService: BDDScenarioService | null = null;

function getBDDService(): BDDScenarioService {
  if (!bddService) {
    const prisma = getDatabaseService();
    bddService = new BDDScenarioService(prisma);
  }
  return bddService;
}

// Handler functions for BDD scenario routes
function getAllScenarios() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const scenarios = await getBDDService().getAllScenarios();
      res.json({
        success: true,
        data: scenarios,
      });
    } catch (error) {
      console.error('Error fetching BDD scenarios:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch BDD scenarios',
        error: (error as Error).message,
      });
    }
  };
}

function getTaskScenarios() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const scenarios = await getBDDService().getScenariosByTaskId(taskId);
      res.json({
        success: true,
        data: scenarios,
      });
    } catch (error) {
      console.error('Error fetching task BDD scenarios:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch task BDD scenarios',
        error: (error as Error).message,
      });
    }
  };
}

function getExecutionStats() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await getBDDService().getExecutionStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching BDD stats:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch BDD statistics',
        error: (error as Error).message,
      });
    }
  };
}

function createComprehensiveScenarios() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await getBDDService().createComprehensiveScenarios();
      res.json({
        success: true,
        message: `Created ${result.created} comprehensive BDD scenarios`,
        data: {
          created: result.created,
          total: result.scenarios.length,
        },
      });
    } catch (error) {
      console.error('Error creating comprehensive BDD scenarios:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create comprehensive BDD scenarios',
        error: (error as Error).message,
      });
    }
  };
}

function createScenario() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const scenarioData = req.body;

      // Map todoTaskId to taskId for the service
      const mappedScenarioData = {
        ...scenarioData,
        taskId: scenarioData.todoTaskId,
      };
      delete mappedScenarioData.todoTaskId;

      const scenario = await getBDDService().createScenario(mappedScenarioData);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: scenario,
      });
    } catch (error) {
      console.error('Error creating BDD scenario:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create BDD scenario',
        error: (error as Error).message,
      });
    }
  };
}

function updateScenarioStatus() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { scenarioId } = req.params;
      const { status, errorMessage } = req.body;

      const scenario = await getBDDService().updateScenarioStatus(scenarioId, status, errorMessage);
      res.json({
        success: true,
        data: scenario,
      });
    } catch (error) {
      console.error('Error updating scenario status:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update scenario status',
        error: (error as Error).message,
      });
    }
  };
}

function executeScenario() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { scenarioId } = req.params;
      const result = await getBDDService().executeScenario(scenarioId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error executing BDD scenario:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to execute BDD scenario',
        error: (error as Error).message,
      });
    }
  };
}

function getExecutionHistory() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { scenarioId } = req.params;
      const history = await getBDDService().getExecutionHistory(scenarioId);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching execution history:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch execution history',
        error: (error as Error).message,
      });
    }
  };
}

function linkScenarioToTest() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { scenarioId } = req.params;
      const { testFile, testName } = req.body;

      const scenario = await getBDDService().linkToPlaywrightTest(scenarioId, testFile, testName);
      res.json({
        success: true,
        data: scenario,
      });
    } catch (error) {
      console.error('Error linking scenario to test:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to link scenario to Playwright test',
        error: (error as Error).message,
      });
    }
  };
}

function executeAllScenarios() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const scenarios = await getBDDService().getAllScenarios();
      const results = [];

      for (const scenario of scenarios) {
        try {
          const result = await getBDDService().executeScenario(scenario.id);
          results.push(result);
        } catch (error) {
          console.error(`Failed to execute scenario ${scenario.id}:`, error);
          results.push({
            scenarioId: scenario.id,
            status: BDDScenarioStatus.FAILED,
            errorMessage: (error as Error).message,
          });
        }
      }

      res.json({
        success: true,
        message: `Executed ${results.length} scenarios`,
        data: {
          results,
          stats: {
            total: results.length,
            passed: results.filter(r => r.status === BDDScenarioStatus.PASSED).length,
            failed: results.filter(r => r.status === BDDScenarioStatus.FAILED).length,
          },
        },
      });
    } catch (error) {
      console.error('Error executing all scenarios:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to execute all scenarios',
        error: (error as Error).message,
      });
    }
  };
}

export function createBDDScenariosRoutes(): Router {
  const router = Router();

  // GET all BDD scenarios
  router.get('/', getAllScenarios());

  // GET BDD scenarios for a specific task
  router.get('/task/:taskId', validateParams(GetTaskScenariosParamsSchema), getTaskScenarios());

  // GET BDD execution statistics
  router.get('/stats', getExecutionStats());

  // POST create comprehensive BDD scenarios from file
  router.post('/comprehensive', createComprehensiveScenarios());

  // POST create a new BDD scenario
  router.post('/', validateRequest(CreateBDDScenarioRequestSchema), createScenario());

  // PUT update scenario status
  router.put(
    '/:scenarioId/status',
    validateParams(UpdateScenarioStatusParamsSchema),
    validateRequest(UpdateScenarioStatusRequestSchema),
    updateScenarioStatus()
  );

  // POST execute a scenario
  router.post(
    '/:scenarioId/execute',
    validateParams(ExecuteBDDScenarioParamsSchema),
    executeScenario()
  );

  // GET execution history for a scenario
  router.get(
    '/:scenarioId/history',
    validateParams(GetExecutionHistoryParamsSchema),
    getExecutionHistory()
  );

  // PUT link scenario to Playwright test
  router.put(
    '/:scenarioId/link-test',
    validateParams(LinkTestParamsSchema),
    validateRequest(LinkTestRequestSchema),
    linkScenarioToTest()
  );

  // POST bulk execute all scenarios
  router.post('/execute-all', executeAllScenarios());

  return router;
}

// Default export for backward compatibility
export default createBDDScenariosRoutes();
