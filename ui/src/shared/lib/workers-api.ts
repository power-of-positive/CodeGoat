import { apiRequest } from './api-base';
import { Worker, ValidationRun, BlockedCommand } from '../types/index';
import type {
  StartWorkerRequest,
  SendMessageRequest,
  SendFollowUpRequest,
  MergeWorkerRequest,
} from '../schemas';

interface WorkersStatusResponse {
  workers: Worker[];
  activeCount: number;
  totalCount: number;
  totalBlockedCommands: number;
}

export const claudeWorkersApi = {
  /**
   * Start a new Claude Code worker
   * Now type-safe with Zod schema validation!
   */
  async startWorker(request: StartWorkerRequest): Promise<Worker> {
    return apiRequest<Worker>('/claude-workers/start', {
      method: 'POST',
      body: request,
    });
  },

  async getWorkers(): Promise<Worker[]> {
    try {
      return await apiRequest<Worker[]>('/claude-workers');
    } catch (error) {
      console.error('Failed to fetch workers:', error);
      return [];
    }
  },

  async getWorkersStatus(): Promise<WorkersStatusResponse> {
    try {
      return await apiRequest<WorkersStatusResponse>('/claude-workers/status');
    } catch (error) {
      console.error('Failed to fetch workers status:', error);
      return {
        workers: [],
        activeCount: 0,
        totalCount: 0,
        totalBlockedCommands: 0,
      };
    }
  },

  async getWorkerStatus(workerId: string): Promise<Worker> {
    return apiRequest<Worker>(`/claude-workers/${workerId}`);
  },

  async stopWorker(workerId: string, cleanupWorktree?: boolean): Promise<void> {
    const queryParams = cleanupWorktree ? '?cleanupWorktree=true' : '';
    await apiRequest<void>(`/claude-workers/${workerId}/stop${queryParams}`, {
      method: 'POST',
    });
  },

  async deleteWorker(workerId: string): Promise<void> {
    await apiRequest<void>(`/claude-workers/${workerId}`, {
      method: 'DELETE',
    });
  },

  async getWorkerLogs(
    workerId: string,
    options?: {
      lines?: number;
      follow?: boolean;
    }
  ): Promise<string[]> {
    const queryParams = new URLSearchParams();
    if (options?.lines) {
      queryParams.set('lines', options.lines.toString());
    }
    if (options?.follow) {
      queryParams.set('follow', 'true');
    }

    const queryString = queryParams.toString();
    return apiRequest<string[]>(
      `/claude-workers/${workerId}/logs${queryString ? `?${queryString}` : ''}`
    );
  },

  async mergeWorktree(workerId: string, commitMessage?: string): Promise<void> {
    const body = commitMessage ? { commitMessage } : {};
    await apiRequest<void>(`/claude-workers/${workerId}/merge`, {
      method: 'POST',
      body,
    });
  },

  async openVSCode(workerId: string): Promise<void> {
    await apiRequest<void>(`/claude-workers/${workerId}/open-vscode`, {
      method: 'POST',
    });
  },

  async getBlockedCommands(): Promise<BlockedCommand[]> {
    try {
      return await apiRequest<BlockedCommand[]>('/claude-workers/blocked-commands');
    } catch (error) {
      console.error('Failed to fetch blocked commands:', error);
      return [];
    }
  },

  async getValidationRuns(): Promise<ValidationRun[]> {
    try {
      return await apiRequest<ValidationRun[]>('/claude-workers/validation-runs');
    } catch (error) {
      console.error('Failed to fetch validation runs:', error);
      return [];
    }
  },

  async getValidationRunDetails(runId: string): Promise<ValidationRun> {
    return apiRequest<ValidationRun>(`/claude-workers/validation-runs/${runId}`);
  },

  async sendMessage(workerId: string, message: string): Promise<void> {
    await apiRequest<void>(`/claude-workers/${workerId}/message`, {
      method: 'POST',
      body: { message },
    });
  },

  async sendFollowup(workerId: string, message: string): Promise<void> {
    await apiRequest<void>(`/claude-workers/${workerId}/followup`, {
      method: 'POST',
      body: { message },
    });
  },

  async mergeWorkerChanges(
    workerId: string,
    options?: {
      commitMessage?: string;
      squash?: boolean;
    }
  ): Promise<void> {
    await apiRequest<void>(`/claude-workers/${workerId}/merge`, {
      method: 'POST',
      body: options || {},
    });
  },

  async startDevServer(
    workerId: string,
    type?: 'backend' | 'frontend' | 'both'
  ): Promise<{
    message: string;
    workerId: string;
    worktreePath: string;
    servers: Array<{ type: string; port: number; pid?: number }>;
  }> {
    return apiRequest(`/claude-workers/${workerId}/start-dev-server`, {
      method: 'POST',
      body: { type: type || 'both' },
    });
  },

  async stopDevServer(
    workerId: string,
    type?: 'backend' | 'frontend' | 'both'
  ): Promise<{
    message: string;
    workerId: string;
    stopped: string[];
  }> {
    return apiRequest(`/claude-workers/${workerId}/stop-dev-server`, {
      method: 'POST',
      body: { type: type || 'both' },
    });
  },

  async getDevServerStatus(workerId: string): Promise<{
    workerId: string;
    status: {
      backend: { running: boolean; port?: number; pid?: number };
      frontend: { running: boolean; port?: number; pid?: number };
    };
  }> {
    return apiRequest(`/claude-workers/${workerId}/dev-server-status`);
  },

  async generateCommitMessage(workerId: string): Promise<{
    commitMessage: string;
    changedFiles: string[];
    diffStat: string;
    summary: {
      filesChanged: number;
      fileTypes: Record<string, number>;
      directories: string[];
    };
  }> {
    return apiRequest(`/claude-workers/${workerId}/generate-commit-message`);
  },

  async getWorkerDiff(workerId: string): Promise<{
    diff: string;
    diffStat: string;
    changedFiles: Array<{ status: string; path: string }>;
    worktreePath: string;
  }> {
    return apiRequest(`/claude-workers/${workerId}/diff`);
  },
};
