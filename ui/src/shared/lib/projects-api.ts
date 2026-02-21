import { apiRequest } from './api-base';

export interface Project {
  id: string;
  name: string;
  description?: string;
  gitRepoPath: string;
  agentType: 'claude_code' | 'openai_codex' | 'openai_o1' | 'anthropic_api' | 'custom';
  setupScript: string;
  devScript: string;
  cleanupScript: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    taskTemplates: number;
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  gitRepoPath: string;
  agentType?: Project['agentType'];
  setupScript?: string;
  devScript?: string;
  cleanupScript?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  gitRepoPath?: string;
  agentType?: Project['agentType'];
  setupScript?: string;
  devScript?: string;
  cleanupScript?: string;
}

export const projectsApi = {
  // List all projects
  getProjects: async (): Promise<Project[]> => {
    const response = await apiRequest<{ data: Project[] }>('/api/projects');
    return response.data;
  },

  // Get project by ID
  getProject: async (id: string): Promise<Project> => {
    const response = await apiRequest<{ data: Project }>(`/api/projects/${id}`);
    return response.data;
  },

  // Create new project
  createProject: async (data: CreateProjectData): Promise<Project> => {
    const response = await apiRequest<{ data: Project }>('/api/projects', {
      method: 'POST',
      body: data,
    });
    return response.data;
  },

  // Update project
  updateProject: async (id: string, data: UpdateProjectData): Promise<Project> => {
    const response = await apiRequest<{ data: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: data,
    });
    return response.data;
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await apiRequest(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },
};
