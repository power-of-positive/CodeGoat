/**
 * Test scenario definitions with metadata
 */
export interface TestScenario {
  name: string;
  description: string;
  projects: number;
  tasks: number;
  attempts: number;
  processes: number;
  templates: number;
}

/**
 * Predefined test scenarios for common use cases
 */
export const TEST_SCENARIOS = {
  EMPTY_DATABASE: {
    name: 'EMPTY_DATABASE',
    description: 'empty database with no data',
    projects: 0,
    tasks: 0,
    attempts: 0,
    processes: 0,
    templates: 0
  },
  
  SINGLE_PROJECT: {
    name: 'SINGLE_PROJECT',
    description: 'Database with a single project',
    projects: 1,
    tasks: 0,
    attempts: 0,
    processes: 0,
    templates: 0
  },
  
  SINGLE_TASK: {
    name: 'SINGLE_TASK',
    description: 'Database with one project and one task',
    projects: 1,
    tasks: 1,
    attempts: 0,
    processes: 0,
    templates: 0
  },
  
  MULTIPLE_PROJECTS: {
    name: 'MULTIPLE_PROJECTS',
    description: 'Database with multiple projects',
    projects: 3,
    tasks: 0,
    attempts: 0,
    processes: 0,
    templates: 0
  },
  
  COMPLETE_PROJECT_STRUCTURE: {
    name: 'COMPLETE_PROJECT_STRUCTURE',
    description: 'Complete project with tasks, attempts, and processes',
    projects: 1,
    tasks: 3,
    attempts: 3,
    processes: 3,
    templates: 0
  },
  
  NESTED_TASKS: {
    name: 'NESTED_TASKS',
    description: 'Project with nested task hierarchy',
    projects: 1,
    tasks: 4, // 1 parent + 3 children
    attempts: 4,
    processes: 0,
    templates: 0
  },
  
  WITH_TEMPLATES: {
    name: 'WITH_TEMPLATES',
    description: 'Database with task templates',
    projects: 1,
    tasks: 0,
    attempts: 0,
    processes: 0,
    templates: 2
  }
} as const;

// String constants for backward compatibility
export const SCENARIO_KEYS = {
  EMPTY_DATABASE: 'empty-database',
  SINGLE_PROJECT: 'single-project',
  SINGLE_TASK: 'single-task',
  MULTIPLE_PROJECTS: 'multiple-projects',
  COMPLETE_PROJECT_STRUCTURE: 'complete-project-structure',
  NESTED_TASKS: 'nested-tasks',
  WITH_TEMPLATES: 'with-templates'
} as const;

export type TestScenarioKey = typeof SCENARIO_KEYS[keyof typeof SCENARIO_KEYS];