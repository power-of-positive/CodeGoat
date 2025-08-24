import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AnalyticsHeader,
  MetricsSummary,
  StageDetail,
} from './AnalyticsComponents';
import { ValidationMetrics, ValidationStageResult } from '../../../shared/types/index';

describe('AnalyticsComponents', () => {
  describe('AnalyticsHeader', () => {
    it('should render header with title and refresh button', () => {
      const mockRefetch = jest.fn();
      render(<AnalyticsHeader refetch={mockRefetch} />);

      expect(screen.getByText('Validation Analytics')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Track validation pipeline performance and success rates'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument();
    });

    it('should call refetch when refresh button is clicked', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      render(<AnalyticsHeader refetch={mockRefetch} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);

      // Wait for loading state to complete
      await waitFor(() => {
        expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
      });
    });

    it('should show loading state and success notification', async () => {
      let resolveRefetch: () => void;
      const mockRefetch = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveRefetch = resolve;
          })
      );

      render(<AnalyticsHeader refetch={mockRefetch} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Click the button but don't resolve the promise yet
      fireEvent.click(refreshButton);

      // Should show loading state immediately
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      expect(refreshButton).toBeDisabled();

      // Now resolve the promise
      await act(async () => {
        resolveRefetch();
      });

      // Wait for success notification
      await waitFor(() => {
        expect(screen.getByText('Updated')).toBeInTheDocument();
      });

      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });

    it('should handle refresh errors gracefully', async () => {
      let rejectRefetch: (error: Error) => void;
      const mockRefetch = jest.fn().mockImplementation(
        () =>
          new Promise<void>((_, reject) => {
            rejectRefetch = reject;
          })
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<AnalyticsHeader refetch={mockRefetch} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Click the button but don't reject the promise yet
      fireEvent.click(refreshButton);

      // Should show loading state
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();

      // Now reject the promise
      await act(async () => {
        rejectRefetch(new Error('Refresh failed'));
      });

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(refreshButton).not.toBeDisabled();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Refresh failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('MetricsSummary', () => {
    it('should render metrics with values', () => {
      const metrics: ValidationMetrics = {
        totalRuns: 100,
        successfulRuns: 85,
        failedRuns: 15,
        successRate: 0.85,
        averageDuration: 45000,
        stageMetrics: {},
      };

      render(<MetricsSummary metrics={metrics} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('85.0%')).toBeInTheDocument();
      expect(screen.getByText('45.0s')).toBeInTheDocument();
    });

    it('should render metrics with zero values when undefined', () => {
      const metrics: ValidationMetrics = {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0,
        averageDuration: 0,
        stageMetrics: {},
      };

      render(<MetricsSummary metrics={metrics} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('0.0s')).toBeInTheDocument();
    });

    it('should render metrics with null values', () => {
      const metrics: ValidationMetrics = {
        totalRuns: null as any,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: null as any,
        averageDuration: null as any,
        stageMetrics: {},
      };

      render(<MetricsSummary metrics={metrics} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('0.0s')).toBeInTheDocument();
    });
  });

  describe('StageDetail', () => {
    it('should render successful stage without logs', () => {
      const stage: ValidationStageResult = {
        id: 'test-stage',
        name: 'Test Stage',
        success: true,
        duration: 5000,
        attempt: 1,
      };

      render(<StageDetail stage={stage} />);

      expect(screen.getByText('Test Stage')).toBeInTheDocument();
      expect(screen.getByText('PASS')).toBeInTheDocument();
      expect(screen.getByText('5.0s')).toBeInTheDocument();
      expect(screen.queryByTestId('chevron-down')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument();
    });

    it('should render failed stage without logs', () => {
      const stage: ValidationStageResult = {
        id: 'failed-stage',
        name: 'Failed Stage',
        success: false,
        duration: 3000,
        attempt: 1,
      };

      render(<StageDetail stage={stage} />);

      expect(screen.getByText('Failed Stage')).toBeInTheDocument();
      expect(screen.getByText('FAIL')).toBeInTheDocument();
      expect(screen.getByText('3.0s')).toBeInTheDocument();
    });

    it('should render stage with only output logs', () => {
      const stage: ValidationStageResult = {
        id: 'output-stage',
        name: 'Output Stage',
        success: true,
        duration: 2000,
        attempt: 1,
        output: 'This is standard output',
      };

      render(<StageDetail stage={stage} />);

      expect(screen.getByText('Output Stage')).toBeInTheDocument();

      // Check for FileText icon by looking for the class
      const container = screen.getByText('Output Stage').closest('div');
      expect(container?.querySelector('.lucide-file-text')).toBeInTheDocument();

      // Initially collapsed, should show right chevron
      const chevronRight = screen.getByTestId('chevron-right');
      expect(chevronRight).toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('Output Stage').closest('div'));

      // Should now show down chevron and logs
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
      expect(screen.getByText('Output:')).toBeInTheDocument();
      expect(screen.getByText('This is standard output')).toBeInTheDocument();
    });

    it('should render stage with only error logs', () => {
      const stage: ValidationStageResult = {
        id: 'error-stage',
        name: 'Error Stage',
        success: false,
        duration: 1000,
        attempt: 1,
        error: 'This is an error message',
      };

      render(<StageDetail stage={stage} />);

      expect(screen.getByText('Error Stage')).toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('Error Stage').closest('div'));

      expect(screen.getByText('Error Output:')).toBeInTheDocument();
      expect(screen.getByText('This is an error message')).toBeInTheDocument();
    });

    it('should render stage with both output and error logs', () => {
      const stage: ValidationStageResult = {
        id: 'both-logs-stage',
        name: 'Both Logs Stage',
        success: false,
        duration: 4000,
        attempt: 1,
        output: 'Standard output here',
        error: 'Error message here',
      };

      render(<StageDetail stage={stage} />);

      // Click to expand
      fireEvent.click(screen.getByText('Both Logs Stage').closest('div'));

      expect(screen.getByText('Error Output:')).toBeInTheDocument();
      expect(screen.getByText('Error message here')).toBeInTheDocument();
      expect(screen.getByText('Standard Output:')).toBeInTheDocument();
      expect(screen.getByText('Standard output here')).toBeInTheDocument();
    });

    it('should not expand when stage has no logs', () => {
      const stage: ValidationStageResult = {
        id: 'no-logs-stage',
        name: 'No Logs Stage',
        success: true,
        duration: 1000,
        attempt: 1,
      };

      render(<StageDetail stage={stage} />);

      // Click should not expand anything
      fireEvent.click(screen.getByText('No Logs Stage').closest('div'));

      expect(screen.queryByText('Output:')).not.toBeInTheDocument();
      expect(screen.queryByText('Error Output:')).not.toBeInTheDocument();
    });

    it('should handle empty string logs as no logs', () => {
      const stage: ValidationStageResult = {
        id: 'empty-logs-stage',
        name: 'Empty Logs Stage',
        success: true,
        duration: 1000,
        attempt: 1,
        output: '',
        error: '   ',
      };

      render(<StageDetail stage={stage} />);

      // Should not show file icon or chevrons for empty/whitespace logs
      const container = screen.getByText('Empty Logs Stage').closest('div');
      expect(
        container?.querySelector('.lucide-file-text')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument();
    });

    it('should fall back to id when name is not provided', () => {
      const stage: ValidationStageResult = {
        id: 'fallback-id',
        name: '',
        success: true,
        duration: 1000,
        attempt: 1,
      };

      render(<StageDetail stage={stage} />);

      expect(screen.getByText('fallback-id')).toBeInTheDocument();
    });

    it('should toggle logs visibility when clicked multiple times', () => {
      const stage: ValidationStageResult = {
        id: 'toggle-stage',
        name: 'Toggle Stage',
        success: true,
        duration: 2000,
        attempt: 1,
        output: 'Some output',
      };

      render(<StageDetail stage={stage} />);

      const stageElement = screen.getByText('Toggle Stage').closest('div');

      // Initially collapsed
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
      expect(screen.queryByText('Output:')).not.toBeInTheDocument();

      // First click - expand
      fireEvent.click(stageElement);
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
      expect(screen.getByText('Output:')).toBeInTheDocument();

      // Second click - collapse
      fireEvent.click(stageElement);
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
      expect(screen.queryByText('Output:')).not.toBeInTheDocument();
    });
  });
});
