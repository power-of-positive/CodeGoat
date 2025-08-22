import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WorkersDashboard } from './WorkersDashboard';
import { claudeWorkersApi } from '../lib/api';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the API
jest.mock('../lib/api', () => ({
  claudeWorkersApi: {
    getWorkersStatus: jest.fn(),
    getWorkerLogs: jest.fn(),
    stopWorker: jest.fn(),
    mergeWorktree: jest.fn(),
    openVSCode: jest.fn(),
  },
}));

// Mock ValidationRunsViewer
jest.mock('../components/ValidationRunsViewer', () => ({
  ValidationRunsViewer: ({ workerId, onClose }: any) => (
    <div data-testid="validation-runs-viewer">
      Validation Runs for {workerId}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock BlockedCommandsViewer
jest.mock('../components/BlockedCommandsViewer', () => ({
  BlockedCommandsViewer: ({ workerId, onClose }: any) => (
    <div data-testid="blocked-commands-viewer">
      Blocked Commands for {workerId}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock LogsViewer
jest.mock('../components/logs/LogsViewer', () => {
  return function MockLogsViewer({ entries, followOutput, className, useVibeLogComponent }: any) {
    return (
      <div data-testid="logs-viewer" className={className}>
        <div>Log entries: {entries?.length || 0}</div>
        <div>Follow output: {followOutput ? 'true' : 'false'}</div>
        <div>Use vibe component: {useVibeLogComponent ? 'true' : 'false'}</div>
      </div>
    );
  };
});

const mockWorkersApi = claudeWorkersApi as jest.Mocked<typeof claudeWorkersApi>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WorkersDashboard - VSCode Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VSCode functionality', () => {
    it('handles VSCode open success', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'running' as const,
          startTime: '2025-08-19T08:00:00Z',
          pid: 12345,
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 1,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.openVSCode.mockResolvedValue({
        message: 'VSCode opened',
        workerId: 'worker-123-abc',
        worktreePath: '/path/to/worktree',
      });

      window.alert = jest.fn();

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const vscodeButton = screen.getByText('VSCode');
        expect(vscodeButton).toBeInTheDocument();
        fireEvent.click(vscodeButton);
      });

      await waitFor(() => {
        expect(mockWorkersApi.openVSCode).toHaveBeenCalledWith('worker-123-abc');
        expect(window.alert).toHaveBeenCalledWith('VSCode opened for worktree: /path/to/worktree');
      });
    });

    it('handles VSCode error with CLI tools message', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'running' as const,
          startTime: '2025-08-19T08:00:00Z',
          pid: 12345,
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 1,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.openVSCode.mockRejectedValue(new Error('VSCode command line tools not found'));

      window.alert = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const vscodeButton = screen.getByText('VSCode');
        fireEvent.click(vscodeButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to open VSCode:', expect.any(Error));
        expect(window.alert).toHaveBeenCalledWith(
          'VSCode command line tools not found. Please install VSCode and enable shell command integration from the Command Palette.'
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles VSCode generic error', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'running' as const,
          startTime: '2025-08-19T08:00:00Z',
          pid: 12345,
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 1,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.openVSCode.mockRejectedValue(new Error('Generic VSCode error'));

      window.alert = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const vscodeButton = screen.getByText('VSCode');
        fireEvent.click(vscodeButton);
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to open VSCode: Generic VSCode error');
      });

      consoleSpy.mockRestore();
    });

    it('handles VSCode non-Error object failure', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'running' as const,
          startTime: '2025-08-19T08:00:00Z',
          pid: 12345,
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 1,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.openVSCode.mockRejectedValue('String error');

      window.alert = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const vscodeButton = screen.getByText('VSCode');
        fireEvent.click(vscodeButton);
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to open VSCode: Unknown error occurred');
      });

      consoleSpy.mockRestore();
    });
  });
});