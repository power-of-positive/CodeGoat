import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationChart } from './ValidationChart';
import { ValidationMetrics } from 'shared/types';

describe('ValidationChart', () => {
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

  it('renders stage performance overview', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    expect(screen.getByText('Stage Performance Overview')).toBeInTheDocument();
  });

  it('displays stage metrics correctly', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    expect(screen.getByText('Code Linting')).toBeInTheDocument();
    expect(screen.getByText('Unit Tests')).toBeInTheDocument();
    expect(screen.getByText('90.0% success')).toBeInTheDocument();
    expect(screen.getByText('75.0% success')).toBeInTheDocument();
    expect(screen.getByText('2.0s avg')).toBeInTheDocument();
    expect(screen.getByText('3.0s avg')).toBeInTheDocument();
  });

  it('displays total runs with success/failure breakdown', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    expect(screen.getByText(/10 total runs • 9 successes • 1 failures/)).toBeInTheDocument();
    expect(screen.getByText(/8 total runs • 6 successes • 2 failures/)).toBeInTheDocument();
  });

  it('shows disabled stages with proper indicators', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    expect(screen.getByText('Disabled Stage')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows no data indicator for enabled stages without data', () => {
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
    
    render(<ValidationChart metrics={metricsWithNoDataStage} />);
    
    expect(screen.getByText('No Data Stage')).toBeInTheDocument();
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('expands stage details when clicked', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    const lintStage = screen.getByText('Code Linting').closest('div');
    fireEvent.click(lintStage!);
    
    expect(screen.getByText('Code Linting Details')).toBeInTheDocument();
    expect(screen.getByText('90.00%')).toBeInTheDocument();
    expect(screen.getByText('2.00s')).toBeInTheDocument();
  });

  it('applies correct color classes based on success rate', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    const lintSuccessRate = screen.getByText('90.0% success');
    const testSuccessRate = screen.getByText('75.0% success');
    
    expect(lintSuccessRate).toHaveClass('text-green-600');
    expect(testSuccessRate).toHaveClass('text-yellow-600');
  });
});