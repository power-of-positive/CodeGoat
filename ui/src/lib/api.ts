import axios from 'axios';

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
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  }
};

// Templates API
export const templatesApi = {
  listByProject: async (projectId: string) => {
    const response = await api.get(`/templates/project/${projectId}`);
    return response.data;
  },
  
  listGlobal: async () => {
    const response = await api.get('/templates/global');
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/templates', data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/templates/${id}`);
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
          editor_type: 'vscode' as const,
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
  getById: async (id: string) => ({ data: null }),
  create: async (data: any) => ({ data }),
  openEditor: async (id: string) => ({ success: true }),
  stop: async (id: string) => ({ success: true }),
  getDetails: async (id: string) => ({ data: null }),
  merge: async (id: string) => ({ success: true }),
  rebase: async (id: string, branch?: string) => ({ success: true }),
  getBranchStatus: async (id: string) => ({ 
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
  createPR: async (data: any) => ({ success: true, pr_url: 'https://github.com/example/repo/pull/1' }),
  startDevServer: async (id: string) => ({ success: true })
};

// Execution Processes API (placeholder)
export const executionProcessesApi = {
  getAll: async () => ({ data: [] }),
  getById: async (id: string) => ({ data: null }),
  getExecutionProcesses: async (attemptId: string) => ({ data: [] }),
  getDetails: async (id: string) => ({ data: null }),
  stopExecutionProcess: async (id: string) => ({ success: true })
};

// File System API (placeholder)
export const fileSystemApi = {
  searchFiles: async (query: string) => ({ data: [] }),
  listDirectory: async (path: string) => ({ data: [] }),
  list: async (path: string) => ({ data: [] })
};

export default api;