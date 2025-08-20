import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSeriesCharts } from '../../components/TimeSeriesCharts';
import { ValidationRun } from '../../../shared/types';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockRuns: ValidationRun[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    success: true,
    duration: 5000,
    stages: [],
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    success: false,
    duration: 3000,
    stages: [],
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    success: true,
    duration: 4000,
    stages: [],
  },
];

describe('TimeSeriesCharts', () => {
  it('should render granularity selector buttons', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);

    expect(screen.getByText('Time Range:')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 60 Days')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('should have "Last 7 Days" selected by default', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);

    const sevenDaysButton = screen.getByText('Last 7 Days');
    // Check for default button styling (blue background)
    expect(sevenDaysButton).toHaveClass('bg-blue-600');
  });

  it('should change granularity when button is clicked', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);

    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);

    // The button should now have the active styling (blue background)
    expect(todayButton).toHaveClass('bg-blue-600');
  });

  it('should render chart headers when component loads', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);

    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
  });

  it('should render empty state when no data for selected time range', () => {
    // Provide runs that are outside the "today" range
    const oldRuns: ValidationRun[] = [
      {
        id: '1',
        timestamp: '2025-01-01T08:00:00.000Z', // Very old data
        success: true,
        duration: 5000,
        stages: [],
      },
    ];

    render(<TimeSeriesCharts runs={oldRuns} />);

    // Click "Today" to filter to today's data
    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);

    // Should show empty state for today (appears twice in two charts)
    expect(screen.getAllByText('No data available for today')).toHaveLength(2);
  });

  it('should render without errors when runs array is empty', () => {
    render(<TimeSeriesCharts runs={[]} />);

    expect(screen.getByText('Time Range:')).toBeInTheDocument();
    expect(screen.getAllByText('No data available for last 7 days')).toHaveLength(2); // Two charts showing empty state
  });
});
