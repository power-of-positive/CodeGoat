import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidationChart } from './ValidationChart';
import { ValidationMetrics } from 'shared/types';

describe('ValidationChart', () => {
  const mockMetrics: ValidationMetrics = {
    totalRuns: 10,
    successRate: 0.8,
    averageDuration: 5000,
    stageMetrics: {
      lint: {
        totalRuns: 10,
        successRate: 0.9,
        averageDuration: 2000,
      },
      test: {
        totalRuns: 8,
        successRate: 0.75,
        averageDuration: 3000,
      },
    },
  };

  it('renders stage performance overview', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    expect(screen.getByText('Stage Performance Overview')).toBeInTheDocument();
  });

  it('displays stage metrics correctly', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    expect(screen.getByText('lint')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('90.0% success')).toBeInTheDocument();
    expect(screen.getByText('75.0% success')).toBeInTheDocument();
    expect(screen.getByText('2.0s avg')).toBeInTheDocument();
    expect(screen.getByText('3.0s avg')).toBeInTheDocument();
  });

  it('displays total runs for each stage', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    expect(screen.getByText('10 total runs')).toBeInTheDocument();
    expect(screen.getByText('8 total runs')).toBeInTheDocument();
  });

  it('applies correct color classes based on success rate', () => {
    render(<ValidationChart metrics={mockMetrics} />);
    
    const lintSuccessRate = screen.getByText('90.0% success');
    const testSuccessRate = screen.getByText('75.0% success');
    
    expect(lintSuccessRate).toHaveClass('text-green-600');
    expect(testSuccessRate).toHaveClass('text-yellow-600');
  });
});