export * from "./api-types";
export * from "./api-base";
export * from "./api-projects";
export * from "./api-tasks";
export * from "./api-attempts";
export * from "./api-templates";
export * from "./api-config";

import { TestApiBase } from "./api-base";
import { ProjectsApi } from "./api-projects";
import { TasksApi } from "./api-tasks";
import { AttemptsApi } from "./api-attempts";
import { TemplatesApi } from "./api-templates";
import { ConfigApi } from "./api-config";

/**
 * Simplified API client - massive boilerplate reduction with Supertest
 */
export class TestApiClient extends TestApiBase {
  public readonly projects: ProjectsApi;
  public readonly tasks: TasksApi;
  public readonly attempts: AttemptsApi;
  public readonly templates: TemplatesApi;
  public readonly config: ConfigApi;

  constructor(baseUrl: string = "http://localhost:3001") {
    super(baseUrl);
    this.projects = new ProjectsApi(this);
    this.tasks = new TasksApi(this);
    this.attempts = new AttemptsApi(this);
    this.templates = new TemplatesApi(this);
    this.config = new ConfigApi(this);
  }

  // Health API - simplified
  health = {
    check: async (): Promise<string> => {
      const response = await this.get<string>("/api/health");
      return response || "OK";
    },
  };

  // Execution Processes API - simplified
  processes = {
    getById: async (processId: string) => {
      return this.get(`/api/execution-processes/${processId}`);
    },

    stop: async (processId: string): Promise<void> => {
      return this.post(`/api/execution-processes/${processId}/stop`);
    },
  };
}
