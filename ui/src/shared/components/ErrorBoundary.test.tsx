import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Boom!');
  }
  return <div data-testid="safe-child">All good</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });

  it('shows fallback UI when an error is thrown and can reset', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });

  it('renders development error details when NODE_ENV is development', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(
      screen.getByText(/Error Details \(Development\)/i)
    ).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('wraps components with withErrorBoundary HOC', () => {
    const Wrapped = withErrorBoundary(ProblemChild, {
      fallbackTitle: 'Custom Error',
    });

    const { rerender } = render(<Wrapped shouldThrow />);

    expect(screen.getByText(/Custom Error/i)).toBeInTheDocument();

    rerender(<Wrapped />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });
});
