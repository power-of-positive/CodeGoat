import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkersDashboard } from './WorkersDashboard';
import { claudeWorkersApi } from '../lib/api';

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

const mockWorkersApi = claudeWorkersApi as jest.Mocked<typeof claudeWorkersApi>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('WorkersDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockWorkersApi.getWorkersStatus.mockImplementation(() => new Promise(() => {}));

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading workers...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    mockWorkersApi.getWorkersStatus.mockRejectedValue(new Error('API Error'));

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Workers')).toBeInTheDocument();
    });
  });

  it('renders empty state when no workers exist', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [],
      activeCount: 0,
      totalCount: 0,
      totalBlockedCommands: 0,
    });

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No Workers')).toBeInTheDocument();
      expect(screen.getByText('No Claude Code workers are currently running. Start a worker from the task board to see it here.')).toBeInTheDocument();
    });
  });

  it('renders workers when they exist', async () => {
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
      {
        id: 'worker-456-def',
        taskId: 'task-2',
        taskContent: 'Another task',
        status: 'completed' as const,
        startTime: '2025-08-19T07:00:00Z',
        endTime: '2025-08-19T07:05:00Z',
        logFile: '/path/to/log2.txt',
        blockedCommands: 0,
        hasPermissionSystem: true,
      },
    ];

    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: mockWorkers,
      activeCount: 1,
      totalCount: 2,
      totalBlockedCommands: 0,
    });

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Claude Code Workers')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Active workers
      expect(screen.getByText('2')).toBeInTheDocument(); // Total workers
      expect(screen.getByText('50%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('Worker abc')).toBeInTheDocument();
      expect(screen.getByText('Worker def')).toBeInTheDocument();
    });
  });

  it('expands and collapses worker cards', async () => {
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

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
      expect(workerCard).toBeInTheDocument();
    });

    // Initially collapsed - task content should not be visible
    expect(screen.queryByText('Test task content')).not.toBeInTheDocument();

    // Click to expand
    const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
    if (workerCard) {
      fireEvent.click(workerCard);
    }

    // Now expanded - task content should be visible
    await waitFor(() => {
      expect(screen.getByText('Test task content')).toBeInTheDocument();
    });
  });

  it('handles worker stop functionality', async () => {
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
    mockWorkersApi.stopWorker.mockResolvedValue({ 
      workerId: 'worker-123-abc', 
      status: 'stopped' 
    });

    // Mock window.confirm to always return true
    window.confirm = jest.fn(() => true);

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
      if (workerCard) {
        fireEvent.click(workerCard);
      }
    });

    await waitFor(() => {
      const stopButton = screen.getByText('Stop');
      expect(stopButton).toBeInTheDocument();
    });

    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to stop this worker?');
    
    await waitFor(() => {
      expect(mockWorkersApi.stopWorker).toHaveBeenCalledWith('worker-123-abc');
    });
  });

  it('opens log viewer when view logs is clicked', async () => {
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
      },
    ];

    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: mockWorkers,
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });
    mockWorkersApi.getWorkerLogs.mockResolvedValue({
      workerId: 'worker-123-abc',
      logs: 'Sample log content\nLine 2\nLine 3',
      logFile: '/path/to/log.txt',
    });

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
      if (workerCard) {
        fireEvent.click(workerCard);
      }
    });

    await waitFor(() => {
      const viewLogsButton = screen.getByText('View Logs');
      expect(viewLogsButton).toBeInTheDocument();
    });

    const viewLogsButton = screen.getByText('View Logs');
    fireEvent.click(viewLogsButton);

    await waitFor(() => {
      expect(screen.getByText('Worker Logs - abc')).toBeInTheDocument();
    });
  });

  it('handles log viewer auto-refresh toggle', async () => {
    const mockWorkers = [
      {
        id: 'worker-123-abc',
        taskId: 'task-1',
        taskContent: 'Test task content',
        status: 'running' as const,
        startTime: '2025-08-19T08:00:00Z',
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
    mockWorkersApi.getWorkerLogs.mockResolvedValue({
      workerId: 'worker-123-abc',
      logs: 'Sample log content',
      logFile: '/path/to/log.txt',
    });

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    // Expand worker card and open log viewer
    await waitFor(() => {
      const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
      if (workerCard) {
        fireEvent.click(workerCard);
      }
    });

    const viewLogsButton = screen.getByText('View Logs');
    fireEvent.click(viewLogsButton);

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    // Toggle auto-refresh off
    const liveButton = screen.getByText('Live');
    fireEvent.click(liveButton);

    await waitFor(() => {
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });

  it('closes log viewer when close button is clicked', async () => {
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
      },
    ];

    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: mockWorkers,
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });
    mockWorkersApi.getWorkerLogs.mockResolvedValue({
      workerId: 'worker-123-abc',
      logs: 'Sample log content',
      logFile: '/path/to/log.txt',
    });

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    // Open log viewer
    await waitFor(() => {
      const workerCard = screen.getByText('Worker abc').closest('.cursor-pointer');
      if (workerCard) {
        fireEvent.click(workerCard);
      }
    });

    const viewLogsButton = screen.getByText('View Logs');
    fireEvent.click(viewLogsButton);

    await waitFor(() => {
      expect(screen.getByText('Worker Logs - abc')).toBeInTheDocument();
    });

    // Close log viewer
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Worker Logs - abc')).not.toBeInTheDocument();
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