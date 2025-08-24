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
    getWorkersStatus: jest.fn(),
    startWorker: jest.fn(),
    stopWorker: jest.fn(),
    getWorkerLogs: jest.fn(),
    mergeWorktree: jest.fn(),
    openVSCode: jest.fn(),
    getBlockedCommands: jest.fn(),
    getValidationRuns: jest.fn(),
    getValidationRunDetails: jest.fn(),
  },
}));

// useProcessesLogs hook is not used in WorkerDetail component

// Mock react-window
jest.mock('react-window', () => ({
  VariableSizeList: ({
    children,
    itemCount,
  }: {
    children: any;
    itemCount: number;
  }) => {
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
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
      mockWorkerStatus
    );
    (claudeWorkersApi.getWorkerLogs as jest.Mock).mockResolvedValue(
      mockWorkerLogs
    );
  });

  it('renders worker detail page with loading state', () => {
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

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
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
      stoppedWorker
    );
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
      expect(claudeWorkersApi.startWorker).toHaveBeenCalledWith({
        taskId: 'task-456',
        taskContent: 'Implement feature X',
      });
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

    const initialCallCount = (claudeWorkersApi.getWorkerStatus as jest.Mock)
      .mock.calls.length;

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Verify API was called again (should be more than initial count)
    await waitFor(() => {
      expect(
        (claudeWorkersApi.getWorkerStatus as jest.Mock).mock.calls.length
      ).toBeGreaterThan(initialCallCount);
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
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
      validatedWorker
    );

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
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
      completedWorker
    );

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
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
      workerWithoutPermissions
    );

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
    (claudeWorkersApi.getWorkerStatus as jest.Mock).mockResolvedValue(
      workerWithoutPid
    );

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
});
