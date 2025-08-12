import { Project, Task, TaskAttempt, TaskTemplate, ExecutionProcess } from 'shared/types';
import { TestDatabase } from './test-database';
import { DataFactory } from './fixture-data';
import { TEST_SCENARIOS, TestScenario } from './fixture-scenarios';
import { insertProject, insertTask, insertTaskAttempt, insertTaskTemplate, insertExecutionProcess } from './fixtures-crud';

export { SCENARIO_KEYS as TEST_SCENARIOS, TestScenario } from './fixture-scenarios';
export { setUpTestScenario } from './scenario-setup';

/**
 * Test data fixtures for generating consistent test fixtures
 */
export class TestFixtures {
  constructor(private db: TestDatabase) {}

  // Data factory methods
  createProjectData = DataFactory.createProjectData;
  createTaskData = DataFactory.createTaskData;
  createTaskAttemptData = DataFactory.createTaskAttemptData;
  createTaskTemplateData = DataFactory.createTaskTemplateData;

  // Database insertion methods
  insertProject = (data: any = {}) => insertProject(this.db, data);
  insertTask = (projectId: string, data: any = {}) => insertTask(this.db, projectId, data);
  insertTaskAttempt = (taskId: string, data: any = {}) => insertTaskAttempt(this.db, taskId, data);
  insertTaskTemplate = (data: any = {}) => insertTaskTemplate(this.db, data);
  insertExecutionProcess = (attemptId: string, data: any = {}) => insertExecutionProcess(this.db, attemptId, data);
}

/**
 * Helper function to create test fixtures instance
 */
export function createTestFixtures(db: TestDatabase): TestFixtures {
  return new TestFixtures(db);
}