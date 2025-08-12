import {
  TaskAttempt,
  CreateTaskAttempt,
  TaskAttemptState,
  ExecutionProcess,
} from "shared/types";
import { TestApiBase } from "./api-base";

/**
 * Task Attempts API - Simplified with Supertest
 */
export class AttemptsApi {
  constructor(private client: TestApiBase) {}

  async getAll(projectId: string, taskId: string): Promise<TaskAttempt[]> {
    return this.client.get<TaskAttempt[]>(
      `/api/projects/${projectId}/tasks/${taskId}/attempts`,
    );
  }

  async getById(
    projectId: string,
    taskId: string,
    attemptId: string,
  ): Promise<TaskAttempt> {
    return this.client.get<TaskAttempt>(
      `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}`,
    );
  }

  async create(
    projectId: string,
    taskId: string,
    data: CreateTaskAttempt,
  ): Promise<TaskAttempt> {
    return this.client.post<TaskAttempt>(
      `/api/projects/${projectId}/tasks/${taskId}/attempts`,
      data,
    );
  }

  async update(
    projectId: string,
    taskId: string,
    attemptId: string,
    data: Partial<TaskAttempt>,
  ): Promise<TaskAttempt> {
    return this.client.put<TaskAttempt>(
      `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}`,
      data,
    );
  }

  async delete(
    projectId: string,
    taskId: string,
    attemptId: string,
  ): Promise<void> {
    return this.client.delete(
      `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}`,
    );
  }

  async getState(
    projectId: string,
    taskId: string,
    attemptId: string,
  ): Promise<TaskAttemptState> {
    return this.client.get<TaskAttemptState>(
      `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}`,
    );
  }

  async stop(
    projectId: string,
    taskId: string,
    attemptId: string,
  ): Promise<void> {
    return this.client.post(
      `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}/stop`,
    );
  }

  async getProcesses(
    projectId: string,
    taskId: string,
    attemptId: string,
  ): Promise<ExecutionProcess[]> {
    return this.client.get<ExecutionProcess[]>(
      `/api/projects/${projectId}/tasks/${taskId}/attempts/${attemptId}/processes`,
    );
  }

  async waitForCompletion(
    projectId: string,
    taskId: string,
    attemptId: string,
    timeoutMs = 30000,
  ): Promise<TaskAttempt> {
    return this.client.waitFor(async () => {
      const attempt = await this.getById(projectId, taskId, attemptId);
      const processes = await this.getProcesses(projectId, taskId, attemptId);

      const allCompleted = processes.every(
        (p) =>
          p.status === "completed" ||
          p.status === "failed" ||
          p.status === "killed",
      );

      return allCompleted ? attempt : null;
    }, timeoutMs);
  }
}
