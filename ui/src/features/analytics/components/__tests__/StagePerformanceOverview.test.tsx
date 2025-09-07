import { render, screen } from '@testing-library/react';
import { ValidationChart } from '../ValidationChart';
import { ValidationMetrics } from '../../../../shared/types';

// Mock the API calls
jest.mock('../../../../shared/lib/api', () => ({
  settingsApi: {
    getValidationStages: () => Promise.resolve([]),
  },
}));

describe('ValidationChart - Stage Performance Overview with Consolidation', () => {
  const mockMetricsWithMultipleStages: ValidationMetrics = {
    totalRuns: 150,
    successfulRuns: 120,
    failedRuns: 30,
    successRate: 0.8,
    averageDuration: 45000,
    stageMetrics: {
      'code-linting': {
        id: 'lint',
        name: 'Code Linting',
        enabled: true,
        attempts: 150,
        successes: 145,
        successRate: 0.967,
        averageDuration: 5000,
        totalRuns: 150,
      },
      'type-checking': {
        id: 'typecheck',
        name: 'Type Checking',
        enabled: true,
        attempts: 150,
        successes: 142,
        successRate: 0.947,
        averageDuration: 8000,
        totalRuns: 150,
      },
      'backend-coverage-check': {
        id: 'coverage-backend',
        name: 'Backend Coverage Check', // This should be consolidated from backend-coverage + coverage-backend
        enabled: true,
        attempts: 80, // Merged from 50 + 30
        successes: 65, // Merged from 40 + 25
        successRate: 0.8125, // 65/80
        averageDuration: 2000, // (100000 + 60000) / 80
        totalRuns: 80,
      },
      'playwright-e2e-tests': {
        id: 'e2e-tests',
        name: 'Playwright E2E Tests', // This should be consolidated from e2e-tests + playwright-e2e
        enabled: true,
        attempts: 20, // Merged from 15 + 5
        successes: 16, // Merged from 12 + 4
        successRate: 0.8, // 16/20
        averageDuration: 12000, // (180000 + 60000) / 20
        totalRuns: 20,
      },
      'unit-tests-backend': {
        id: 'unit-tests-backend',
        name: 'Backend Unit Tests',
        enabled: true,
        attempts: 150,
        successes: 135,
        successRate: 0.9,
        averageDuration: 15000,
        totalRuns: 150,
      },
    },
  };

  const mockMetricsWithSingleStage: ValidationMetrics = {
    totalRuns: 50,
    successfulRuns: 40,
    failedRuns: 10,
    successRate: 0.8,
    averageDuration: 5000,
    stageMetrics: {
      'code-linting': {
        id: 'lint',
        name: 'Code Linting',
        enabled: true,
        attempts: 50,
        successes: 45,
        successRate: 0.9,
        averageDuration: 5000,
        totalRuns: 50,
      },
    },
  };

  describe('Multiple Stages Display', () => {
    it('should display all consolidated stages in the performance overview', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Should show the title
      expect(screen.getByText('Stage Performance Overview')).toBeInTheDocument();

      // Should display all 5 consolidated stages
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Checking')).toBeInTheDocument();
      expect(screen.getByText('Backend Coverage Check')).toBeInTheDocument();
      expect(screen.getByText('Playwright E2E Tests')).toBeInTheDocument();
      expect(screen.getByText('Backend Unit Tests')).toBeInTheDocument();
    });

    it('should show correct consolidated statistics for merged stages', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Backend Coverage Check should show consolidated stats (80 total runs from merging 50+30)
      expect(screen.getByText('81.3% success')).toBeInTheDocument(); // 65/80 * 100 = 81.25%
      expect(screen.getByText('80 total runs • 65 successes • 15 failures')).toBeInTheDocument();

      // Playwright E2E Tests should show consolidated stats (20 total runs from merging 15+5)
      expect(screen.getByText('80.0% success')).toBeInTheDocument(); // 16/20 * 100 = 80%
      expect(screen.getByText('20 total runs • 16 successes • 4 failures')).toBeInTheDocument();
    });

    it('should display individual stage performance bars for each consolidated stage', () => {
      const { container } = render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Should have progress bars for each of the 5 stages
      const progressBars = container.querySelectorAll('.bg-green-500, .bg-yellow-500, .bg-red-500');
      expect(progressBars.length).toBe(5);
    });

    it('should show success rates for all consolidated stages', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Each stage should display its success rate
      expect(screen.getByText('96.7% success')).toBeInTheDocument(); // Code Linting
      expect(screen.getByText('94.7% success')).toBeInTheDocument(); // Type Checking
      expect(screen.getByText('81.3% success')).toBeInTheDocument(); // Backend Coverage (consolidated)
      expect(screen.getByText('80.0% success')).toBeInTheDocument(); // E2E Tests (consolidated)
      expect(screen.getByText('90.0% success')).toBeInTheDocument(); // Backend Unit Tests
    });
  });

  describe('Single Stage Scenario (Current Issue)', () => {
    it('should handle single stage gracefully but indicate more stages should be available', () => {
      render(<ValidationChart metrics={mockMetricsWithSingleStage} />);

      // Should still show the performance overview
      expect(screen.getByText('Stage Performance Overview')).toBeInTheDocument();
      expect(screen.getByText('Code Linting')).toBeInTheDocument();

      // This test documents the current issue - only 1 stage is shown
      // when there should be multiple consolidated stages
      const stageItems = screen.getAllByText(/% success/);
      expect(stageItems.length).toBe(1); // This is the problem we're fixing
    });
  });

  describe('Consolidated Stage Naming', () => {
    it('should use proper consolidated stage names from stage consolidation service', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Should show consolidated names, not individual stage IDs
      expect(screen.getByText('Backend Coverage Check')).toBeInTheDocument(); // Not "backend-coverage" or "coverage-backend"
      expect(screen.getByText('Playwright E2E Tests')).toBeInTheDocument(); // Not "e2e-tests" or "playwright-e2e"
    });

    it('should maintain stage enablement status in consolidated stages', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // All stages in the mock data are enabled, so none should show "Disabled" badge
      expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
    });
  });

  describe('Data Consistency', () => {
    it('should show consistent run counts between individual stages and totals', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Individual stage run counts should add up meaningfully
      // Backend Coverage: 80 total runs (consolidated)
      expect(screen.getByText('80 total runs • 65 successes • 15 failures')).toBeInTheDocument();

      // E2E Tests: 20 total runs (consolidated)
      expect(screen.getByText('20 total runs • 16 successes • 4 failures')).toBeInTheDocument();
    });

    it('should display average durations that reflect consolidated timing data', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // Should show average durations in seconds
      expect(screen.getByText('2.0s avg')).toBeInTheDocument(); // Backend Coverage consolidated
      expect(screen.getByText('12.0s avg')).toBeInTheDocument(); // E2E Tests consolidated
    });
  });

  describe('Expected Behavior After Fix', () => {
    it('should display minimum expected number of consolidated stages', () => {
      render(<ValidationChart metrics={mockMetricsWithMultipleStages} />);

      // After consolidation, we expect at least these core stages to be visible:
      // 1. Code Linting
      // 2. Type Checking
      // 3. Backend Coverage Check (consolidated)
      // 4. Backend Unit Tests
      // 5. E2E Tests (consolidated)

      const stageNames = [
        'Code Linting',
        'Type Checking',
        'Backend Coverage Check',
        'Backend Unit Tests',
        'Playwright E2E Tests',
      ];

      stageNames.forEach(stageName => {
        expect(screen.getByText(stageName)).toBeInTheDocument();
      });
    });
  });
});
