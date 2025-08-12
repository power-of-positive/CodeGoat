import {
  Task,
  CreateTask,
  UpdateTask,
  TaskWithAttemptStatus,
} from "shared/types";
import { TestApiBase } from "./api-base";

/**
 * Tasks API - Simplified with Supertest
 */
export class TasksApi {
  constructor(private client: TestApiBase) {}

  async getAll(projectId: string): Promise<TaskWithAttemptStatus[]> {
    return this.client.get<TaskWithAttemptStatus[]>(
      `/api/projects/${projectId}/tasks`,
    );
  }

  async getById(projectId: string, taskId: string): Promise<Task> {
    return this.client.get<Task>(`/api/projects/${projectId}/tasks/${taskId}`);
  }

  async create(projectId: string, data: CreateTask): Promise<Task> {
    return this.client.post<Task>(`/api/projects/${projectId}/tasks`, data);
  }

  async update(
    projectId: string,
    taskId: string,
    data: UpdateTask,
  ): Promise<Task> {
    return this.client.put<Task>(
      `/api/projects/${projectId}/tasks/${taskId}`,
      data,
    );
  }

  async delete(projectId: string, taskId: string): Promise<void> {
    return this.client.delete(`/api/projects/${projectId}/tasks/${taskId}`);
  }
}
