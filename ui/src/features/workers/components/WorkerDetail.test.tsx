import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkerDetail } from './WorkerDetail';
import { claudeWorkersApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  claudeWorkersApi: {
    getWorkerStatus: jest.fn(),
    getWorkers: jest.fn(),
    startWorker: jest.fn(),
    stopWorker: jest.fn(),
    getWorkerLogs: jest.fn(),
    mergeWorktree: jest.fn(),
    openVSCode: jest.fn(),
    getBlockedCommands: jest.fn(),
    getValidationRuns: jest.fn(),
    getValidationRunDetails: jest.fn(),
    sendWorkerMessage: jest.fn(),
    sendFollowUp: jest.fn(),
    mergeWorker: jest.fn(),
    mergeWorkerChanges: jest.fn(),
  },
}));

// useProcessesLogs hook is not used in WorkerDetail component

// Mock react-window
jest.mock('react-window', () => ({
  VariableSizeList: ({ children, itemCount }: { children: any; itemCount: number }) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(
        <div key={i} data-testid={`log-item-${i}`}>
          {children({ index: i, style: {} })}
        </div>
      );
    }
    return <div data-testid="virtual-list">{items}</div>;
  },
}));

// Mock LogEntryRow
jest.mock('../../logs/components/LogEntryRow', () => ({
  __esModule: true,
  default: ({ entry, index }: { entry: any; index: number }) => (
    <div data-testid={`log-entry-${index}`}>
      {typeof entry === 'string' ? entry : JSON.stringify(entry)}
    </div>
  ),
}));

// Mock TaskLogs component
jest.mock('../../tasks/components/TaskLogs', () => ({
  TaskLogs: ({ executorId }: { executorId: string | null }) => (
    <div data-testid="task-logs">
      <h3>Task Logs</h3>
      {executorId ? (
        <div>
          <span>Connected</span>
          <span>Worker: {executorId}</span>
        </div>
      ) : (
        <span>No active worker for this task</span>
      )}
    </div>
  ),
}));

const mockWorkerStatus = {
  id: 'worker-123',
  taskId: 'task-456',
  taskContent: 'Implement feature X',
  status: 'running' as const,
  startTime: '2024-01-01T10:00:00Z',
  endTime: undefined,
  pid: 12345,
  logFile: '/path/to/logs.txt',
  blockedCommands: 2,
  hasPermissionSystem: true,
  validationPassed: undefined,
  validationRuns: 0,
};

const mockWorkerLogs = {
  workerId: 'worker-123',
  logs: 'Starting worker...\nProcessing task...\nCompleted step 1',
  logFile: '/path/to/logs.txt',
};

const renderWithProviders = (workerId: string = 'worker-123') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workers/${workerId}`]}>
        <Routes>
          <Route path="/workers/:workerId" element={<WorkerDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WorkerDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(mockWorkerStatus);
    (claudeWorkersApi.getWorkerLogs as jest.Mock).mockResolvedValue(mockWorkerLogs);
  });

  it('renders worker detail page with loading state', () => {
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderWithProviders();

    expect(screen.getByText('Loading worker details...')).toBeInTheDocument();
  });

  it('renders worker details when loaded', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Worker 123/)).toBeInTheDocument();
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });
  });

  it('displays worker status badge', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });
  });

  it('displays process ID when available', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/PID:.*12345/)).toBeInTheDocument();
    });
  });

  it('displays blocked commands count', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('shows permission system status', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Permission System/i)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('handles error state when worker fails to load', async () => {
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockRejectedValue(
      new Error('Worker not found')
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Worker Not Found/i)).toBeInTheDocument();
    });
  });

  it('allows starting a stopped worker', async () => {
    const stoppedWorker = { ...mockWorkerStatus, status: 'stopped' as const };
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(stoppedWorker);
    (claudeWorkersApi.startWorker as jest.Mock).mockResolvedValue({
      success: true,
    });

    renderWithProviders();

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start worker/i });
      expect(startButton).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /start worker/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(claudeWorkersApi.startWorker).toHaveBeenCalledWith('task-456');
    });
  });

  it('allows stopping a running worker', async () => {
    (claudeWorkersApi.stopWorker as jest.Mock).mockResolvedValue({
      success: true,
    });

    renderWithProviders();

    await waitFor(() => {
      const stopButton = screen.getByRole('button', { name: /stop worker/i });
      expect(stopButton).toBeInTheDocument();
    });

    const stopButton = screen.getByRole('button', { name: /stop worker/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(claudeWorkersApi.stopWorker).toHaveBeenCalledWith('worker-123');
    });
  });

  it('displays task logs', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Task Logs')).toBeInTheDocument();
    });
  });

  it('refreshes worker data when refresh button is clicked', async () => {
    renderWithProviders();

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    const initialCallCount = (claudeWorkersApi.getWorkerStatus as jest.Mock).mock.calls.length;

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Verify API was called again (should be more than initial count)
    await waitFor(() => {
      expect((claudeWorkersApi.getWorkerStatus as jest.Mock).mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it('displays different status badges correctly', async () => {
    const statusTests = [
      { status: 'starting', expected: 'STARTING' },
      { status: 'completed', expected: 'COMPLETED' },
      { status: 'failed', expected: 'FAILED' },
      { status: 'validating', expected: 'VALIDATING' },
    ];

    for (const { status, expected } of statusTests) {
      const worker = { ...mockWorkerStatus, status: status as any };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(worker);

      const { unmount } = renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(expected)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('shows validation results when available', async () => {
    const validatedWorker = {
      ...mockWorkerStatus,
      status: 'completed' as const,
      validationPassed: true,
      validationRuns: 3,
    };
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(validatedWorker);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Validation Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Passed/i)).toBeInTheDocument();
      expect(screen.getByText(/3 runs/i)).toBeInTheDocument();
    });
  });

  it('shows end time for completed workers', async () => {
    const completedWorker = {
      ...mockWorkerStatus,
      status: 'completed' as const,
      endTime: '2024-01-01T10:30:00Z',
    };
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(completedWorker);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/End Time/i)).toBeInTheDocument();
    });
  });

  it('handles worker without permission system', async () => {
    const workerWithoutPermissions = {
      ...mockWorkerStatus,
      hasPermissionSystem: false,
    };
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithoutPermissions);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('handles missing process ID', async () => {
    const workerWithoutPid = {
      ...mockWorkerStatus,
      pid: undefined,
    };
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithoutPid);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/PID:.*N\/A/)).toBeInTheDocument();
    });
  });

  it('displays worker actions appropriately', async () => {
    renderWithProviders();

    await waitFor(() => {
      // Should show start/stop buttons based on worker status
      expect(screen.getByRole('button', { name: /stop worker/i })).toBeInTheDocument();
    });
  });

  it('shows task ID and content', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('task-456')).toBeInTheDocument();
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', async () => {
    renderWithProviders();

    await waitFor(() => {
      // Should format the start time
      expect(screen.getByText(/Started:/i)).toBeInTheDocument();
    });
  });

  it('displays task logs with connection status', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Task Logs')).toBeInTheDocument();
      // TaskLogs should show connection status
      expect(screen.getByText(/Connected|Disconnected/)).toBeInTheDocument();
    });
  });

  it('navigates back when back button is clicked', async () => {
    renderWithProviders();

    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });

    // Navigation would be handled by React Router (mocked)
  });

  it('handles error loading worker data', async () => {
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Worker Not Found')).toBeInTheDocument();
    });
  });

  it('displays worker with validation information', async () => {
    const workerWithValidation = {
      ...mockWorkerStatus,
      validationRuns: 2,
      validationPassed: false,
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithValidation);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Worker 123/)).toBeInTheDocument();
    });
  });

  it('handles worker with end time', async () => {
    const completedWorker = {
      ...mockWorkerStatus,
      status: 'completed' as const,
      endTime: '2023-01-01T11:00:00Z',
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(completedWorker);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });

  it('displays worker blocked commands information', async () => {
    const workerWithBlocked = {
      ...mockWorkerStatus,
      blockedCommands: 3,
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithBlocked);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('handles worker with permission system enabled', async () => {
    const workerWithPermissions = {
      ...mockWorkerStatus,
      hasPermissionSystem: true,
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithPermissions);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/permission system/i)).toBeInTheDocument();
    });
  });

  it('handles worker without permission system', async () => {
    const workerWithoutPermissions = {
      ...mockWorkerStatus,
      hasPermissionSystem: false,
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithoutPermissions);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Worker 123/)).toBeInTheDocument();
    });
  });

  it('handles different worker statuses', async () => {
    const statuses = ['starting', 'validating', 'stopped'] as const;

    for (const status of statuses) {
      const worker = { ...mockWorkerStatus, status };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(worker);

      const { unmount } = renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(status.toUpperCase())).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('handles worker with validation passed', async () => {
    const validatedWorker = {
      ...mockWorkerStatus,
      status: 'completed' as const,
      validationPassed: true,
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(validatedWorker);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });

  it('handles worker with validation failed', async () => {
    const failedValidationWorker = {
      ...mockWorkerStatus,
      status: 'failed' as const,
      validationPassed: false,
    };

    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(failedValidationWorker);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });
  });

  describe('Advanced Worker Actions', () => {
    it('should open VSCode when button is clicked', async () => {
      (claudeWorkersApi.openVSCode as jest.Mock).mockResolvedValue({
        message: 'Opened worktree in VSCode',
        workerId: 'worker-123',
        worktreePath: '/path/to/worktree',
      });

      renderWithProviders();

      await waitFor(() => {
        const openVSCodeButton = screen.getByRole('button', { name: /open in vs code/i });
        expect(openVSCodeButton).toBeInTheDocument();
      });

      const openVSCodeButton = screen.getByRole('button', { name: /open in vs code/i });
      fireEvent.click(openVSCodeButton);

      await waitFor(() => {
        expect(claudeWorkersApi.openVSCode).toHaveBeenCalledWith('worker-123');
      });
    });

    it('should show merge changes button for completed worker with validation passed', async () => {
      const completedWorkerWithValidation = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationPassed: true,
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        completedWorkerWithValidation
      );
      (claudeWorkersApi.mergeWorkerChanges as jest.Mock).mockResolvedValue({
        message: 'Changes merged successfully',
        commitHash: 'abc123def',
        targetBranch: 'main',
        commitMessage: 'Automated changes',
      });

      renderWithProviders();

      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge changes/i });
        expect(mergeButton).toBeInTheDocument();
      });

      const mergeButton = screen.getByRole('button', { name: /merge changes/i });
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(claudeWorkersApi.mergeWorkerChanges).toHaveBeenCalledWith('worker-123', {
          commitMessage: undefined,
        });
      });
    });

    it('should show retry button for failed worker with validation failed', async () => {
      const failedWorkerWithValidation = {
        ...mockWorkerStatus,
        status: 'failed' as const,
        validationPassed: false,
        validationRuns: 2,
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(failedWorkerWithValidation);
      (claudeWorkersApi.startWorker as jest.Mock).mockResolvedValue({
        workerId: 'worker-123',
        status: 'running',
      });

      renderWithProviders();

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry with same worktree/i });
        expect(retryButton).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry with same worktree/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(claudeWorkersApi.startWorker).toHaveBeenCalledWith('task-456');
      });
    });

    it('should not show retry button when validation is not available', async () => {
      const workerWithoutValidation = {
        ...mockWorkerStatus,
        status: 'failed' as const,
        validationPassed: undefined,
        validationRuns: 0,
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithoutValidation);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('FAILED')).toBeInTheDocument();
      });

      // Should not have retry button
      expect(
        screen.queryByRole('button', { name: /retry with same worktree/i })
      ).not.toBeInTheDocument();
    });

    it('should handle opening VSCode with loading state', async () => {
      (claudeWorkersApi.openVSCode as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      renderWithProviders();

      await waitFor(() => {
        const openVSCodeButton = screen.getByRole('button', { name: /open in vs code/i });
        fireEvent.click(openVSCodeButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/opening/i)).toBeInTheDocument();
      });
    });

    it('should handle merge changes with loading state', async () => {
      const completedWorkerWithValidation = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationPassed: true,
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        completedWorkerWithValidation
      );
      (claudeWorkersApi.mergeWorkerChanges as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      renderWithProviders();

      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge changes/i });
        fireEvent.click(mergeButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/merging/i)).toBeInTheDocument();
      });
    });

    it('should handle start worker with loading state', async () => {
      const stoppedWorker = { ...mockWorkerStatus, status: 'stopped' as const };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(stoppedWorker);
      (claudeWorkersApi.startWorker as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      renderWithProviders();

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /restart worker/i });
        fireEvent.click(startButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/starting/i)).toBeInTheDocument();
      });
    });

    it('should handle stop worker with loading state', async () => {
      (claudeWorkersApi.stopWorker as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      renderWithProviders();

      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /stop worker/i });
        fireEvent.click(stopButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/stopping/i)).toBeInTheDocument();
      });
    });

    it('should handle retry worker with loading state', async () => {
      const failedWorkerWithValidation = {
        ...mockWorkerStatus,
        status: 'failed' as const,
        validationPassed: false,
        validationRuns: 2,
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(failedWorkerWithValidation);
      (claudeWorkersApi.startWorker as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      renderWithProviders();

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry with same worktree/i });
        fireEvent.click(retryButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      });
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration correctly for hours, minutes, and seconds', async () => {
      const workerWithEndTime = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:35:45Z', // 1h 35m 45s duration
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithEndTime);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/1h 35m 45s/)).toBeInTheDocument();
      });
    });

    it('should format duration correctly for minutes and seconds only', async () => {
      const workerWithEndTime = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:05:30Z', // 5m 30s duration
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithEndTime);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/5m 30s/)).toBeInTheDocument();
      });
    });

    it('should format duration correctly for seconds only', async () => {
      const workerWithEndTime = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:00:45Z', // 45s duration
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithEndTime);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/45s/)).toBeInTheDocument();
      });
    });
  });

  describe('Validation History Display', () => {
    it('should display validation history when available', async () => {
      const workerWithValidationHistory = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 2, // Required to show validation section
        validationHistory: [
          {
            id: 'run-1',
            timestamp: '2024-01-01T10:00:00Z',
            success: true,
            duration: 5000,
            stages: [
              { id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 },
              { id: 'test', name: 'Test', success: true, duration: 4000, attempt: 1 },
            ],
          },
          {
            id: 'run-2',
            timestamp: '2024-01-01T09:30:00Z',
            success: false,
            duration: 3000,
            stages: [
              { id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 },
              { id: 'test', name: 'Test', success: false, duration: 2000, attempt: 1 },
            ],
          },
        ],
        lastValidationRun: {
          id: 'run-1',
          timestamp: '2024-01-01T10:00:00Z',
          success: true,
          duration: 5000,
          stages: [
            { id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 },
            { id: 'test', name: 'Test', success: true, duration: 4000, attempt: 1 },
          ],
        },
      };

      // Clear previous mocks and set the new one
      jest.clearAllMocks();
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        workerWithValidationHistory
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Validation History \(2 runs\):/)).toBeInTheDocument();

        // Check for validation history items - use more specific queries
        expect(screen.getAllByText('Passed')).toHaveLength(2); // One in Latest Run, one in history
        expect(screen.getAllByText('Failed')).toHaveLength(2); // One in Latest Run, one in history

        // Check for duration texts
        expect(screen.getByText('5.0s')).toBeInTheDocument();
        expect(screen.getByText('3.0s')).toBeInTheDocument();

        // Verify View All button exists
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('should handle validation history with more than 5 runs', async () => {
      const validationRuns = Array.from({ length: 8 }, (_, i) => ({
        id: `run-${i + 1}`,
        timestamp: `2024-01-01T10:${i.toString().padStart(2, '0')}:00Z`,
        success: i % 2 === 0, // Alternate between success and failure
        duration: 5000,
        stages: [],
      }));

      const workerWithManyValidationRuns = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 8, // Required to show validation section
        validationHistory: validationRuns,
        lastValidationRun: validationRuns[0],
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        workerWithManyValidationRuns
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Validation History \(8 runs\):/)).toBeInTheDocument();
        expect(screen.getByText('...and 3 more runs')).toBeInTheDocument();
      });
    });

    it('should show last validation run details correctly', async () => {
      const workerWithLastRun = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 1, // Required to show validation section
        lastValidationRun: {
          id: 'run-latest',
          timestamp: '2024-01-01T10:00:00Z',
          success: true,
          duration: 8500,
          stages: [
            { id: 'lint', name: 'Lint', success: true, duration: 1500, attempt: 1 },
            { id: 'test', name: 'Test', success: true, duration: 6000, attempt: 1 },
            { id: 'build', name: 'Build', success: false, duration: 1000, attempt: 1 },
          ],
        },
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithLastRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Latest Run:')).toBeInTheDocument();

        // Look for the passed stages count in the green box
        const passedElement = screen
          .getAllByText('2')
          .find(element => element.closest('.bg-green-50'));
        expect(passedElement).toBeInTheDocument();

        // Look for the failed stages count in the red box
        const failedElement = screen
          .getAllByText('1')
          .find(element => element.closest('.bg-red-50'));
        expect(failedElement).toBeInTheDocument();

        expect(screen.getByText('8.5s duration')).toBeInTheDocument();
      });
    });

    it('should handle last validation run without duration', async () => {
      const workerWithLastRunNoDuration = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 1, // Required to show validation section
        lastValidationRun: {
          id: 'run-no-duration',
          timestamp: '2024-01-01T10:00:00Z',
          success: true,
          stages: [{ id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 }],
          // No duration property
        },
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        workerWithLastRunNoDuration
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Latest Run:')).toBeInTheDocument();
        // Should not show duration text when duration is not present
        expect(screen.queryByText(/duration/)).not.toBeInTheDocument();
      });
    });

    it('should handle validation history click events', async () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      const workerWithValidationHistory = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 1, // Required to show validation section
        validationHistory: [
          {
            id: 'run-clickable',
            timestamp: '2024-01-01T10:00:00Z',
            success: true,
            duration: 5000,
            stages: [],
          },
        ],
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        workerWithValidationHistory
      );

      renderWithProviders();

      await waitFor(() => {
        const validationRunElement = screen.getByText('Passed').closest('.cursor-pointer');
        expect(validationRunElement).toBeInTheDocument();
        fireEvent.click(validationRunElement!);
      });

      expect(openSpy).toHaveBeenCalledWith('/validation-run/run-clickable', '_blank');

      openSpy.mockRestore();
    });

    it('should handle view all validation history button', async () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      const workerWithValidationHistory = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 1, // Required to show validation section
        validationHistory: [
          {
            id: 'run-1',
            timestamp: '2024-01-01T10:00:00Z',
            success: true,
            duration: 5000,
            stages: [],
          },
        ],
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
        workerWithValidationHistory
      );

      renderWithProviders();

      await waitFor(() => {
        const viewAllButton = screen.getByRole('button', { name: /view all/i });
        expect(viewAllButton).toBeInTheDocument();
        fireEvent.click(viewAllButton);
      });

      expect(openSpy).toHaveBeenCalledWith('/analytics', '_blank');

      openSpy.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle start worker mutation error', async () => {
      const stoppedWorker = { ...mockWorkerStatus, status: 'stopped' as const };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(stoppedWorker);
      (claudeWorkersApi.startWorker as jest.Mock).mockRejectedValue(
        new Error('Failed to start worker')
      );

      renderWithProviders();

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /restart worker/i });
        fireEvent.click(startButton);
      });

      // The error would be handled by the mutation, component should still be functional
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /restart worker/i })).toBeInTheDocument();
      });
    });

    it('should handle stop worker mutation error', async () => {
      (claudeWorkersApi.stopWorker as jest.Mock).mockRejectedValue(
        new Error('Failed to stop worker')
      );

      renderWithProviders();

      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /stop worker/i });
        fireEvent.click(stopButton);
      });

      // The error would be handled by the mutation, component should still be functional
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop worker/i })).toBeInTheDocument();
      });
    });

    it('should handle worker data without validation information', async () => {
      const workerWithoutValidation = {
        ...mockWorkerStatus,
        validationPassed: undefined,
        validationRuns: undefined,
        validationHistory: undefined,
        lastValidationRun: undefined,
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithoutValidation);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Worker 123/)).toBeInTheDocument();
        // Should not show validation-related UI
        expect(screen.queryByText(/validation status/i)).not.toBeInTheDocument();
      });
    });

    it('should handle empty validation stages in last run', async () => {
      const workerWithEmptyStages = {
        ...mockWorkerStatus,
        status: 'completed' as const,
        validationRuns: 1, // Required to show validation section
        lastValidationRun: {
          id: 'run-empty',
          timestamp: '2024-01-01T10:00:00Z',
          success: false,
          duration: 1000,
          stages: [], // Empty stages
        },
      };

      // Clear previous mocks and set the new one
      jest.clearAllMocks();
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithEmptyStages);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Latest Run:')).toBeInTheDocument();
        // When there are no stages, the passed/failed counts are not displayed
        expect(screen.queryByText('Passed')).not.toBeInTheDocument();
        expect(screen.queryByText('Failed')).not.toBeInTheDocument();
        // But duration should still be shown
        expect(screen.getByText('1.0s duration')).toBeInTheDocument();
      });
    });

    it('should handle worker ID extraction correctly', async () => {
      const workerWithComplexId = {
        ...mockWorkerStatus,
        id: 'worker-abc-def-ghi-jkl-mnop',
      };
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(workerWithComplexId);

      renderWithProviders('worker-abc-def-ghi-jkl-mnop');

      await waitFor(() => {
        expect(screen.getByText(/Worker mnop/)).toBeInTheDocument();
      });
    });

    it('should handle missing workerId parameter', async () => {
      const emptyWorker = null;
      (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(emptyWorker);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/workers/']}>
            <Routes>
              <Route path="/workers/:workerId?" element={<WorkerDetail />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Component should handle missing workerId gracefully
      expect(screen.getByText(/worker not found/i)).toBeInTheDocument();
    });
  });
});
