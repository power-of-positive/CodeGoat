import express from 'express';
import { BDDScenarioStatus } from '@prisma/client';
import { BDDScenarioService } from '../services/bdd-scenario-service';
import { getDatabaseService } from '../services/database';

// HTTP status code constants
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const router = express.Router();
let bddService: BDDScenarioService | null = null;

// Lazy initialization of BDD service
function getBDDService(): BDDScenarioService {
  if (!bddService) {
    const prisma = getDatabaseService();
    bddService = new BDDScenarioService(prisma);
  }
  return bddService;
}

// Get all BDD scenarios
router.get('/', async (req, res) => {
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
});

// Get BDD scenarios for a specific task
router.get('/task/:taskId', async (req, res) => {
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
});

// Get BDD execution statistics
router.get('/stats', async (req, res) => {
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
});

// Create comprehensive BDD scenarios from file
router.post('/comprehensive', async (req, res) => {
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
});

// Create a new BDD scenario
router.post('/', async (req, res) => {
  try {
    const scenarioData = req.body;

    // Validate required fields
    if (!scenarioData.todoTaskId || !scenarioData.title || !scenarioData.gherkinContent) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Missing required fields: todoTaskId, title, and gherkinContent are required',
      });
    }

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
});

// Update scenario status
router.put('/:scenarioId/status', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { status, errorMessage } = req.body;

    // Validate status
    if (!Object.values(BDDScenarioStatus).includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid status. Must be one of: ${Object.values(BDDScenarioStatus).join(', ')}`,
      });
    }

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
});

// Execute a scenario
router.post('/:scenarioId/execute', async (req, res) => {
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
});

// Get execution history for a scenario
router.get('/:scenarioId/history', async (req, res) => {
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
});

// Link scenario to Playwright test
router.put('/:scenarioId/link-test', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { testFile, testName } = req.body;

    if (!testFile || !testName) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'testFile and testName are required',
      });
    }

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
});

// Bulk execute all scenarios (for testing)
router.post('/execute-all', async (req, res) => {
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
});

export default router;
