/* eslint-disable max-lines */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ValidationRunsViewer } from './ValidationRunsViewer';
import { claudeWorkersApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  claudeWorkersApi: {
    getValidationRuns: jest.fn(),
  },
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  FileCheck: ({ className }: { className?: string }) => (
    <div data-testid="file-check-icon" className={className}>FileCheck</div>
  ),
}));

const mockClaudeWorkersApi = claudeWorkersApi as jest.Mocked<typeof claudeWorkersApi>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockValidationData = {
  workerId: 'worker-123-456',
  totalRuns: 3,
  lastRun: {
    id: 'run-abc-def-123',
    timestamp: '2023-01-01T10:00:00Z',
    overallStatus: 'passed' as const,
  },
  validationRuns: [
    {
      id: 'run-abc-def-123',
      timestamp: '2023-01-01T10:00:00Z',
      overallStatus: 'passed' as const,
      stages: [
        {
          name: 'lint',
          command: 'npm run lint',
          status: 'passed' as const,
          duration: 2500,
        },
        {
          name: 'test',
          command: 'npm test',
          status: 'passed' as const,
          duration: 15000,
        },
      ],
      metricsFile: 'metrics-123.json',
    },
    {
      id: 'run-def-ghi-456',
      timestamp: '2023-01-01T09:00:00Z',
      overallStatus: 'failed' as const,
      stages: [
        {
          name: 'lint',
          command: 'npm run lint',
          status: 'passed' as const,
          duration: 2000,
        },
        {
          name: 'test',
          command: 'npm test',
          status: 'failed' as const,
          duration: 8000,
        },
        {
          name: 'build',
          command: 'npm run build',
          status: 'skipped' as const,
          duration: 0,
        },
      ],
    },
    {
      id: 'run-ghi-jkl-789',
      timestamp: '2023-01-01T08:00:00Z',
      overallStatus: 'running' as const,
      stages: [
        {
          name: 'lint',
          command: 'npm run lint',
          status: 'passed' as const,
          duration: 1800,
        },
        {
          name: 'test',
          command: 'npm test',
          status: 'running' as const,
        },
      ],
    },
  ],
};

describe('ValidationRunsViewer', () => {
  const defaultProps = {
    workerId: 'worker-123-456',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render component with header and close button', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      expect(screen.getByText('Validation Runs - 456')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.getByTestId('file-check-icon')).toBeInTheDocument();
    });

    it('should display loading state initially', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockValidationData), 100))
      );
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      expect(screen.getByText('Loading validation runs...')).toBeInTheDocument();
    });

    it('should handle close button click', async () => {
      const onClose = jest.fn();
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} onClose={onClose} />
        </Wrapper>
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Display', () => {
    it('should display validation runs data when loaded', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total validation runs:')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('PASSED')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });

    it('should display formatted timestamps correctly', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        const timestamp = screen.getByText(
          new Date('2023-01-01T10:00:00Z').toLocaleString()
        );
        expect(timestamp).toBeInTheDocument();
      });
    });

    it('should display run IDs in shortened format', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('def-123')).toBeInTheDocument(); // Last two parts of run-abc-def-123
        expect(screen.getByText('ghi-456')).toBeInTheDocument(); // Last two parts of run-def-ghi-456
      });
    });

    it('should display empty state when no validation runs', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue({
        workerId: 'worker-123-456',
        totalRuns: 0,
        lastRun: null,
        validationRuns: [],
      });
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No validation runs yet')).toBeInTheDocument();
        expect(screen.getByText('Validation runs will appear here when a worker completes')).toBeInTheDocument();
      });
    });
  });

  describe('Status Styling', () => {
    it('should apply correct CSS classes for different statuses', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        const passedBadge = screen.getByText('PASSED');
        expect(passedBadge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-300');

        const failedBadge = screen.getByText('FAILED');
        expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300');

        const runningBadge = screen.getByText('RUNNING');
        expect(runningBadge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-300');
      });
    });

    it('should handle pending and skipped status styles', async () => {
      const pendingData = {
        ...mockValidationData,
        validationRuns: [
          {
            id: 'run-pending',
            timestamp: '2023-01-01T10:00:00Z',
            overallStatus: 'pending' as const,
            stages: [
              {
                name: 'lint',
                command: 'npm run lint',
                status: 'pending' as const,
              },
            ],
          },
          {
            id: 'run-with-skipped',
            timestamp: '2023-01-01T09:00:00Z',
            overallStatus: 'failed' as const,
            stages: [
              {
                name: 'test',
                command: 'npm test',
                status: 'skipped' as const,
              },
            ],
          },
        ],
      };

      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(pendingData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        // Check pending status badge
        const pendingBadge = screen.getByText('PENDING');
        expect(pendingBadge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-300');

        // Check that the failed run is displayed
        const failedBadge = screen.getByText('FAILED');
        expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300');

        // Check that the skipped stage is shown with yellow indicator
        const stageIndicators = document.querySelectorAll('.w-2.h-2.rounded-full');
        const yellowIndicator = Array.from(stageIndicators).find(el => 
          el.classList.contains('bg-yellow-500')
        );
        expect(yellowIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Stages Display', () => {
    it('should display stages with correct status indicators', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        // Check that stages sections are displayed for multiple runs
        expect(screen.getAllByText('Stages:')).toHaveLength(3); // One for each validation run
        
        // Check that stage names are displayed
        expect(screen.getAllByText('lint')).toHaveLength(3); // Appears in 3 validation runs
        expect(screen.getAllByText('test')).toHaveLength(3); // Appears in 3 validation runs
        expect(screen.getByText('build')).toBeInTheDocument();
        
        // Verify status indicators exist with different colors
        const indicators = document.querySelectorAll('.w-2.h-2.rounded-full');
        expect(indicators.length).toBeGreaterThan(0);
      });
    });

    it('should display stage durations correctly formatted', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('(2.5s)')).toBeInTheDocument(); // 2500ms = 2.5s
        expect(screen.getByText('(15.0s)')).toBeInTheDocument(); // 15000ms = 15.0s
      });
    });

    it('should handle stages without duration', async () => {
      const dataWithoutDuration = {
        ...mockValidationData,
        validationRuns: [
          {
            id: 'run-no-duration',
            timestamp: '2023-01-01T10:00:00Z',
            overallStatus: 'running' as const,
            stages: [
              {
                name: 'lint',
                command: 'npm run lint',
                status: 'running' as const,
                // No duration property
              },
            ],
          },
        ],
      };

      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(dataWithoutDuration);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('lint')).toBeInTheDocument();
        // Should not show duration text when duration is not present
        expect(screen.queryByText(/\(\d+\.\d+s\)/)).not.toBeInTheDocument();
      });
    });

    it('should apply correct status colors to stage indicators', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        // Check that stage indicators exist
        const indicators = document.querySelectorAll('.w-2.h-2.rounded-full');
        expect(indicators.length).toBeGreaterThan(0);
        
        // Verify different status colors exist
        const greenIndicators = Array.from(indicators).filter(el => 
          el.classList.contains('bg-green-500')
        );
        const redIndicators = Array.from(indicators).filter(el => 
          el.classList.contains('bg-red-500')
        );
        const blueIndicators = Array.from(indicators).filter(el => 
          el.classList.contains('bg-blue-500')
        );
        
        // Should have multiple indicators for different stages/runs
        expect(greenIndicators.length).toBeGreaterThan(0); // passed stages
        expect(redIndicators.length).toBeGreaterThan(0); // failed stages
        expect(blueIndicators.length).toBeGreaterThan(0); // running stages
      });
    });

    it('should handle empty stages array', async () => {
      const dataWithEmptyStages = {
        ...mockValidationData,
        validationRuns: [
          {
            id: 'run-empty-stages',
            timestamp: '2023-01-01T10:00:00Z',
            overallStatus: 'pending' as const,
            stages: [],
          },
        ],
      };

      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(dataWithEmptyStages);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument();
        // Should not show stages section when no stages
        expect(screen.queryByText('Stages:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Metrics File Links', () => {
    it('should display metrics file link when available', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        const metricsLink = screen.getByText('View detailed metrics →');
        expect(metricsLink).toBeInTheDocument();
        expect(metricsLink.closest('a')).toHaveAttribute(
          'href',
          '/api/claude-workers/worker-123-456/validation-runs/run-abc-def-123'
        );
        expect(metricsLink.closest('a')).toHaveAttribute('target', '_blank');
        expect(metricsLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should not display metrics link when not available', async () => {
      const dataWithoutMetrics = {
        ...mockValidationData,
        validationRuns: [
          {
            id: 'run-no-metrics',
            timestamp: '2023-01-01T10:00:00Z',
            overallStatus: 'failed' as const,
            stages: [],
            // No metricsFile property
          },
        ],
      };

      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(dataWithoutMetrics);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('FAILED')).toBeInTheDocument();
        expect(screen.queryByText('View detailed metrics →')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockClaudeWorkersApi.getValidationRuns.mockRejectedValue(new Error('API Error'));
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      // Component should still render without crashing
      expect(screen.getByText('Validation Runs - 456')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle malformed response data', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue({
        workerId: 'worker-123-456',
        totalRuns: 1,
        lastRun: {
          id: 'run-abc-def-123',
          timestamp: '2023-01-01T10:00:00Z',
          overallStatus: 'passed' as const,
        },
        validationRuns: [
          {
            id: 'malformed-run',
            timestamp: 'invalid-date',
            overallStatus: 'unknown' as any,
            stages: [],
          },
        ],
      });
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        // Component should render without crashing even with malformed data
        expect(screen.getByText('Total validation runs:')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('Query Behavior', () => {
    it('should setup query with correct parameters', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      expect(mockClaudeWorkersApi.getValidationRuns).toHaveBeenCalledWith('worker-123-456');
    });

    it('should refetch data at specified intervals', async () => {
      jest.useFakeTimers();
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      // Wait for initial render and API call
      await waitFor(() => {
        expect(mockClaudeWorkersApi.getValidationRuns).toHaveBeenCalledTimes(1);
      });

      // Advance timers to trigger refetch (5000ms interval)
      jest.advanceTimersByTime(5000);

      // Wait for the refetch to complete
      await waitFor(() => {
        expect(mockClaudeWorkersApi.getValidationRuns).toHaveBeenCalledTimes(2);
      }, { timeout: 1000 });

      jest.useRealTimers();
    });
  });

  describe('Worker ID Processing', () => {
    it('should extract correct worker suffix from different ID formats', async () => {
      const testCases = [
        { workerId: 'worker-123-456', expected: '456' },
        { workerId: 'short-id', expected: 'id' },
        { workerId: 'very-long-worker-id-with-many-parts', expected: 'parts' },
        { workerId: 'single', expected: 'single' },
      ];

      for (const testCase of testCases) {
        mockClaudeWorkersApi.getValidationRuns.mockResolvedValue({
          ...mockValidationData,
          workerId: testCase.workerId,
        });
        const Wrapper = createWrapper();

        const { rerender } = render(
          <Wrapper>
            <ValidationRunsViewer workerId={testCase.workerId} onClose={jest.fn()} />
          </Wrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(`Validation Runs - ${testCase.expected}`)).toBeInTheDocument();
        });

        // Clean up for next iteration
        rerender(<></>);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} />
        </Wrapper>
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' });
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation', async () => {
      mockClaudeWorkersApi.getValidationRuns.mockResolvedValue(mockValidationData);
      const onClose = jest.fn();
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ValidationRunsViewer {...defaultProps} onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' });
        expect(closeButton).toBeInTheDocument();
      });

      // Focus the close button and test keyboard interaction
      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();
      expect(closeButton).toHaveFocus();

      // Test Enter key
      await userEvent.keyboard('{Enter}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});