import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformanceComparison } from './PerformanceComparison';
import { analyticsApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  analyticsApi: {
    getPerformanceComparison: jest.fn(),
  },
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Radar: () => <div data-testid="radar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
}));

const mockComparisonData = {
  periods: {
    period1: {
      label: '2024-01-01 - 2024-01-31',
      totalRuns: 100,
      successfulRuns: 85,
      failedRuns: 15,
      successRate: 85.0,
      avgDuration: 5000,
      stages: [],
    },
    period2: {
      label: '2023-12-01 - 2023-12-31',
      totalRuns: 80,
      successfulRuns: 60,
      failedRuns: 20,
      successRate: 75.0,
      avgDuration: 6000,
      stages: [],
    },
  },
  comparison: {
    overall: {
      successRate: { value: 10.0, percentage: 13.33, trend: 'up' as const },
      avgDuration: { value: -1000, percentage: -16.67, trend: 'down' as const },
      totalRuns: { value: 20, percentage: 25.0, trend: 'up' as const },
    },
    stages: [],
  },
  insights: {
    improved: 3,
    degraded: 0,
    stable: 0,
    newStages: 1,
    removedStages: 0,
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

describe('PerformanceComparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (analyticsApi.getPerformanceComparison as jest.MockedFunction<any>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<PerformanceComparison />);

    // The skeleton loading state shows animated placeholders
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (analyticsApi.getPerformanceComparison as jest.MockedFunction<any>).mockRejectedValue(
      new Error('API Error')
    );

    renderWithQueryClient(<PerformanceComparison />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load comparison data/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
  });

  it('renders comparison data when loaded', async () => {
    (analyticsApi.getPerformanceComparison as jest.MockedFunction<any>).mockResolvedValue(
      mockComparisonData
    );

    renderWithQueryClient(<PerformanceComparison />);

    await waitFor(() => {
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument();
    });

    // Check period cards using getAllByText for duplicated text
    expect(screen.getAllByText('Period 1 (Recent)')).toHaveLength(2); // One in form label, one in card
    expect(screen.getAllByText('Period 2 (Previous)')).toHaveLength(2); // One in form label, one in card
    expect(screen.getByText('100')).toBeInTheDocument(); // Period 1 total runs
    expect(screen.getByText('80')).toBeInTheDocument(); // Period 2 total runs

    // Check overall metrics
    expect(screen.getByText('Overall Performance Changes')).toBeInTheDocument();

    // Check that the insights section cards are rendered
    expect(screen.getByText('Improved Stages')).toBeInTheDocument();
    expect(screen.getByText('Degraded Stages')).toBeInTheDocument();
    expect(screen.getByText('New Stages')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    (analyticsApi.getPerformanceComparison as jest.MockedFunction<any>).mockResolvedValue(
      mockComparisonData
    );

    renderWithQueryClient(<PerformanceComparison />);

    await waitFor(() => {
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/ });
    fireEvent.click(refreshButton);

    // Should call the API again
    expect(analyticsApi.getPerformanceComparison).toHaveBeenCalledTimes(2);
  });

  it('displays no data state when no comparison data available', async () => {
    (analyticsApi.getPerformanceComparison as jest.MockedFunction<any>).mockResolvedValue(null);

    renderWithQueryClient(<PerformanceComparison />);

    await waitFor(() => {
      expect(screen.getByText('No Comparison Data')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Configure date ranges to compare validation performance across periods.')
    ).toBeInTheDocument();
  });

  it('shows insights summary correctly', async () => {
    (analyticsApi.getPerformanceComparison as jest.MockedFunction<any>).mockResolvedValue(
      mockComparisonData
    );

    renderWithQueryClient(<PerformanceComparison />);

    await waitFor(() => {
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument();
    });

    // Check insights cards
    expect(screen.getByText('Improved Stages')).toBeInTheDocument();
    expect(screen.getByText('Degraded Stages')).toBeInTheDocument();
    expect(screen.getByText('Stable Stages')).toBeInTheDocument();
    expect(screen.getByText('New Stages')).toBeInTheDocument();
    expect(screen.getByText('Removed Stages')).toBeInTheDocument();

    // Verify the overall performance changes section is present
    expect(screen.getByText('Overall Performance Changes')).toBeInTheDocument();
  });
});
