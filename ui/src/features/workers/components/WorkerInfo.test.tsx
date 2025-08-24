import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WorkerInfo } from './WorkerInfo';
import { claudeWorkersApi } from '../../../shared/lib/api';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  claudeWorkersApi: {
    getWorkersStatus: jest.fn(),
    mergeWorktree: jest.fn(),
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

const mockWorker = {
  id: 'worker-123-abc',
  taskId: 'task-456',
  taskContent: 'Test task content',
  status: 'running' as const,
  startTime: '2025-08-19T08:00:00Z',
  endTime: undefined,
  pid: 12345,
  logFile: '/path/to/log.txt',
  blockedCommands: 2,
  hasPermissionSystem: true,
  validationPassed: undefined,
  validationRuns: 0,
};

describe('WorkerInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders worker not found state when no worker data', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [],
      activeCount: 0,
      totalCount: 0,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="nonexistent-worker" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Worker Information')).toBeInTheDocument();
      expect(screen.getByText('Worker not currently active')).toBeInTheDocument();
      expect(screen.getByText('nonexistent-worker')).toBeInTheDocument();
    });
  });

  it('renders worker information when worker exists', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [mockWorker],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 2,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Worker Information')).toBeInTheDocument();
      expect(screen.getByText('123-abc')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('12345')).toBeInTheDocument();
    });
  });

  it('displays all worker statuses correctly', async () => {
    const statuses = [
      { status: 'starting' as const, expectedText: 'STARTING' },
      { status: 'running' as const, expectedText: 'RUNNING' },
      { status: 'validating' as const, expectedText: 'VALIDATING' },
      { status: 'completed' as const, expectedText: 'COMPLETED' },
      { status: 'failed' as const, expectedText: 'FAILED' },
      { status: 'stopped' as const, expectedText: 'STOPPED' },
    ];

    for (const { status, expectedText } of statuses) {
      const workerWithStatus = { ...mockWorker, status };
      mockWorkersApi.getWorkersStatus.mockResolvedValue({
        workers: [workerWithStatus],
        activeCount: 1,
        totalCount: 1,
        totalBlockedCommands: 0,
      });

      const { unmount } = render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('navigates to workers dashboard when button clicked', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [mockWorker],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const dashboardButton = screen.getByText('View in Dashboard');
      fireEvent.click(dashboardButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/workers');
  });

  it('displays process ID when available', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [mockWorker],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Process ID:')).toBeInTheDocument();
      expect(screen.getByText('12345')).toBeInTheDocument();
    });
  });

  it('hides process ID when not available', async () => {
    const workerWithoutPid = { ...mockWorker, pid: undefined };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [workerWithoutPid],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Process ID:')).not.toBeInTheDocument();
    });
  });

  it('displays validation status when passed', async () => {
    const workerWithValidation = { ...mockWorker, validationPassed: true };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [workerWithValidation],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Validation:')).toBeInTheDocument();
      expect(screen.getByText('✅ Passed')).toBeInTheDocument();
    });
  });

  it('displays validation status when failed', async () => {
    const workerWithValidation = { ...mockWorker, validationPassed: false };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [workerWithValidation],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Validation:')).toBeInTheDocument();
      expect(screen.getByText('❌ Failed')).toBeInTheDocument();
    });
  });

  it('hides validation status when undefined', async () => {
    const workerWithoutValidation = { ...mockWorker, validationPassed: undefined };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [workerWithoutValidation],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Validation:')).not.toBeInTheDocument();
    });
  });

  it('displays blocked commands when present', async () => {
    const workerWithBlocked = { ...mockWorker, blockedCommands: 5 };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [workerWithBlocked],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 5,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Blocked Commands:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('hides blocked commands when zero', async () => {
    const workerWithNoBlocked = { ...mockWorker, blockedCommands: 0 };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [workerWithNoBlocked],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Blocked Commands:')).not.toBeInTheDocument();
    });
  });

  it('shows merge button for completed worker with passed validation', async () => {
    const completedWorker = {
      ...mockWorker,
      status: 'completed' as const,
      validationPassed: true,
    };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [completedWorker],
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Merge Worker Changes')).toBeInTheDocument();
    });
  });

  it('shows merge button for stopped worker with passed validation', async () => {
    const stoppedWorker = {
      ...mockWorker,
      status: 'stopped' as const,
      validationPassed: true,
    };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [stoppedWorker],
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Merge Worker Changes')).toBeInTheDocument();
    });
  });

  it('hides merge button for completed worker without passed validation', async () => {
    const completedWorker = {
      ...mockWorker,
      status: 'completed' as const,
      validationPassed: false,
    };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [completedWorker],
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Merge Worker Changes')).not.toBeInTheDocument();
    });
  });

  it('hides merge button for running worker', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [mockWorker],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Merge Worker Changes')).not.toBeInTheDocument();
    });
  });

  it('executes merge worktree mutation when merge button clicked', async () => {
    const completedWorker = {
      ...mockWorker,
      status: 'completed' as const,
      validationPassed: true,
    };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [completedWorker],
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

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const mergeButton = screen.getByText('Merge Worker Changes');
      fireEvent.click(mergeButton);
    });

    expect(mockWorkersApi.mergeWorktree).toHaveBeenCalledWith('worker-123-abc');
  });

  it('shows merging state when merge is in progress', async () => {
    const completedWorker = {
      ...mockWorker,
      status: 'completed' as const,
      validationPassed: true,
    };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [completedWorker],
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    // Mock a slow merge operation
    mockWorkersApi.mergeWorktree.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const mergeButton = screen.getByText('Merge Worker Changes');
      fireEvent.click(mergeButton);
    });

    // Check that the button shows "Merging..." and is disabled
    expect(screen.getByText('Merging...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /merging/i })).toBeDisabled();
  });

  it('formats start time correctly', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [mockWorker],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Started:')).toBeInTheDocument();
      // Check that a date string is present (formatted by toLocaleString)
      expect(screen.getByText(/8\/19\/2025/)).toBeInTheDocument();
    });
  });

  it('creates proper link to worker detail page', async () => {
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [mockWorker],
      activeCount: 1,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const workerLink = screen.getByRole('link', { name: '123-abc' });
      expect(workerLink).toHaveAttribute('href', '/workers#worker-123-abc');
    });
  });

  it('handles API error gracefully', async () => {
    mockWorkersApi.getWorkersStatus.mockRejectedValue(new Error('API Error'));

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    // Should show the "not active" state when API fails
    await waitFor(() => {
      expect(screen.getByText('Worker not currently active')).toBeInTheDocument();
    });
  });

  it('handles merge operation error gracefully', async () => {
    const completedWorker = {
      ...mockWorker,
      status: 'completed' as const,
      validationPassed: true,
    };
    mockWorkersApi.getWorkersStatus.mockResolvedValue({
      workers: [completedWorker],
      activeCount: 0,
      totalCount: 1,
      totalBlockedCommands: 0,
    });

    mockWorkersApi.mergeWorktree.mockRejectedValue(new Error('Merge failed'));

    render(<WorkerInfo executorId="worker-123-abc" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const mergeButton = screen.getByText('Merge Worker Changes');
      fireEvent.click(mergeButton);
    });

    // Should handle the error without crashing
    await waitFor(() => {
      expect(screen.getByText('Merge Worker Changes')).toBeInTheDocument();
    });
  });
});