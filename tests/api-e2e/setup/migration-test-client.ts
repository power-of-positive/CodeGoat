/**
 * Migration Test Client - Simplified API testing with database validation
 * Provides full confidence for Rust->TS migration with comprehensive API/DB testing
 */

import request from "supertest";
import {
  DatabaseValidator,
  Project,
  Task,
  TaskAttempt,
} from "./database-utils";
import { waitForServer } from "./server-utils";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}
export type { Project, Task, TaskAttempt } from "./database-utils";

export class MigrationTestClient {
  private app: ReturnType<typeof request>;
  private dbValidator: DatabaseValidator;
  private createdProjects: string[] = [];

  constructor(baseUrl: string, dbPath: string = "dev_assets/db.sqlite") {
    this.app = request(baseUrl);
    this.dbValidator = new DatabaseValidator(dbPath);
  }

  private unwrapResponse<T>(response: { body?: { data?: T } | T }): T {
    return (response.body as { data?: T })?.data || (response.body as T);
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const projectData = {
      name: `Test Project ${Date.now()}`,
      git_repo_path: `/tmp/test-${Date.now()}`,
      use_existing_repo: false,
      ...data,
    };
    const response = await this.app
      .post("/api/projects")
      .send(projectData)
      .expect(200);
    const project = this.unwrapResponse<Project>(response);
    this.createdProjects.push(project.id);
    return project;
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.app.get(`/api/projects/${id}`).expect(200);
    return this.unwrapResponse<Project>(response);
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const response = await this.app
      .put(`/api/projects/${id}`)
      .send(data)
      .expect(200);
    return this.unwrapResponse<Project>(response);
  }

  async deleteProject(id: string): Promise<void> {
    await this.app.delete(`/api/projects/${id}`).expect(200);
    this.createdProjects = this.createdProjects.filter((p) => p !== id);
  }

  async listProjects(): Promise<Project[]> {
    const response = await this.app.get("/api/projects").expect(200);
    return this.unwrapResponse<Project[]>(response);
  }

  async createTask(projectId: string, data: Partial<Task>): Promise<Task> {
    const taskData = {
      project_id: projectId,
      title: `Test Task ${Date.now()}`,
      description: "Test task description",
      status: "todo" as const,
      ...data,
    };
    const response = await this.app
      .post(`/api/projects/${projectId}/tasks`)
      .send(taskData)
      .expect(200);
    return this.unwrapResponse<Task>(response);
  }

  async getTask(projectId: string, taskId: string): Promise<Task> {
    const response = await this.app
      .get(`/api/projects/${projectId}/tasks/${taskId}`)
      .expect(200);
    return this.unwrapResponse<Task>(response);
  }

  async updateTask(
    projectId: string,
    taskId: string,
    data: Partial<Task>,
  ): Promise<Task> {
    const response = await this.app
      .put(`/api/projects/${projectId}/tasks/${taskId}`)
      .send(data)
      .expect(200);
    return this.unwrapResponse<Task>(response);
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.app
      .delete(`/api/projects/${projectId}/tasks/${taskId}`)
      .expect(200);
  }

  async listProjectTasks(projectId: string): Promise<Task[]> {
    const response = await this.app
      .get(`/api/projects/${projectId}/tasks`)
      .expect(200);
    return this.unwrapResponse<Task[]>(response);
  }

  async createTaskAttempt(
    projectId: string,
    taskId: string,
    data: Partial<TaskAttempt> = {},
  ): Promise<TaskAttempt> {
    const attemptData = { executor: "test-executor", ...data };
    const response = await this.app
      .post(`/api/projects/${projectId}/tasks/${taskId}/attempts`)
      .send(attemptData)
      .expect(200);
    return this.unwrapResponse<TaskAttempt>(response);
  }

  async getTaskAttempt(attemptId: string): Promise<TaskAttempt> {
    const response = await this.app
      .get(`/api/attempts/${attemptId}/details`)
      .expect(200);
    return this.unwrapResponse<TaskAttempt>(response);
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.app.get("/api/health").expect(200);
    return this.unwrapResponse<{ status: string }>(response);
  }

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
    for (const projectId of this.createdProjects) {
      try {
        await this.app.delete(`/api/projects/${projectId}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    this.createdProjects = [];
  }

  async waitForServer(timeoutMs: number = 30000): Promise<void> {
    return waitForServer(this.app, timeoutMs);
  }

  close(): void {
    this.dbValidator.close();
  }
}
