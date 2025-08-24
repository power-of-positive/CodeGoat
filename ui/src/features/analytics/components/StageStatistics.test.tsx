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
      successRate: 96.0,
      totalDuration: 15000,
      avgDuration: 300,
      minDuration: 250,
      maxDuration: 400,
      reliability: 'excellent' as const,
    },
  ],
  trends: [],
  insights: {
    problematicStages: [],
    topPerformingStages: [],
    stageExecutionPattern: [],
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
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Total Executions')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    // Check stage table (using getAllByText to handle multiple instances)
    expect(screen.getAllByText('Lint')).toHaveLength(2); // One in filter, one in table
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
      expect(screen.getByText('No Data Available')).toBeInTheDocument();
    });

    expect(screen.getByText('No stage statistics found for the selected period.')).toBeInTheDocument();
  });
});