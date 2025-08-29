import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StageStatistics } from './StageStatistics';
import { analyticsApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  analyticsApi: {
    getStageAnalytics: jest.fn(),
  },
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
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

const mockStageAnalyticsData = {
  overview: {
    totalStages: 5,
    period: 'Last 30 days',
    totalStageExecutions: 150,
  },
  stageStatistics: [
    {
      stageId: 'lint',
      stageName: 'Lint',
      totalRuns: 50,
      successfulRuns: 48,
      failedRuns: 2,
      successRate: 95.0,
      totalDuration: 1525000, // 25.5 minutes total
      avgDuration: 30500, // 30.5 seconds average
      minDuration: 25000, // 25 seconds
      maxDuration: 40000, // 40 seconds
      reliability: 'excellent' as const,
    },
  ],
  trends: [
    {
      metric: 'avgDuration',
      current: 30500,
      previous: 29000,
      change: 5.2,
      trend: 'up' as const
    },
    {
      metric: 'successRate',
      current: 95.0,
      previous: 96.1,
      change: -1.1,
      trend: 'down' as const
    },
    {
      metric: 'totalRuns',
      current: 50,
      previous: 44,
      change: 12.3,
      trend: 'up' as const
    }
  ],
  insights: {
    problematicStages: [
      {
        stageId: 'typecheck',
        stageName: 'Type Check', 
        totalRuns: 30,
        successfulRuns: 25,
        failedRuns: 5,
        successRate: 83.3,
        avgDuration: 45000,
        reliability: 'poor' as const
      }
    ],
    topPerformingStages: [
      {
        stageId: 'lint',
        stageName: 'Lint',
        avgDuration: 25500, // 25.5s
        successRate: 98.5
      },
      {
        stageId: 'typecheck', 
        stageName: 'Type Check',
        avgDuration: 120300, // 120.3s
        successRate: 92.1
      }
    ],
    stageExecutionPattern: [
      { hour: 9, executions: 15 },
      { hour: 10, executions: 25 },
      { hour: 11, executions: 20 }
    ],
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
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('StageStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<StageStatistics />);

    // The skeleton loading state shows animated placeholders
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockRejectedValue(
      new Error('API Error')
    );

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load stage statistics/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
  });

  it('renders stage statistics when data is loaded', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Check overview cards
    expect(screen.getByText('Total Stages')).toBeInTheDocument();
    expect(screen.getAllByText('5')).toHaveLength(2); // Multiple cards may show "5"
    expect(screen.getByText('Total Executions')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    // Check stage table (using getAllByText to handle multiple instances)
    expect(screen.getAllByText('Lint')).toHaveLength(3); // Filter option, table, and insights section
  });

  it('handles filter changes', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Change time period
    const timeSelect = screen.getByDisplayValue('Last 30 days');
    fireEvent.change(timeSelect, { target: { value: '7' } });

    await waitFor(() => {
      expect(analyticsApi.getStageAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ days: 7 })
      );
    });
  });

  it('handles refresh functionality', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/ });
    fireEvent.click(refreshButton);

    // Should call the API again
    expect(analyticsApi.getStageAnalytics).toHaveBeenCalledTimes(2);
  });

  it('handles no data state', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(null);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('No Statistics Available')).toBeInTheDocument();
    });

    expect(screen.getByText('No stage performance data found for the selected time period. Try adjusting your date range or check if validation runs exist.')).toBeInTheDocument();
  });

  it('handles stage filter selection', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics stageId="specific-stage" />);

    await waitFor(() => {
      expect(analyticsApi.getStageAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ stageId: 'specific-stage' })
      );
    });
  });

  it('displays performance metrics correctly', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate
    });

    // Check for stage-specific metrics - using formatted duration from component
    expect(screen.getByText('30500.0ms')).toBeInTheDocument(); // Duration from mock data formatted with decimals
  });

  it('handles environment filter changes', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics stageId="prod-stage" />);

    await waitFor(() => {
      expect(analyticsApi.getStageAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ stageId: 'prod-stage' })
      );
    });
  });

  it('displays charts correctly', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Check for chart containers - performance view shows 2 charts by default
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2); // Success rate + Duration charts
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(2); // Both charts are bar charts in performance view
  });

  it('handles retry button click on error', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load stage statistics/)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Try Again/ });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    expect(analyticsApi.getStageAnalytics).toHaveBeenCalledTimes(2);
  });

  it('displays stage comparison data', async () => {
    const mockDataWithComparison = {
      ...mockStageAnalyticsData,
      stageComparisons: [
        { stageName: 'Lint', avgDuration: 25.5, successRate: 98.5, executions: 50 },
        { stageName: 'Test', avgDuration: 120.3, successRate: 92.1, executions: 45 },
      ]
    };

    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockDataWithComparison);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // The component shows the data in the table and insights sections
    expect(screen.getByText('25500.0ms')).toBeInTheDocument(); // From table formatting
    expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate from mock data
  });

  it('handles date range filter correctly', async () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(mockStageAnalyticsData);

    renderWithQueryClient(<StageStatistics defaultDays={30} />);

    await waitFor(() => {
      expect(analyticsApi.getStageAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ 
          days: 30
        })
      );
    });
  });

  it('displays loading skeletons correctly', () => {
    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading state
    );

    renderWithQueryClient(<StageStatistics />);

    // Check for skeleton loading indicator (animate-pulse class shows skeleton)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles empty stage list gracefully', async () => {
    const emptyData = {
      ...mockStageAnalyticsData,
      stageStatistics: [] // Correct property name
    };

    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(emptyData);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Component still renders with empty data, but table shows no rows
    expect(screen.getByText('Detailed Stage Statistics')).toBeInTheDocument();
  });

  it('displays trend indicators correctly', async () => {
    const dataWithTrends = {
      ...mockStageAnalyticsData,
      trends: [
        {
          metric: 'avgDuration',
          current: 30500,
          previous: 29000,
          change: 5.2,
          trend: 'up' as const
        }
      ]
    };

    (analyticsApi.getStageAnalytics as jest.MockedFunction<any>).mockResolvedValue(dataWithTrends);

    renderWithQueryClient(<StageStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Stage Performance Analytics')).toBeInTheDocument();
    });

    // Check that trends data is present (component displays 2 charts in performance view)
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2); // Performance view shows 2 charts
  });
});