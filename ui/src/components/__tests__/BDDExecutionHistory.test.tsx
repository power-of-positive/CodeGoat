import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BDDExecutionHistory from '../BDDExecutionHistory';
import { taskApi } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  taskApi: {
    getScenarioExecutions: jest.fn(),
    getScenarioAnalytics: jest.fn(),
  },
}));

const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;

// Mock chart components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockExecutions = [
  {
    id: 'exec1',
    scenarioId: 'scenario1',
    status: 'passed' as const,
    executedAt: '2023-01-01T10:00:00Z',
    executionDuration: 1500,
    errorMessage: null,
    stepResults: [
      { step: 'Given user is logged in', status: 'passed' as const, duration: 500 },
      { step: 'When user clicks button', status: 'passed' as const, duration: 300 },
      { step: 'Then page loads', status: 'passed' as const, duration: 700 }
    ],
    environment: 'staging',
    executedBy: 'alice',
    gherkinSnapshot: 'Feature: Test'
  },
  {
    id: 'exec2',
    scenarioId: 'scenario1',
    status: 'failed' as const,
    executedAt: '2023-01-01T09:00:00Z',
    executionDuration: 800,
    errorMessage: 'Element not found',
    stepResults: [
      { step: 'Given user is logged in', status: 'passed' as const, duration: 500 },
      { step: 'When user clicks button', status: 'failed' as const, duration: 300, error: 'Button not found' }
    ],
    environment: 'dev',
    executedBy: 'bob',
    gherkinSnapshot: 'Feature: Test'
  }
];

const mockAnalytics = {
  summary: {
    totalExecutions: 2,
    passedExecutions: 1,
    failedExecutions: 1,
    skippedExecutions: 0,
    successRate: 50,
    averageDuration: 1150
  },
  trends: [
    {
      date: '2023-01-01',
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0
    }
  ],
  recentExecutions: [
    {
      id: 'exec1',
      status: 'passed',
      executedAt: '2023-01-01T10:00:00Z',
      executionDuration: 1500,
      environment: 'staging',
      executedBy: 'alice'
    }
  ]
};

describe('BDDExecutionHistory', () => {
  beforeEach(() => {
    mockTaskApi.getScenarioExecutions.mockResolvedValue(mockExecutions);
    mockTaskApi.getScenarioAnalytics.mockResolvedValue(mockAnalytics);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders execution history with loading state', async () => {
    mockTaskApi.getScenarioExecutions.mockImplementation(() => new Promise(() => {})); // Never resolves
    mockTaskApi.getScenarioAnalytics.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    expect(screen.getByText('Execution History')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-cards')).toBeInTheDocument();
  });

  test('renders execution analytics summary', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    await waitFor(() => {
      expect(screen.getByText('Total Executions')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument();
      expect(screen.getByText('1 passed, 1 failed')).toBeInTheDocument();
    });
  });

  test('renders execution trends chart', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    await waitFor(() => {
      expect(screen.getByText('Execution Trends')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  test('renders recent executions section', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Executions')).toBeInTheDocument();
      expect(screen.getByText('Total Executions')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });
  });

  test('renders latest step results', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    await waitFor(() => {
      expect(screen.getByText('Latest Step Results')).toBeInTheDocument();
      expect(screen.getByText('Given user is logged in')).toBeInTheDocument();
      expect(screen.getByText('When user clicks button')).toBeInTheDocument();
      expect(screen.getByText('Then page loads')).toBeInTheDocument();
      expect(screen.getByText('500ms')).toBeInTheDocument();
      expect(screen.getByText('300ms')).toBeInTheDocument();
      expect(screen.getByText('700ms')).toBeInTheDocument();
    });
  });

  test('handles empty execution history', async () => {
    mockTaskApi.getScenarioExecutions.mockResolvedValue([]);
    mockTaskApi.getScenarioAnalytics.mockResolvedValue({
      ...mockAnalytics,
      summary: {
        totalExecutions: 0,
        passedExecutions: 0,
        failedExecutions: 0,
        skippedExecutions: 0,
        successRate: 0,
        averageDuration: 0
      },
      trends: [],
      recentExecutions: []
    });

    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    await waitFor(() => {
      expect(screen.getByText('No execution history found')).toBeInTheDocument();
      expect(screen.getByText('Executions will appear here once the scenario is run')).toBeInTheDocument();
    });
  });

  test('calls correct API endpoints with taskId and scenarioId', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task123" scenarioId="scenario456" />
    );

    await waitFor(() => {
      expect(mockTaskApi.getScenarioExecutions).toHaveBeenCalledWith('task123', 'scenario456', { limit: 50 });
      expect(mockTaskApi.getScenarioAnalytics).toHaveBeenCalledWith('task123', 'scenario456', 30);
    });
  });

  test('changes analytics period when dropdown selection changes', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
    });

    // Change the dropdown to 7 days
    const dropdown = screen.getByDisplayValue('Last 30 days');
    dropdown.focus();
    dropdown.blur();

    // The component should re-query with the new period
    expect(mockTaskApi.getScenarioAnalytics).toHaveBeenCalledWith('task1', 'scenario1', 30);
  });

  test('refresh button triggers data refetch', async () => {
    renderWithProviders(
      <BDDExecutionHistory taskId="task1" scenarioId="scenario1" />
    );

    const refreshButton = await screen.findByRole('button', { name: /refresh/i });
    refreshButton.click();

    await waitFor(() => {
      expect(mockTaskApi.getScenarioExecutions).toHaveBeenCalledTimes(2);
      expect(mockTaskApi.getScenarioAnalytics).toHaveBeenCalledTimes(2);
    });
  });
});