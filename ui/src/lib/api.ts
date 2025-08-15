import axios from 'axios';
import { EditorType } from '../../shared/types';

const api = axios.create({
  baseURL: '/api',
});

// Projects API
export const projectsApi = {
  getAll: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/projects', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
  
  openEditor: async (id: string) => {
    const response = await api.post(`/projects/${id}/open-editor`);
    return response.data;
  },

  searchFiles: async (id: string, query: string) => {
    const response = await api.get(`/projects/${id}/search?q=${query}`);
    return response.data;
  }
};

// Tasks API  
export const tasksApi = {
  getAll: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post(`/projects/${data.project_id}/tasks`, data);
    return response.data;
  },
  
  createAndStart: async (data: any) => {
    const response = await api.post('/tasks/create-and-start', data);
    return response.data;
  },
  
  update: async (id: string, data: any, projectId?: string) => {
    // If projectId is provided, use the proper endpoint format
    const endpoint = projectId 
      ? `/projects/${projectId}/tasks/${id}`
      : `/tasks/${id}`; // Fallback for backward compatibility
    const response = await api.put(endpoint, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  }
};


// Config API (placeholder)
export const configApi = {
  getConfig: async () => ({ 
    data: {
      os_type: 'darwin',
      architecture: 'arm64', 
      shell: '/bin/zsh',
      home_directory: '/Users/user',
      current_directory: '/workspace',
      config: {
        theme: 'dark' as const,
        editor: {
          editor_type: EditorType.VSCODE,
          custom_command: null
        },
        sound_enabled: false,
        auto_save: true,
        profile: 'default'
      },
      environment: null,
      profiles: []
    }
  }),
  saveConfig: async (data: any) => ({ data })
};

// GitHub Auth API (placeholder) 
export const githubAuthApi = {
  checkGithubToken: async () => ({ valid: false, data: { token: null, username: null, oauth_token: null } }),
  start: async () => ({ 
    user_code: 'ABC123',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 5,
    auth_url: 'https://github.com/login/device', 
    device_code: 'device123'
  }),
  poll: async () => ({
    status: 'authorization_pending' as const,
    data: null
  })
};

// Attempts API (placeholder)
export const attemptsApi = {
  getAll: async () => ({ data: [] }),
  getById: async (_id: string) => ({ data: null }),
  create: async (data: any) => ({ data }),
  openEditor: async (_id: string, _editorType?: string) => ({ success: true }),
  stop: async (_id: string) => ({ success: true }),
  getDetails: async (_id: string) => ({ data: null }),
  merge: async (_id: string) => ({ success: true }),
  rebase: async (_id: string, _branch?: string) => ({ success: true }),
  getBranchStatus: async (_id: string) => ({ 
    data: {
      is_behind: false,
      commits_behind: 0,
      commits_ahead: 1,
      up_to_date: true,
      can_fast_forward: false,
      can_merge: true,
      diverged: false
    }
  }),
  createPR: async (_data: any) => ({ success: true, pr_url: 'https://github.com/example/repo/pull/1' }),
  startDevServer: async (_id: string) => ({ success: true })
};

// Execution Processes API (placeholder)
export const executionProcessesApi = {
  getAll: async () => ({ data: [] }),
  getById: async (_id: string) => ({ data: null }),
  getExecutionProcesses: async (_attemptId: string) => ({ data: [] }),
  getDetails: async (_id: string) => ({ data: null }),
  stopExecutionProcess: async (_id: string) => ({ success: true })
};

// File System API (placeholder)
export const fileSystemApi = {
  searchFiles: async (_query: string) => ({ data: [] }),
  listDirectory: async (_path: string) => ({ data: [] }),
  list: async (_path: string) => ({ data: [] })
};

export default api;