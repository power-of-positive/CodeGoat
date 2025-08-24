import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WorkersDashboard } from './WorkersDashboard';
import { claudeWorkersApi } from '../shared/lib/api';

// Mock the API
jest.mock('../shared/lib/api', () => ({
  claudeWorkersApi: {
    getWorkersStatus: jest.fn(),
  },
}));

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

describe('WorkersDashboard Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('additional functionality coverage', () => {
    it('displays correct stats with all completed workers', async () => {
      const mockWorkers = [
        {
          id: 'worker-1',
          taskId: 'task-1',
          taskContent: 'Task 1',
          status: 'completed' as const,
          startTime: '2025-08-19T08:00:00Z',
          endTime: '2025-08-19T08:05:00Z',
          logFile: '/path/to/log1.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
        {
          id: 'worker-2',
          taskId: 'task-2',
          taskContent: 'Task 2',
          status: 'completed' as const,
          startTime: '2025-08-19T08:10:00Z',
          endTime: '2025-08-19T08:15:00Z',
          logFile: '/path/to/log2.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 2,
        totalBlockedCommands: 0,
      });

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('handles edge case stats calculations', async () => {
      const mockWorkers = [
        {
          id: 'worker-single',
          taskId: 'task-single',
          taskContent: 'Single task',
          status: 'failed' as const,
          startTime: '2025-08-19T08:00:00Z',
          logFile: '/path/to/log.txt',
          blockedCommands: 5,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 1,
        totalBlockedCommands: 5,
      });

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument(); // 0% success rate
      });
    });

    it('calculates success rate correctly with mixed statuses', async () => {
      const mockWorkers = [
        {
          id: 'worker-1',
          taskId: 'task-1',
          taskContent: 'Task 1',
          status: 'completed' as const,
          startTime: '2025-08-19T08:00:00Z',
          endTime: '2025-08-19T08:05:00Z',
          logFile: '/path/to/log1.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
        {
          id: 'worker-2',
          taskId: 'task-2',
          taskContent: 'Task 2',
          status: 'failed' as const,
          startTime: '2025-08-19T07:00:00Z',
          endTime: '2025-08-19T07:05:00Z',
          logFile: '/path/to/log2.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
        {
          id: 'worker-3',
          taskId: 'task-3',
          taskContent: 'Task 3',
          status: 'completed' as const,
          startTime: '2025-08-19T06:00:00Z',
          endTime: '2025-08-19T06:05:00Z',
          logFile: '/path/to/log3.txt',
          blockedCommands: 0,
          hasPermissionSystem: true,
        },
      ];

      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: mockWorkers,
        activeCount: 0,
        totalCount: 3,
        totalBlockedCommands: 0,
      });

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        // 2 completed out of 3 total = 67% success rate
        expect(screen.getByText('67%')).toBeInTheDocument();
      });
    });

    it('handles workers with blocked commands correctly', async () => {
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
        expect(screen.getByText('Blocked Commands')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('handles refresh button click', async () => {
      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: [],
        activeCount: 0,
        totalCount: 0,
        totalBlockedCommands: 0,
      });

      render(<WorkersDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        expect(refreshButton).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // Verify the API was called again
      expect(mockWorkersApi.getWorkersStatus).toHaveBeenCalledTimes(2);
    });
  });
});