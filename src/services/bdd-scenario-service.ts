import { PrismaClient, BDDScenario, BDDScenarioExecution } from '@prisma/client';
import { BDDScenarioStatus, BDDScenarioStatusType } from '../types/enums';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BDDScenarioInput {
  taskId: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  playwrightTestFile?: string;
  playwrightTestName?: string;
  cucumberSteps?: string[];
}

export interface BDDScenarioExecutionResult {
  scenarioId: string;
  status: BDDScenarioStatusType;
  executionDuration?: number;
  errorMessage?: string;
  stepResults?: Record<string, unknown>[];
  environment?: string;
  executedBy?: string;
}

export class BDDScenarioService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Parse comprehensive BDD scenarios file and create scenario objects
   */
  async parseComprehensiveBDDScenarios(): Promise<BDDScenarioInput[]> {
    const bddFilePath = path.join(process.cwd(), 'BDD_COMPREHENSIVE_SCENARIOS.feature');

    try {
      const content = await fs.readFile(bddFilePath, 'utf-8');
      return this.parseBDDFeatureFile(content);
    } catch (error) {
      console.error('Error reading BDD scenarios file:', error);
      throw new Error('Failed to read comprehensive BDD scenarios file');
    }
  }

  /**
   * Parse BDD feature file content into scenario objects
   */
  private parseBDDFeatureFile(content: string): BDDScenarioInput[] {
    const scenarios: BDDScenarioInput[] = [];
    const lines = content.split('\n');
    let currentScenario: Partial<BDDScenarioInput> | null = null;
    let currentGherkin: string[] = [];
    let featureName = 'CodeGoat Comprehensive User Scenarios';
    let inScenario = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Extract feature name
      if (line.startsWith('Feature:')) {
        featureName = line.replace('Feature:', '').trim();
        continue;
      }

      // Start of new scenario
      if (line.startsWith('Scenario:')) {
        // Save previous scenario if exists
        if (currentScenario?.title) {
          scenarios.push({
            taskId: 'comprehensive-bdd', // Will be updated when associating with actual tasks
            title: currentScenario.title,
            feature: featureName,
            description: currentScenario.description ?? currentScenario.title,
            gherkinContent: currentGherkin.join('\n'),
          });
        }

        // Start new scenario
        const title = line.replace('Scenario:', '').trim();
        currentScenario = {
          title,
          description: title,
        };
        currentGherkin = [line];
        inScenario = true;
        continue;
      }

      // Add lines to current scenario
      if (inScenario) {
        // Stop at next scenario or feature section
        if (line.startsWith('Scenario:') || (line.startsWith('#') && line.includes('===='))) {
          i--; // Reprocess this line
          inScenario = false;
          continue;
        }

        if (line.length > 0) {
          currentGherkin.push(line);
        }
      }
    }

    // Add final scenario
    if (currentScenario?.title) {
      scenarios.push({
        taskId: 'comprehensive-bdd',
        title: currentScenario.title,
        feature: featureName,
        description: currentScenario.description ?? currentScenario.title,
        gherkinContent: currentGherkin.join('\n'),
      });
    }

    return scenarios;
  }

  /**
   * Create a new BDD scenario
   */
  async createScenario(scenario: BDDScenarioInput): Promise<BDDScenario> {
    try {
      return await this.prisma.bDDScenario.create({
        data: {
          taskId: scenario.taskId,
          title: scenario.title,
          feature: scenario.feature,
          description: scenario.description,
          gherkinContent: scenario.gherkinContent,
          status: BDDScenarioStatus.PENDING,
          playwrightTestFile: scenario.playwrightTestFile,
          playwrightTestName: scenario.playwrightTestName,
          cucumberSteps: scenario.cucumberSteps ? JSON.stringify(scenario.cucumberSteps) : null,
        },
      });
    } catch (error) {
      console.error('Error creating BDD scenario:', error);
      throw new Error('Failed to create BDD scenario');
    }
  }

  /**
   * Get all BDD scenarios for a task
   */
  async getScenariosByTaskId(taskId: string): Promise<BDDScenario[]> {
    try {
      return await this.prisma.bDDScenario.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching BDD scenarios:', error);
      throw new Error('Failed to fetch BDD scenarios');
    }
  }

  /**
   * Get all BDD scenarios
   */
  async getAllScenarios(): Promise<BDDScenario[]> {
    try {
      return await this.prisma.bDDScenario.findMany({
        include: {
          task: true,
          executionHistory: {
            orderBy: { executedAt: 'desc' },
            take: 5, // Last 5 executions
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching all BDD scenarios:', error);
      throw new Error('Failed to fetch BDD scenarios');
    }
  }

  /**
   * Update scenario status
   */
  async updateScenarioStatus(
    scenarioId: string,
    status: BDDScenarioStatusType,
    errorMessage?: string
  ): Promise<BDDScenario> {
    try {
      return await this.prisma.bDDScenario.update({
        where: { id: scenarioId },
        data: {
          status,
          errorMessage,
          executedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating BDD scenario status:', error);
      throw new Error('Failed to update BDD scenario status');
    }
  }

  /**
   * Record scenario execution
   */
  async recordExecution(execution: BDDScenarioExecutionResult): Promise<BDDScenarioExecution> {
    try {
      const result = await this.prisma.bDDScenarioExecution.create({
        data: {
          scenarioId: execution.scenarioId,
          status: execution.status,
          executionDuration: execution.executionDuration,
          errorMessage: execution.errorMessage,
          stepResults: execution.stepResults ? JSON.stringify(execution.stepResults) : null,
          environment: execution.environment ?? 'test',
          executedBy: execution.executedBy ?? 'system',
          gherkinSnapshot: '', // Will be populated from current scenario
        },
      });

      // Also update the main scenario record
      await this.updateScenarioStatus(
        execution.scenarioId,
        execution.status,
        execution.errorMessage
      );

      return result;
    } catch (error) {
      console.error('Error recording BDD scenario execution:', error);
      throw new Error('Failed to record BDD scenario execution');
    }
  }

  /**
   * Get scenario execution history
   */
  async getExecutionHistory(scenarioId: string): Promise<BDDScenarioExecution[]> {
    try {
      return await this.prisma.bDDScenarioExecution.findMany({
        where: { scenarioId },
        orderBy: { executedAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching execution history:', error);
      throw new Error('Failed to fetch execution history');
    }
  }

  /**
   * Link scenario to Playwright test
   */
  async linkToPlaywrightTest(
    scenarioId: string,
    testFile: string,
    testName: string
  ): Promise<BDDScenario> {
    try {
      return await this.prisma.bDDScenario.update({
        where: { id: scenarioId },
        data: {
          playwrightTestFile: testFile,
          playwrightTestName: testName,
        },
      });
    } catch (error) {
      console.error('Error linking scenario to Playwright test:', error);
      throw new Error('Failed to link scenario to Playwright test');
    }
  }

  /**
   * Bulk create scenarios from comprehensive BDD file
   */
  async createComprehensiveScenarios(): Promise<{ created: number; scenarios: BDDScenario[] }> {
    try {
      const scenarioInputs = await this.parseComprehensiveBDDScenarios();
      const createdScenarios: BDDScenario[] = [];

      // Create a master task for comprehensive BDD scenarios if it doesn't exist
      let masterTask = await this.prisma.task.findFirst({
        where: { id: 'comprehensive-bdd' },
      });

      masterTask ??= await this.prisma.task.create({
        data: {
          id: 'comprehensive-bdd',
          title: 'Comprehensive BDD Scenarios for All User-Facing Features',
          content: 'Comprehensive BDD Scenarios for All User-Facing Features',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          taskType: 'STORY',
          executorId: 'system',
        },
      });

      // Create scenarios
      for (const scenarioInput of scenarioInputs) {
        // Update taskId to the master task
        scenarioInput.taskId = masterTask.id;

        // Check if scenario already exists
        const existing = await this.prisma.bDDScenario.findFirst({
          where: {
            title: scenarioInput.title,
            taskId: masterTask.id,
          },
        });

        if (!existing) {
          const scenario = await this.createScenario(scenarioInput);
          createdScenarios.push(scenario);
        }
      }

      return {
        created: createdScenarios.length,
        scenarios: createdScenarios,
      };
    } catch (error) {
      console.error('Error creating comprehensive scenarios:', error);
      throw new Error('Failed to create comprehensive BDD scenarios');
    }
  }

  /**
   * Get BDD execution statistics
   */
  async getExecutionStats(): Promise<{
    total: number;
    passed: number;
    failed: number;
    pending: number;
    skipped: number;
    passRate: number;
  }> {
    try {
      const total = await this.prisma.bDDScenario.count();
      const passed = await this.prisma.bDDScenario.count({
        where: { status: BDDScenarioStatus.PASSED },
      });
      const failed = await this.prisma.bDDScenario.count({
        where: { status: BDDScenarioStatus.FAILED },
      });
      const pending = await this.prisma.bDDScenario.count({
        where: { status: BDDScenarioStatus.PENDING },
      });
      const skipped = await this.prisma.bDDScenario.count({
        where: { status: BDDScenarioStatus.SKIPPED },
      });

      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      return {
        total,
        passed,
        failed,
        pending,
        skipped,
        passRate,
      };
    } catch (error) {
      console.error('Error fetching BDD execution stats:', error);
      throw new Error('Failed to fetch BDD execution statistics');
    }
  }

  /**
   * Execute scenario (mock implementation for now)
   */
  async executeScenario(scenarioId: string): Promise<BDDScenarioExecutionResult> {
    try {
      const scenario = await this.prisma.bDDScenario.findUnique({
        where: { id: scenarioId },
      });

      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Mock execution - in real implementation, this would run the actual test
      const mockSuccess = Math.random() > 0.3; // 70% pass rate
      const duration = Math.floor(Math.random() * 5000) + 1000; // 1-6 seconds

      const result: BDDScenarioExecutionResult = {
        scenarioId,
        status: mockSuccess ? BDDScenarioStatus.PASSED : BDDScenarioStatus.FAILED,
        executionDuration: duration,
        errorMessage: mockSuccess ? undefined : 'Mock test failure',
        environment: 'test',
        executedBy: 'system',
      };

      await this.recordExecution(result);
      return result;
    } catch (error) {
      console.error('Error executing BDD scenario:', error);
      throw new Error('Failed to execute BDD scenario');
    }
  }
}
