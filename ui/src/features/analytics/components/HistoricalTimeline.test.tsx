import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HistoricalTimeline } from './HistoricalTimeline';
import { analyticsApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  analyticsApi: {
    getHistoricalData: jest.fn(),
  },
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockTimelineData = {
  timeline: [
    {
      timestamp: '2024-01-01',
      runs: [],
      totalRuns: 2,
      successfulRuns: 1,
      failedRuns: 1,
      successRate: 50.0,
      averageDuration: 4000,
      stagePerformance: {},
    },
  ],
  summary: {
    totalPeriods: 1,
    granularity: 'daily',
    dateRange: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-02T23:59:59Z',
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
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('HistoricalTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders loading state initially', () => {
    (analyticsApi.getHistoricalData as jest.MockedFunction<any>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<HistoricalTimeline />);

    // The skeleton loading state shows animated placeholders
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (analyticsApi.getHistoricalData as jest.MockedFunction<any>).mockRejectedValue(
      new Error('API Error')
    );

    renderWithQueryClient(<HistoricalTimeline />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load timeline data/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
  });

  it('renders timeline when data is loaded', async () => {
    (analyticsApi.getHistoricalData as jest.MockedFunction<any>).mockResolvedValue(mockTimelineData);

    renderWithQueryClient(<HistoricalTimeline />);

    await waitFor(() => {
      expect(screen.getByText('Historical Timeline')).toBeInTheDocument();
    });

    // Check summary cards
    expect(screen.getByText('Total Periods')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Granularity')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    (analyticsApi.getHistoricalData as jest.MockedFunction<any>).mockResolvedValue(mockTimelineData);

    renderWithQueryClient(<HistoricalTimeline />);

    await waitFor(() => {
      expect(screen.getByText('Historical Timeline')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/ });
    fireEvent.click(refreshButton);

    // Should call the API again
    expect(analyticsApi.getHistoricalData).toHaveBeenCalledTimes(2);
  });

  it('displays no data state when timeline is empty', async () => {
    (analyticsApi.getHistoricalData as jest.MockedFunction<any>).mockResolvedValue({
      timeline: [],
      summary: { totalPeriods: 0, granularity: 'daily', dateRange: { start: '', end: '' } },
    });

    renderWithQueryClient(<HistoricalTimeline />);

    await waitFor(() => {
      expect(screen.getByText('No Timeline Data')).toBeInTheDocument();
    });

    expect(screen.getByText('No validation run data found for the selected time period.')).toBeInTheDocument();
  });

  it('accepts initial props correctly', async () => {
    (analyticsApi.getHistoricalData as jest.MockedFunction<any>).mockResolvedValue(mockTimelineData);

    renderWithQueryClient(
      <HistoricalTimeline 
        defaultDays={7} 
        autoRefresh={true} 
        refreshInterval={10000} 
      />
    );

    await waitFor(() => {
      expect(analyticsApi.getHistoricalData).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 7,
        })
      );
    });
  });
});