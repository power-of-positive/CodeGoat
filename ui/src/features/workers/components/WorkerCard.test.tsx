import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkerCard } from './WorkerCard';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Square: () => <div data-testid="square-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Terminal: () => <div data-testid="terminal-icon" />,
  GitMerge: () => <div data-testid="git-merge-icon" />,
  Code2: () => <div data-testid="code2-icon" />,
  ShieldAlert: () => <div data-testid="shield-alert-icon" />,
  FileCheck: () => <div data-testid="file-check-icon" />,
}));

// Mock UI components
jest.mock('../../../shared/ui/button', () => ({
  Button: ({ children, onClick, className, size, variant, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('../../../shared/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
}));

jest.mock('../../../shared/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

describe('WorkerCard', () => {
  const mockCallbacks = {
    onViewLogs: jest.fn(),
    onStopWorker: jest.fn(),
    onMergeWorktree: jest.fn(),
    onOpenVSCode: jest.fn(),
    onViewBlockedCommands: jest.fn(),
    onViewValidationRuns: jest.fn(),
  };

  const baseWorker = {
    id: 'worker-123-456-789',
    taskId: 'task-abc-def',
    taskContent: 'Fix the bug in the login system',
    startTime: '2023-01-01T10:00:00Z',
    logFile: '/logs/worker-123.log',
    blockedCommands: 0,
    hasPermissionSystem: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders worker card with basic information', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('Worker 789')).toBeInTheDocument();
      expect(screen.getByText('task-abc-def')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('renders with correct card structure', () => {
      const worker = { ...baseWorker, status: 'completed' as const };
      
      const { container } = render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(container.querySelector('.mb-4')).toBeInTheDocument();
      expect(container.querySelector('.pb-3')).toBeInTheDocument();
    });

    it('truncates long worker IDs correctly', () => {
      const worker = { ...baseWorker, id: 'very-long-worker-id-with-many-parts-final', status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('Worker final')).toBeInTheDocument();
    });
  });

  describe('status rendering', () => {
    it('renders starting status correctly', () => {
      const worker = { ...baseWorker, status: 'starting' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('STARTING')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('renders running status correctly', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('renders validating status correctly', () => {
      const worker = { ...baseWorker, status: 'validating' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('VALIDATING')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('renders completed status correctly', () => {
      const worker = { ...baseWorker, status: 'completed' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('renders failed status correctly', () => {
      const worker = { ...baseWorker, status: 'failed' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('renders stopped status correctly', () => {
      const worker = { ...baseWorker, status: 'stopped' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('STOPPED')).toBeInTheDocument();
      expect(screen.getByTestId('square-icon')).toBeInTheDocument();
    });
  });

  describe('PID badge rendering', () => {
    it('renders PID badge when pid is provided', () => {
      const worker = { ...baseWorker, status: 'running' as const, pid: 12345 };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    it('does not render PID badge when pid is not provided', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.queryByText(/PID:/)).not.toBeInTheDocument();
    });
  });

  describe('blocked commands badge', () => {
    it('renders blocked commands badge when blockedCommands > 0', () => {
      const worker = { ...baseWorker, status: 'running' as const, blockedCommands: 3 };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('🚫 3 blocked')).toBeInTheDocument();
    });

    it('does not render blocked commands badge when blockedCommands is 0', () => {
      const worker = { ...baseWorker, status: 'running' as const, blockedCommands: 0 };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.queryByText(/blocked/)).not.toBeInTheDocument();
    });
  });

  describe('validation badges', () => {
    it('renders validation failed badge for failed status', () => {
      const worker = {
        ...baseWorker,
        status: 'failed' as const,
        validationPassed: false,
      };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('⚠️ Validation Failed')).toBeInTheDocument();
    });

    it('renders validated badge for completed status', () => {
      const worker = {
        ...baseWorker,
        status: 'completed' as const,
        validationPassed: true,
      };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('✅ Validated')).toBeInTheDocument();
    });

    it('renders validation runs badge', () => {
      const worker = {
        ...baseWorker,
        status: 'running' as const,
        validationRuns: 2,
      };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByText('🔍 2 validations')).toBeInTheDocument();
    });
  });

  describe('expansion behavior', () => {
    it('starts collapsed by default', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
      expect(screen.queryByText('Task:')).not.toBeInTheDocument();
    });

    it('expands when clicked', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      // Find the clickable header div
      const expandButton = screen.getByText('Worker 789').closest('.cursor-pointer');
      fireEvent.click(expandButton!);
      
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('chevron-right-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Task:')).toBeInTheDocument();
    });

    it('collapses when clicked again', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      
      // Find the clickable header div
      const expandButton = screen.getByText('Worker 789').closest('.cursor-pointer');
      
      // Expand
      fireEvent.click(expandButton!);
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
      
      // Collapse
      fireEvent.click(expandButton!);
      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
      expect(screen.queryByText('Task:')).not.toBeInTheDocument();
    });
  });

  describe('expanded content', () => {
    const expandWorkerCard = (worker: any) => {
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      const expandButton = screen.getByText(/Worker/).closest('.cursor-pointer');
      fireEvent.click(expandButton!);
    };

    it('renders task content when expanded', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      expandWorkerCard(worker);
      
      expect(screen.getByText('Task:')).toBeInTheDocument();
      expect(screen.getByText('Fix the bug in the login system')).toBeInTheDocument();
    });

    it('renders timing information when expanded', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      expandWorkerCard(worker);
      
      expect(screen.getByText('Started:')).toBeInTheDocument();
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('renders log file path when expanded', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      expandWorkerCard(worker);
      
      expect(screen.getByText('Log File:')).toBeInTheDocument();
      expect(screen.getByText('/logs/worker-123.log')).toBeInTheDocument();
    });

    it('renders permission system status when expanded', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      expandWorkerCard(worker);
      
      expect(screen.getByText('Permission System:')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('renders inactive permission system correctly', () => {
      const worker = { ...baseWorker, status: 'running' as const, hasPermissionSystem: false };
      expandWorkerCard(worker);
      
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('renders blocked commands count when expanded', () => {
      const worker = { ...baseWorker, status: 'running' as const, blockedCommands: 5 };
      expandWorkerCard(worker);
      
      expect(screen.getByText('Blocked Commands:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('duration formatting', () => {
    const expandWorkerCard = (worker: any) => {
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      const expandButton = screen.getByText(/Worker/).closest('.cursor-pointer');
      fireEvent.click(expandButton!);
    };

    it('formats duration correctly', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-01T13:25:30Z';
      
      const worker = { ...baseWorker, status: 'completed' as const, startTime, endTime };
      expandWorkerCard(worker);
      
      expect(screen.getByText(/3h 25m 30s/)).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    const expandWorkerCard = (worker: any) => {
      render(<WorkerCard worker={worker} {...mockCallbacks} />);
      const expandButton = screen.getByText(/Worker/).closest('.cursor-pointer');
      fireEvent.click(expandButton!);
    };

    it('renders and handles action buttons', () => {
      const worker = { ...baseWorker, status: 'running' as const };
      expandWorkerCard(worker);
      
      // Details button
      const detailsButton = screen.getByRole('button', { name: /Details/ });
      expect(detailsButton).toBeInTheDocument();
      fireEvent.click(detailsButton);
      expect(mockCallbacks.onViewLogs).toHaveBeenCalledWith('worker-123-456-789');
      
      // Stop button for running workers
      const stopButton = screen.getByRole('button', { name: /Stop/ });
      expect(stopButton).toBeInTheDocument();
      fireEvent.click(stopButton);
      expect(mockCallbacks.onStopWorker).toHaveBeenCalledWith('worker-123-456-789');
    });

    it('renders conditional buttons based on worker state', () => {
      // Test Merge button for completed with validation
      const completedWorker = {
        ...baseWorker,
        status: 'completed' as const,
        validationPassed: true,
      };
      expandWorkerCard(completedWorker);
      
      const mergeButton = screen.getByRole('button', { name: /Merge/ });
      expect(mergeButton).toBeInTheDocument();
      fireEvent.click(mergeButton);
      expect(mockCallbacks.onMergeWorktree).toHaveBeenCalledWith('worker-123-456-789');
    });

    it('renders specialized buttons when conditions are met', () => {
      const workerWithIssues = { 
        ...baseWorker, 
        status: 'running' as const, 
        blockedCommands: 3,
        validationRuns: 2 
      };
      expandWorkerCard(workerWithIssues);
      
      // Blocked commands button
      const blockedButton = screen.getByRole('button', { name: /Blocked \(3\)/ });
      fireEvent.click(blockedButton);
      expect(mockCallbacks.onViewBlockedCommands).toHaveBeenCalledWith('worker-123-456-789');
      
      // Validations button
      const validationsButton = screen.getByRole('button', { name: /Validations \(2\)/ });
      fireEvent.click(validationsButton);
      expect(mockCallbacks.onViewValidationRuns).toHaveBeenCalledWith('worker-123-456-789');
    });
  });

  describe('edge cases', () => {
    it('handles various edge cases correctly', () => {
      // Worker with all optional fields
      const fullWorker = {
        ...baseWorker,
        status: 'completed' as const,
        endTime: '2023-01-01T11:30:00Z',
        pid: 98765,
        blockedCommands: 2,
        validationPassed: true,
        validationRuns: 3,
      };
      
      render(<WorkerCard worker={fullWorker} {...mockCallbacks} />);
      
      expect(screen.getByText('PID: 98765')).toBeInTheDocument();
      expect(screen.getByText('🚫 2 blocked')).toBeInTheDocument();
      expect(screen.getByText('✅ Validated')).toBeInTheDocument();
      expect(screen.getByText('🔍 3 validations')).toBeInTheDocument();
    });
  });

  describe('styling and visual elements', () => {
    it('applies correct styling for different states', () => {
      // Test status display
      render(<WorkerCard worker={{ ...baseWorker, status: 'running' }} {...mockCallbacks} />);
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      
      // Test worker with blocked commands (this shows badge in collapsed state)
      const { rerender } = render(<WorkerCard worker={{ ...baseWorker, status: 'running' }} {...mockCallbacks} />);
      rerender(<WorkerCard worker={{ ...baseWorker, status: 'running', blockedCommands: 3 }} {...mockCallbacks} />);
      expect(screen.getByText('🚫 3 blocked')).toBeInTheDocument();
    });
  });
});