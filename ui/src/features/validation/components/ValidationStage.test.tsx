import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationStage } from './ValidationStage';
import { ValidationStageResult } from '../../../shared/types/index';

describe('ValidationStage', () => {
  const mockSuccessStage: ValidationStageResult = {
    id: '1',
    name: 'lint',
    success: true,
    duration: 2000,
    attempt: 1,
    output: 'All files pass linting',
    error: undefined,
    status: 'passed',
  };

  const mockFailedStage: ValidationStageResult = {
    id: '2',
    name: 'test',
    success: false,
    duration: 5000,
    attempt: 1,
    output: 'Some tests failed',
    error: 'Test suite failed',
    status: 'failed',
  };

  it('renders successful stage correctly', () => {
    render(<ValidationStage stage={mockSuccessStage} />);

    expect(screen.getByText('lint')).toBeInTheDocument();
    expect(screen.getByText('2.0s')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('All files pass linting')).toBeInTheDocument();
  });

  it('renders failed stage correctly', () => {
    render(<ValidationStage stage={mockFailedStage} />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('5.0s')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
    expect(screen.getByText('Some tests failed')).toBeInTheDocument();
    expect(screen.getByText('Test suite failed')).toBeInTheDocument();
  });

  it('shows retry button for failed stage when onRetry provided', () => {
    const mockRetry = jest.fn();
    render(<ValidationStage stage={mockFailedStage} onRetry={mockRetry} />);

    const retryButton = screen.getByText('Retry Stage');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for successful stage', () => {
    const mockRetry = jest.fn();
    render(<ValidationStage stage={mockSuccessStage} onRetry={mockRetry} />);

    expect(screen.queryByText('Retry Stage')).not.toBeInTheDocument();
  });

  it('does not show retry button when onRetry not provided', () => {
    render(<ValidationStage stage={mockFailedStage} />);

    expect(screen.queryByText('Retry Stage')).not.toBeInTheDocument();
  });
});
