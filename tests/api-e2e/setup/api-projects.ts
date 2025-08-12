import {
  Project,
  CreateProject,
  UpdateProject,
  GitBranch,
  CreateBranch,
} from "shared/types";
import { TestApiBase } from "./api-base";

/**
 * Projects API - Simplified with Supertest (massive boilerplate reduction)
 */
export class ProjectsApi {
  constructor(private client: TestApiBase) {}

  async getAll(): Promise<Project[]> {
    return this.client.get<Project[]>("/api/projects");
  }

  async getById(id: string): Promise<Project> {
    return this.client.get<Project>(`/api/projects/${id}`);
  }

  async create(data: CreateProject): Promise<Project> {
    return this.client.post<Project>("/api/projects", data);
  }

  async update(id: string, data: UpdateProject): Promise<Project> {
    return this.client.put<Project>(`/api/projects/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete(`/api/projects/${id}`);
  }

  async getBranches(id: string): Promise<GitBranch[]> {
    return this.client.get<GitBranch[]>(`/api/projects/${id}/branches`);
  }

  async createBranch(id: string, data: CreateBranch): Promise<GitBranch> {
    return this.client.post<GitBranch>(`/api/projects/${id}/branches`, data);
  }
}
