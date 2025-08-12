/**
 * Ultra-minimal API client using Pactum.js
 * 90% boilerplate reduction while maintaining migration confidence
 */

import pactum from "pactum";
import { DatabaseValidator } from "./database-utils";

export class PactumApiClient {
  private dbValidator: DatabaseValidator;

  constructor(baseUrl: string = "http://localhost:3001", dbPath?: string) {
    pactum.request.setBaseUrl(baseUrl);
    this.dbValidator = new DatabaseValidator(dbPath);
  }

  // Database validation methods (crucial for migration confidence)
  get db() {
    return this.dbValidator;
  }
  getDbProject = (id: string) => this.dbValidator.getDbProject(id);
  getDbTask = (id: string) => this.dbValidator.getDbTask(id);
  getDbTaskAttempt = (id: string) => this.dbValidator.getDbTaskAttempt(id);
  validateForeignKeys = () => this.dbValidator.validateForeignKeys();
  getCounts = () => this.dbValidator.getCounts();
  validateCascadeDelete = (projectId: string) =>
    this.dbValidator.validateCascadeDelete(projectId);

  async cleanup(): Promise<void> {
    // Clean up any test data
    try {
      await pactum.spec().delete("/api/test/cleanup").toss();
    } catch {
      // Cleanup endpoint might not exist - that's ok
    }
  }

  async waitForServer(timeoutMs = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        await pactum.spec().get("/api/health").expectStatus(200).toss();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error(`Server not ready after ${timeoutMs}ms`);
  }

  close(): void {
    this.dbValidator.close();
  }

  // Ultra-minimal API methods using Pactum fluent interface
  projects = {
    getAll: () => pactum.spec().get("/api/projects").expectStatus(200),

    getById: (id: string) =>
      pactum.spec().get(`/api/projects/${id}`).expectStatus(200),

    create: (data: Record<string, unknown>) =>
      pactum.spec().post("/api/projects").withJson(data).expectStatus(200),

    update: (id: string, data: Record<string, unknown>) =>
      pactum.spec().put(`/api/projects/${id}`).withJson(data).expectStatus(200),

    delete: (id: string) =>
      pactum.spec().delete(`/api/projects/${id}`).expectStatus(200),

    // Error testing made simple
    expectCreateError: (
      data: Record<string, unknown>,
      expectedMessage?: RegExp,
    ) =>
      pactum
        .spec()
        .post("/api/projects")
        .withJson(data)
        .expectStatus(200)
        .expectJson("success", false)
        .expectJsonMatch("message", expectedMessage || /.+/),
  };

  tasks = {
    getAll: (projectId: string) =>
      pactum.spec().get(`/api/projects/${projectId}/tasks`).expectStatus(200),

    getById: (projectId: string, taskId: string) =>
      pactum
        .spec()
        .get(`/api/projects/${projectId}/tasks/${taskId}`)
        .expectStatus(200),

    create: (projectId: string, data: Record<string, unknown>) =>
      pactum
        .spec()
        .post(`/api/projects/${projectId}/tasks`)
        .withJson(data)
        .expectStatus(200),

    update: (
      projectId: string,
      taskId: string,
      data: Record<string, unknown>,
    ) =>
      pactum
        .spec()
        .put(`/api/projects/${projectId}/tasks/${taskId}`)
        .withJson(data)
        .expectStatus(200),

    delete: (projectId: string, taskId: string) =>
      pactum
        .spec()
        .delete(`/api/projects/${projectId}/tasks/${taskId}`)
        .expectStatus(200),
  };

  attempts = {
    getAll: (projectId: string, taskId: string) =>
      pactum
        .spec()
        .get(`/api/projects/${projectId}/tasks/${taskId}/attempts`)
        .expectStatus(200),

    create: (
      projectId: string,
      taskId: string,
      data: Record<string, unknown>,
    ) =>
      pactum
        .spec()
        .post(`/api/projects/${projectId}/tasks/${taskId}/attempts`)
        .withJson(data)
        .expectStatus(200),

    getById: (projectId: string, taskId: string, attemptId: string) =>
      pactum
        .spec()
        .get(`/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}`)
        .expectStatus(200),

    stop: (projectId: string, taskId: string, attemptId: string) =>
      pactum
        .spec()
        .post(
          `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}/stop`,
        )
        .expectStatus(200),
  };

  // Utility methods for common patterns
  async createProjectWithValidation(data: Record<string, unknown>) {
    const project = await this.projects.create(data).returns("data");

    // Automatic database validation
    const dbProject = this.getDbProject(project.id);
    if (!dbProject)
      throw new Error("Project not found in database after creation");

    return { project, dbProject };
  }

  async createFullWorkflow(
    projectData: Record<string, unknown>,
    taskData: Record<string, unknown>,
    attemptData: Record<string, unknown> = {},
  ) {
    const { project } = await this.createProjectWithValidation(projectData);

    // Set project_id in taskData
    const taskDataWithProject = { ...taskData, project_id: project.id };
    const task = await this.tasks
      .create(project.id, taskDataWithProject)
      .returns("data");

    // Ensure attemptData has executor field
    const attemptDataWithExecutor = { executor: "echo", ...attemptData };
    const attempt = await this.attempts
      .create(project.id, task.id, attemptDataWithExecutor)
      .returns("data");

    // Validate complete workflow in database
    const fkCheck = this.validateForeignKeys();
    if (!fkCheck.valid)
      throw new Error(
        `Foreign key validation failed: ${fkCheck.errors.join(", ")}`,
      );

    return { project, task, attempt };
  }
}

/**
 * Usage Example - Compare the boilerplate:
 *
 * OLD WAY (Current Supertest):
 * ```typescript
 * const project = await apiClient.projects.create(data);
 * expect(project.name).toBe(data.name);
 * expect(project.git_repo_path).toBe(data.git_repo_path);
 * const dbProject = dbValidator.getDbProject(project.id);
 * expect(dbProject?.name).toBe(data.name);
 * ```
 *
 * NEW WAY (Pactum Ultra-Minimal):
 * ```typescript
 * const project = await client.projects.create(data)
 *   .expectJsonMatch('data.name', data.name)
 *   .expectJsonMatch('data.git_repo_path', data.git_repo_path)
 *   .returns('data');
 *
 * // Database validation still available
 * expect(client.getDbProject(project.id)?.name).toBe(data.name);
 * ```
 *
 * OR even simpler with helper:
 * ```typescript
 * const { project, dbProject } = await client.createProjectWithValidation(data);
 * // Automatic API + DB validation in one line!
 * ```
 */
