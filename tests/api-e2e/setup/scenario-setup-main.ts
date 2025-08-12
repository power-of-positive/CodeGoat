import { TestDatabase } from './test-database';
import { TestFixtures, createTestFixtures } from './fixtures';
import { TEST_SCENARIOS, TestScenario, SCENARIO_KEYS } from './fixture-scenarios';
import { 
  createMultipleProjects, 
  createCompleteProjectStructure, 
  createProjectWithNestedTasks, 
  createTestTemplates 
} from './scenario-setup-helpers';

/**
 * Set up database with predefined test scenario
 */
export async function setUpTestScenario(
  db: TestDatabase, 
  scenario: TestScenario | string
): Promise<any> {
  const fixtures = createTestFixtures(db);
  
  const scenarioKey = typeof scenario === 'string' ? scenario : scenario.name.toLowerCase().replace(/_/g, '-');
  
  switch (scenarioKey) {
    case SCENARIO_KEYS.EMPTY_DATABASE:
      await db.clearData();
      return {
        project: undefined,
        projects: [],
        tasks: [],
        attempts: [],
        processes: [],
        templates: []
      };
    
    case SCENARIO_KEYS.SINGLE_PROJECT:
      await db.clearData();
      const project = await fixtures.insertProject();
      return { 
        project,
        projects: [project],
        tasks: [],
        attempts: [],
        processes: [],
        templates: []
      };
    
    case SCENARIO_KEYS.SINGLE_TASK:
      await db.clearData();
      const singleProject = await fixtures.insertProject();
      const task = await fixtures.insertTask(singleProject.id);
      return { project: singleProject, task };
    
    case SCENARIO_KEYS.MULTIPLE_PROJECTS:
      await db.clearData();
      const projects = await createMultipleProjects(fixtures, 3);
      return { 
        projects,
        project: projects[0],
        tasks: [],
        attempts: [],
        processes: [],
        templates: []
      };
    
    case SCENARIO_KEYS.COMPLETE_PROJECT_STRUCTURE:
      await db.clearData();
      return await createCompleteProjectStructure(fixtures);
    
    case SCENARIO_KEYS.NESTED_TASKS:
      await db.clearData();
      return await createProjectWithNestedTasks(fixtures);
    
    case SCENARIO_KEYS.WITH_TEMPLATES:
      await db.clearData();
      const templatesData = await createTestTemplates(fixtures);
      return {
        project: templatesData.project,
        projects: [templatesData.project],
        tasks: [],
        attempts: [],
        processes: [],
        templates: templatesData.templates
      };
    
    default:
      throw new Error(`Unknown test scenario: ${scenarioKey}`);
  }
}