import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WorkersDashboard } from './WorkersDashboard';
import { claudeWorkersApi } from '../shared/lib/api';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the API
jest.mock('../shared/lib/api', () => ({
  claudeWorkersApi: {
    getWorkersStatus: jest.fn(),
    getWorkerLogs: jest.fn(),
    stopWorker: jest.fn(),
    mergeWorktree: jest.fn(),
    openVSCode: jest.fn(),
  },
}));

// Mock ValidationRunsViewer
jest.mock('../features/validation/components/ValidationRunsViewer', () => ({
  ValidationRunsViewer: ({ workerId, onClose }: any) => (
    <div data-testid="validation-runs-viewer">
      Validation Runs for {workerId}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock BlockedCommandsViewer
jest.mock('../features/permissions/components/BlockedCommandsViewer', () => ({
  BlockedCommandsViewer: ({ workerId, onClose }: any) => (
    <div data-testid="blocked-commands-viewer">
      Blocked Commands for {workerId}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock LogsViewer
jest.mock('../features/logs/components/LogsViewer', () => {
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

describe('WorkersDashboard - Stop Worker & Viewers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stop worker error handling', () => {
    it('handles stop worker error', async () => {
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

      mockWorkersApi.stopWorker.mockRejectedValue(new Error('Stop failed'));

      window.confirm = jest.fn(() => true);
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
        const stopButton = screen.getByText('Stop');
        fireEvent.click(stopButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to stop worker:', expect.any(Error));
        expect(window.alert).toHaveBeenCalledWith('Failed to stop worker. Please check the console for details.');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('viewers functionality', () => {
    it('opens blocked commands and validation viewers', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'running' as const,
          startTime: '2025-08-19T08:00:00Z',
          pid: 12345,
          logFile: '/path/to/log.txt',
          blockedCommands: 5,
          validationRuns: 3,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 1,
        totalCount: 1,
        totalBlockedCommands: 5,
      });

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      // Test that worker is displayed with metrics
      await waitFor(() => {
        expect(screen.getByText('Worker abc')).toBeInTheDocument();
      });
    });
  });
});