import {
  TaskTemplate,
  CreateTaskTemplate,
  UpdateTaskTemplate,
} from "shared/types";
import { TestApiBase } from "./api-base";

/**
 * Templates API - Simplified with Supertest
 */
export class TemplatesApi {
  constructor(private client: TestApiBase) {}

  async getAll(): Promise<TaskTemplate[]> {
    return this.client.get<TaskTemplate[]>("/api/templates");
  }

  async list(): Promise<TaskTemplate[]> {
    return this.getAll();
  }

  async getById(templateId: string): Promise<TaskTemplate> {
    return this.client.get<TaskTemplate>(`/api/templates/${templateId}`);
  }

  async create(data: CreateTaskTemplate): Promise<TaskTemplate> {
    return this.client.post<TaskTemplate>("/api/templates", data);
  }

  async update(
    templateId: string,
    data: UpdateTaskTemplate,
  ): Promise<TaskTemplate> {
    return this.client.put<TaskTemplate>(`/api/templates/${templateId}`, data);
  }

  async delete(templateId: string): Promise<void> {
    return this.client.delete(`/api/templates/${templateId}`);
  }
}
