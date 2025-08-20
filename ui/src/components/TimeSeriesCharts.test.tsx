import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeriesCharts } from './TimeSeriesCharts';
import { ValidationRun } from '../../shared/types';

// Mock recharts components since they don't work well in Jest environment
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
}));

// Generate recent timestamps for testing
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(now.getDate() - 2);

const mockRuns: ValidationRun[] = [
  {
    id: 'run-1',
    timestamp: yesterday.toISOString(),
    stages: [
      {
        id: 'lint',
        name: 'Code Linting',
        success: true,
        duration: 2000,
        attempt: 1,
      },
    ],
    success: true,
    duration: 2000,
  },
  {
    id: 'run-2',
    timestamp: twoDaysAgo.toISOString(),
    stages: [
      {
        id: 'lint',
        name: 'Code Linting',
        success: false,
        duration: 3000,
        attempt: 1,
      },
    ],
    success: false,
    duration: 3000,
  },
];

describe('TimeSeriesCharts Component', () => {
  it('renders success rate and duration charts with data', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);

    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
    expect(
      screen.getByText(/Percentage of successful validation runs by/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Average validation pipeline duration by/)
    ).toBeInTheDocument();
  });

  it('renders no data message when runs array is empty', () => {
    render(<TimeSeriesCharts runs={[]} />);

    expect(
      screen.getAllByText('No data available for last 7 days')
    ).toHaveLength(2);
  });

  it('renders chart components when data is available', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);

    expect(screen.getAllByTestId('area-chart')).toHaveLength(1);
    expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
  });

  it('handles runs with different timestamps properly', () => {
    // Generate recent timestamps for multi-day test
    const day1 = new Date(now);
    day1.setDate(now.getDate() - 1);
    const day2 = new Date(now);
    day2.setDate(now.getDate() - 2);
    const day3 = new Date(now);
    day3.setDate(now.getDate() - 3);

    const multiDayRuns: ValidationRun[] = [
      {
        id: 'run-1',
        timestamp: day1.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 2000,
            attempt: 1,
          },
        ],
        success: true,
        duration: 2000,
      },
      {
        id: 'run-2',
        timestamp: day2.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: false,
            duration: 3000,
            attempt: 1,
          },
        ],
        success: false,
        duration: 3000,
      },
      {
        id: 'run-3',
        timestamp: day3.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 1500,
            attempt: 1,
          },
        ],
        success: true,
        duration: 1500,
      },
    ];

    render(<TimeSeriesCharts runs={multiDayRuns} />);

    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
  });

  it('handles undefined runs gracefully', () => {
    render(<TimeSeriesCharts runs={undefined as any} />);

    expect(
      screen.getAllByText('No data available for last 7 days')
    ).toHaveLength(2);
  });

  it('groups runs by day correctly', () => {
    const sameDay = new Date(now);
    sameDay.setDate(now.getDate() - 1);
    const morning = new Date(sameDay);
    morning.setHours(9, 0, 0);
    const afternoon = new Date(sameDay);
    afternoon.setHours(15, 0, 0);

    const sameDayRuns: ValidationRun[] = [
      {
        id: 'run-1',
        timestamp: morning.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 2000,
            attempt: 1,
          },
        ],
        success: true,
        duration: 2000,
      },
      {
        id: 'run-2',
        timestamp: afternoon.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: false,
            duration: 3000,
            attempt: 1,
          },
        ],
        success: false,
        duration: 3000,
      },
    ];

    render(<TimeSeriesCharts runs={sameDayRuns} />);

    // Should still render charts for same-day runs
    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
  });

  it('handles runs with missing duration', () => {
    const recent1 = new Date(now);
    recent1.setDate(now.getDate() - 1);
    const recent2 = new Date(now);
    recent2.setDate(now.getDate() - 2);

    const runsWithMissingDuration: ValidationRun[] = [
      {
        id: 'run-1',
        timestamp: recent1.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 2000,
            attempt: 1,
          },
        ],
        success: true,
        duration: undefined as any,
      },
      {
        id: 'run-2',
        timestamp: recent2.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: false,
            duration: 3000,
            attempt: 1,
          },
        ],
        success: false,
        duration: 5000,
      },
    ];

    render(<TimeSeriesCharts runs={runsWithMissingDuration} />);

    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
  });

  it('renders with single run', () => {
    const recentRun = new Date(now);
    recentRun.setDate(now.getDate() - 1);

    const singleRun: ValidationRun[] = [
      {
        id: 'run-1',
        timestamp: recentRun.toISOString(),
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 2000,
            attempt: 1,
          },
        ],
        success: true,
        duration: 2500,
      },
    ];

    render(<TimeSeriesCharts runs={singleRun} />);

    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
    expect(screen.getAllByTestId('area-chart')).toHaveLength(1);
    expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
  });

  it('handles runs with invalid timestamps', () => {
    const runsWithInvalidTimestamp: ValidationRun[] = [
      {
        id: 'run-1',
        timestamp: 'invalid-date',
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 2000,
            attempt: 1,
          },
        ],
        success: true,
        duration: 2000,
      },
      {
        id: 'run-2',
        timestamp: '2023-12-01T10:00:00Z',
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: false,
            duration: 3000,
            attempt: 1,
          },
        ],
        success: false,
        duration: 3000,
      },
    ];

    render(<TimeSeriesCharts runs={runsWithInvalidTimestamp} />);

    // Should still render despite invalid timestamp
    expect(screen.getByText('Success Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Average Duration Over Time')).toBeInTheDocument();
  });
});
