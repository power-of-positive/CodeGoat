import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeriesCharts } from './TimeSeriesCharts';
import { ValidationRun } from '../../shared/types';

// Mock recharts components since they don't work well in Jest environment
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
}));

const mockRuns: ValidationRun[] = [
  {
    id: 'run-1',
    timestamp: '2023-12-01T10:00:00Z',
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
    timestamp: '2023-12-01T11:00:00Z',
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
    expect(screen.getByText('Percentage of successful validation runs by day')).toBeInTheDocument();
    expect(screen.getByText('Average validation pipeline duration by day')).toBeInTheDocument();
  });

  it('renders no data message when runs array is empty', () => {
    render(<TimeSeriesCharts runs={[]} />);
    
    expect(screen.getByText('No data available for success rate tracking')).toBeInTheDocument();
    expect(screen.getByText('No data available for duration tracking')).toBeInTheDocument();
  });

  it('renders chart components when data is available', () => {
    render(<TimeSeriesCharts runs={mockRuns} />);
    
    expect(screen.getAllByTestId('area-chart')).toHaveLength(1);
    expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
  });
});