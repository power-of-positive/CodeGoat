import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ValidationChart } from './ValidationChart';
import { ValidationMetrics } from 'shared/types';
import { settingsApi } from '../lib/api';

// Mock the settings API
jest.mock('../lib/api', () => ({
  settingsApi: {
    getValidationStages: jest.fn(),
  },
}));

describe('ValidationChart', () => {
  const mockStages = [
    {
      id: 'lint',
      name: 'Code Linting',
      command: 'npm run lint',
      enabled: true,
      timeout: 30000,
      continueOnFailure: false,
      priority: 1,
    },
    {
      id: 'test',
      name: 'Unit Tests',
      command: 'npm test',
      enabled: true,
      timeout: 60000,
      continueOnFailure: true,
      priority: 2,
    },
  ];

  const mockMetrics: ValidationMetrics = {
    totalRuns: 10,
    successfulRuns: 8,
    failedRuns: 2,
    successRate: 0.8,
    averageDuration: 5000,
    stageMetrics: {
      lint: {
        id: 'lint',
        name: 'Code Linting',
        enabled: true,
        attempts: 10,
        successes: 9,
        totalRuns: 10,
        successRate: 0.9,
        averageDuration: 2000,
      },
      test: {
        id: 'test',
        name: 'Unit Tests',
        enabled: true,
        attempts: 8,
        successes: 6,
        totalRuns: 8,
        successRate: 0.75,
        averageDuration: 3000,
      },
      'disabled-stage': {
        id: 'disabled-stage',
        name: 'Disabled Stage',
        enabled: false,
        attempts: 0,
        successes: 0,
        totalRuns: 0,
        successRate: 0,
        averageDuration: 0,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
  });

  it('renders stage performance overview', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    expect(screen.getByText('Stage Performance Overview')).toBeInTheDocument();
  });

  it('displays stage metrics correctly', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    
    expect(screen.getByText('Code Linting')).toBeInTheDocument();
    expect(screen.getByText('Unit Tests')).toBeInTheDocument();
    expect(screen.getByText('90.0% success')).toBeInTheDocument();
    expect(screen.getByText('75.0% success')).toBeInTheDocument();
    expect(screen.getByText('2.0s avg')).toBeInTheDocument();
    expect(screen.getByText('3.0s avg')).toBeInTheDocument();
  });

  it('displays total runs with success/failure breakdown', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    
    expect(screen.getByText(/10 total runs • 9 successes • 1 failures/)).toBeInTheDocument();
    expect(screen.getByText(/8 total runs • 6 successes • 2 failures/)).toBeInTheDocument();
  });

  it('shows disabled stages with proper indicators', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    
    expect(screen.getByText('Disabled Stage')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows no data indicator for enabled stages without data', async () => {
    const metricsWithNoDataStage: ValidationMetrics = {
      ...mockMetrics,
      stageMetrics: {
        ...mockMetrics.stageMetrics,
        'no-data-stage': {
          id: 'no-data-stage',
          name: 'No Data Stage',
          enabled: true,
          attempts: 0,
          successes: 0,
          totalRuns: 0,
          successRate: 0,
          averageDuration: 0,
        },
      },
    };
    
    await act(async () => {
      render(<ValidationChart metrics={metricsWithNoDataStage} />);
    });
    
    expect(screen.getByText('No Data Stage')).toBeInTheDocument();
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('expands stage details when clicked', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    
    const lintStage = screen.getByText('Code Linting').closest('div');
    
    await act(async () => {
      fireEvent.click(lintStage!);
    });
    
    expect(screen.getByText('Code Linting Details')).toBeInTheDocument();
    expect(screen.getByText('90.00%')).toBeInTheDocument();
    expect(screen.getByText('2.00s')).toBeInTheDocument();
  });

  it('applies correct color classes based on success rate', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    
    const lintSuccessRate = screen.getByText('90.0% success');
    const testSuccessRate = screen.getByText('75.0% success');
    
    expect(lintSuccessRate).toHaveClass('text-green-600');
    expect(testSuccessRate).toHaveClass('text-yellow-600');
  });

  it('displays continue on failure information', async () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    await waitFor(() => {
      expect(screen.getByText('Stop on fail')).toBeInTheDocument();
      expect(screen.getByText('Continue on fail')).toBeInTheDocument();
    });
  });

  it('shows continue on failure details in expanded view', async () => {
    await act(async () => {
      render(<ValidationChart metrics={mockMetrics} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
    });

    const lintStage = screen.getByText('Code Linting').closest('div');
    
    await act(async () => {
      fireEvent.click(lintStage!);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Continue on Failure:')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      expect(screen.getByText('Timeout:')).toBeInTheDocument();
      expect(screen.getByText('30s')).toBeInTheDocument();
    });
  });
});