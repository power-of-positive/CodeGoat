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

describe('WorkersDashboard - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workers dashboard with initial state', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [],
      activeCount: 0,
      totalCount: 0,
      totalBlockedCommands: 0,
    });

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Claude Code Workers')).toBeInTheDocument();
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
      expect(screen.getByText('Total Workers')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Blocked Commands')).toBeInTheDocument();
    });
  });

  it('displays workers when data is loaded', async () => {
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
      expect(screen.getByText('Worker abc')).toBeInTheDocument();
      expect(screen.getByText('task-1')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    mockWorkersApi.getWorkersStatus.mockRejectedValue(new Error('API Error'));

    render(<WorkersDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Workers')).toBeInTheDocument();
      expect(screen.getByText('Could not load worker status')).toBeInTheDocument();
    });
  });

  it('navigates to worker logs when details button is clicked', async () => {
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
      if (workerCard) {
        fireEvent.click(workerCard);
      }
    });

    await waitFor(() => {
      const detailsButton = screen.getByText('Details');
      expect(detailsButton).toBeInTheDocument();
      fireEvent.click(detailsButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/workers/worker-123-abc');
  });

  it('handles stop worker confirmation and success', async () => {
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
      status: 'stopped',
    });

    // Mock window.confirm
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
      fireEvent.click(stopButton);
    });

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to stop this worker?');

    await waitFor(() => {
      expect(mockWorkersApi.stopWorker).toHaveBeenCalledWith('worker-123-abc');
    });
  });

  it('handles stop worker cancellation', async () => {
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

    window.confirm = jest.fn(() => false);

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

    expect(window.confirm).toHaveBeenCalled();
    expect(mockWorkersApi.stopWorker).not.toHaveBeenCalled();
  });
});