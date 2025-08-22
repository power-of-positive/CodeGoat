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

describe('WorkersDashboard - Merge Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('merge worktree functionality', () => {
    it('handles merge worktree success with changes', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'completed' as const,
          startTime: '2025-08-19T08:00:00Z',
          endTime: '2025-08-19T08:05:00Z',
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
          validationPassed: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.mergeWorktree.mockResolvedValue({
        message: 'Successfully merged',
        workerId: 'worker-123-abc',
        mergedBranch: 'main',
        hasChanges: true,
      });

      // Mock window.confirm and window.alert
      window.confirm = jest.fn(() => true);
      window.alert = jest.fn();

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const mergeButton = screen.getByText('Merge');
        expect(mergeButton).toBeInTheDocument();
        fireEvent.click(mergeButton);
      });

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to merge the worktree changes to the main branch?');

      await waitFor(() => {
        expect(mockWorkersApi.mergeWorktree).toHaveBeenCalledWith('worker-123-abc');
        expect(window.alert).toHaveBeenCalledWith('Successfully merged changes from worker-123-abc with changes committed');
      });
    });

    it('handles merge worktree success without changes', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'completed' as const,
          startTime: '2025-08-19T08:00:00Z',
          endTime: '2025-08-19T08:05:00Z',
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
          validationPassed: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.mergeWorktree.mockResolvedValue({
        message: 'Successfully merged',
        workerId: 'worker-123-abc',
        mergedBranch: 'main',
        hasChanges: false,
      });

      window.confirm = jest.fn(() => true);
      window.alert = jest.fn();

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const mergeButton = screen.getByText('Merge');
        fireEvent.click(mergeButton);
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Successfully merged changes from worker-123-abc (no changes to commit)');
      });
    });

    it('handles merge worktree error', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'completed' as const,
          startTime: '2025-08-19T08:00:00Z',
          endTime: '2025-08-19T08:05:00Z',
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
          validationPassed: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      mockWorkersApi.mergeWorktree.mockRejectedValue(new Error('Merge failed'));

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
        const mergeButton = screen.getByText('Merge');
        fireEvent.click(mergeButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to merge worktree:', expect.any(Error));
        expect(window.alert).toHaveBeenCalledWith('Failed to merge worktree. Please check the console for details.');
      });

      consoleSpy.mockRestore();
    });

    it('handles merge worktree cancellation', async () => {
      const mockWorkers = [
        {
          id: 'worker-123-abc',
          taskId: 'task-1',
          taskContent: 'Test task content',
          status: 'completed' as const,
          startTime: '2025-08-19T08:00:00Z',
          endTime: '2025-08-19T08:05:00Z',
          logFile: '/path/to/log.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
          validationPassed: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      window.confirm = jest.fn(() => false);

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
        if (workerCard) {
          fireEvent.click(workerCard);
        }
      });

      await waitFor(() => {
        const mergeButton = screen.getByText('Merge');
        fireEvent.click(mergeButton);
      });

      expect(window.confirm).toHaveBeenCalled();
      expect(mockWorkersApi.mergeWorktree).not.toHaveBeenCalled();
    });
  });
});