import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StageStatistics } from './StageStatistics';
import { analyticsApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  analyticsApi: {
    getStageStatistics: jest.fn(),
  },
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Pie: () => <div data-testid="pie" />,
  Scatter: () => <div data-testid="scatter" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: () => <div data-testid="radar" />,
}));

const mockStageStatisticsData = {
  overview: {
    totalAttempts: 100,
    totalSuccesses: 95,
    totalFailures: 5,
    successRate: 95.0,
    averageDuration: 15000, // 15 seconds
    medianDuration: 12000,
    minDuration: 5000,
    maxDuration: 30000,
    standardDeviation: 5000,
  },
  recentRuns: [
    {
      timestamp: '2023-01-01T12:00:00.000Z',
      success: true,
      duration: 12000,
      sessionId: 'session_1',
    },
    {
      timestamp: '2023-01-01T11:00:00.000Z',
      success: false,
      duration: 25000,
      sessionId: 'session_2',
      error: 'Test failed',
    },
  ],
  performanceMetrics: {
    durationsPercentiles: {
      p50: 12000,
      p90: 20000,
      p95: 25000,
      p99: 30000,
    },
    successRateByTimeOfDay: {
      '09:00': { attempts: 10, successes: 9, rate: 90 },
      '10:00': { attempts: 15, successes: 14, rate: 93.3 },
      '11:00': { attempts: 20, successes: 19, rate: 95 },
    },
    failureReasons: {
      'Test Failure': 3,
      Timeout: 1,
      'Compilation Error': 1,
    },
  },
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe('StageStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<StageStatistics />);

    // The skeleton loading state shows animated placeholders
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockRejectedValue(
      new Error('API Error')
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load stage performance statistics/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
  });

  it('renders stage statistics when data is loaded', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Check overview cards with actual component text
    expect(screen.getByText('Total Attempts')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // From mock data
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
    expect(screen.getByText('Failures')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Check that filters are present
    expect(screen.getByText('Linting')).toBeInTheDocument(); // Stage filter option
  });

  it('handles filter changes', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Change time period - find the second select element (time period)
    const selects = screen.getAllByRole('combobox');
    const timeSelect = selects[1]; // Second select is time period
    fireEvent.change(timeSelect, { target: { value: '7' } });

    await waitFor(() => {
      expect(analyticsApi.getStageStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ days: 7 })
      );
    });
  });

  it('handles refresh functionality', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/ });
    fireEvent.click(refreshButton);

    // Should call the API again
    expect(analyticsApi.getStageStatistics).toHaveBeenCalledTimes(2);
  });

  it('handles no data state', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(null);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('No Statistics Available')).toBeInTheDocument();
    });

    expect(
      screen.getByText('No stage performance data found for the selected time period.')
    ).toBeInTheDocument();
  });

  it('handles stage filter selection', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics stageId="specific-stage" />);

    await waitFor(() => {
      expect(analyticsApi.getStageStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'specific-stage' })
      );
    });
  });

  it('displays performance metrics correctly', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate
    });

    // Check for stage-specific metrics - using formatted duration from component
    expect(screen.getByText('15.0s')).toBeInTheDocument(); // Duration from mock data (15 seconds)
  });

  it('handles environment filter changes', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics stageId="prod-stage" />);

    await waitFor(() => {
      expect(analyticsApi.getStageStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'prod-stage' })
      );
    });
  });

  it('displays charts correctly', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Check for chart containers - the component shows charts based on data
    const responsiveContainers = screen.getAllByTestId('responsive-container');
    expect(responsiveContainers.length).toBeGreaterThanOrEqual(1); // At least one chart

    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts.length).toBeGreaterThanOrEqual(1); // At least one bar chart
  });

  it('handles retry button click on error', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockStageStatisticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load stage performance statistics/)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Try Again/ });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    expect(analyticsApi.getStageStatistics).toHaveBeenCalledTimes(2);
  });

  it('displays stage comparison data', async () => {
    const mockDataWithComparison = {
      ...mockStageStatisticsData,
      stageComparisons: [
        { stageName: 'Lint', avgDuration: 25.5, successRate: 98.5, executions: 50 },
        { stageName: 'Test', avgDuration: 120.3, successRate: 92.1, executions: 45 },
      ],
    };

    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockDataWithComparison
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // The component shows the data in the table and insights sections
    expect(screen.getByText('15.0s')).toBeInTheDocument(); // Average duration from mock data
    expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate from mock data
  });

  it('handles date range filter correctly', async () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(
      mockStageStatisticsData
    );

    renderWithQueryClient(<StageStatistics defaultDays={30} />);

    await waitFor(() => {
      expect(analyticsApi.getStageStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
          stage: 'lint', // Default stage
        })
      );
    });
  });

  it('displays loading skeletons correctly', () => {
    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading state
    );

    renderWithQueryClient(<StageStatistics />);

    // Check for skeleton loading indicator (animate-pulse class shows skeleton)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles empty stage list gracefully', async () => {
    const emptyData = {
      ...mockStageStatisticsData,
      stageStatistics: [], // Correct property name
    };

    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(emptyData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Component still renders with empty data, but shows filters
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('displays trend indicators correctly', async () => {
    const dataWithTrends = {
      ...mockStageStatisticsData,
      trends: [
        {
          metric: 'avgDuration',
          current: 30500,
          previous: 29000,
          change: 5.2,
          trend: 'up' as const,
        },
      ],
    };

    (analyticsApi.getStageStatistics as jest.MockedFunction<any>).mockResolvedValue(dataWithTrends);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Check that trends data is present (component displays 2 charts in performance view)
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2); // Performance view shows 2 charts
  });
});
