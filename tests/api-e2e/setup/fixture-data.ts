import { faker } from '@faker-js/faker';
import { CreateProject, CreateTask, CreateTaskAttempt, CreateTaskTemplate } from 'shared/types';

/**
 * Data factory utilities for generating test data
 */
export class DataFactory {
  /**
   * Create a project with realistic test data
   */
  static createProjectData(overrides: Partial<CreateProject> = {}): CreateProject {
    return {
      name: faker.company.name(),
      git_repo_path: `/tmp/test-projects/${faker.string.uuid()}`,
      use_existing_repo: false,
      setup_script: faker.datatype.boolean() ? 'npm install' : null,
      dev_script: faker.datatype.boolean() ? 'npm run dev' : null,
      cleanup_script: faker.datatype.boolean() ? 'npm run clean' : null,
      ...overrides
    };
  }

  /**
   * Create a task with realistic test data
   */
  static createTaskData(overrides: Partial<CreateTask> = {}): CreateTask {
    return {
      project_id: faker.string.uuid(), // Will be overridden when used
      title: faker.hacker.phrase(),
      description: faker.lorem.paragraphs(2),
      parent_task_attempt: null,
      ...overrides
    };
  }

  /**
   * Create a task attempt with realistic test data
   */
  static createTaskAttemptData(overrides: Partial<CreateTaskAttempt> = {}): CreateTaskAttempt {
    return {
      executor: faker.helpers.arrayElement(['claude', 'gemini', 'custom']),
      base_branch: 'main',
      ...overrides
    };
  }

  /**
   * Create a task template with realistic test data
   */
  static createTaskTemplateData(overrides: Partial<CreateTaskTemplate> = {}): CreateTaskTemplate {
    return {
      template_name: faker.lorem.words(3).replace(/\s+/g, '-'),
      title: faker.hacker.phrase(),
      description: faker.lorem.paragraph(),
      project_id: null,
      ...overrides
    };
  }
}