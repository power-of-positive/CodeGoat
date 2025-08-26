/* eslint-disable max-lines */
import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { ValidationRun } from '../../../shared/types';

interface TimeSeriesChartsProps {
  runs: ValidationRun[];
}

interface ChartDataPoint {
  timestamp: string;
  date: string;
  successRate: number;
  averageDuration: number;
  runCount: number;
}

type TimeGranularity =
  | 'today'
  | '3days'
  | '7days'
  | '30days'
  | '60days'
  | 'all';

interface GranularityConfig {
  label: string;
  days: number | null; // null means all data
  groupBy: 'hour' | 'day';
  formatString: string;
}

const GRANULARITY_OPTIONS: Record<TimeGranularity, GranularityConfig> = {
  today: {
    label: 'Today',
    days: 1,
    groupBy: 'hour',
    formatString: 'ha', // 2pm, 3pm, etc.
  },
  '3days': {
    label: 'Last 3 Days',
    days: 3,
    groupBy: 'day',
    formatString: 'MMM d', // Jan 1, Jan 2, etc.
  },
  '7days': {
    label: 'Last 7 Days',
    days: 7,
    groupBy: 'day',
    formatString: 'MMM d',
  },
  '30days': {
    label: 'Last 30 Days',
    days: 30,
    groupBy: 'day',
    formatString: 'MMM d',
  },
  '60days': {
    label: 'Last 60 Days',
    days: 60,
    groupBy: 'day',
    formatString: 'MMM d',
  },
  all: {
    label: 'All Time',
    days: null,
    groupBy: 'day',
    formatString: 'MMM d',
  },
};

function formatDate(timestamp: string, granularity: TimeGranularity): string {
  const date = new Date(timestamp);
  const config = GRANULARITY_OPTIONS[granularity];

  if (config.groupBy === 'hour') {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

function getGroupingKey(
  timestamp: string,
  granularity: TimeGranularity
): string {
  const date = new Date(timestamp);
  const config = GRANULARITY_OPTIONS[granularity];

  if (config.groupBy === 'hour') {
    // Group by hour within a day
    return `${date.toDateString()}-${date.getHours()}`;
  } else {
    // Group by day
    return date.toDateString();
  }
}

function filterRunsByTimeRange(
  runs: ValidationRun[],
  granularity: TimeGranularity
): ValidationRun[] {
  const config = GRANULARITY_OPTIONS[granularity];

  if (config.days === null) {
    return runs; // Return all data
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.days);

  return runs.filter((run) => new Date(run.timestamp) >= cutoffDate);
}

function processRunsData(
  runs: ValidationRun[],
  granularity: TimeGranularity
): ChartDataPoint[] {
  if (!runs || runs.length === 0) {
    return [];
  }

  // Filter runs based on time range
  const filteredRuns = filterRunsByTimeRange(runs, granularity);

  if (filteredRuns.length === 0) {
    return [];
  }

  // Group runs by the appropriate time unit
  const grouped = filteredRuns.reduce(
    (acc, run) => {
      const key = getGroupingKey(run.timestamp, granularity);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(run);
      return acc;
    },
    {} as Record<string, ValidationRun[]>
  );

  // Calculate metrics for each group
  const chartData: ChartDataPoint[] = Object.entries(grouped)
    .map(([_key, groupRuns]) => {
      const successfulRuns = groupRuns.filter((run) => run.success).length;
      const successRate = successfulRuns / groupRuns.length;
      const averageDuration =
        groupRuns.reduce((sum, run) => sum + run.duration, 0) /
        groupRuns.length;

      return {
        timestamp: groupRuns[0].timestamp,
        date: formatDate(groupRuns[0].timestamp, granularity),
        successRate: successRate * 100, // Convert to percentage
        averageDuration: averageDuration / 1000, // Convert to seconds
        runCount: groupRuns.length,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  return chartData;
}

interface GranularitySelectorProps {
  currentGranularity: TimeGranularity;
  onGranularityChange: (granularity: TimeGranularity) => void;
}

function GranularitySelector({
  currentGranularity,
  onGranularityChange,
}: GranularitySelectorProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <span className="text-sm font-medium text-gray-700 flex items-center mr-3">
        Time Range:
      </span>
      {Object.entries(GRANULARITY_OPTIONS).map(([key, config]) => (
        <Button
          key={key}
          variant={currentGranularity === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onGranularityChange(key as TimeGranularity)}
          className="text-xs"
        >
          {config.label}
        </Button>
      ))}
    </div>
  );
}

function renderEmptyState(granularity: TimeGranularity): React.JSX.Element {
  const config = GRANULARITY_OPTIONS[granularity];
  const timeRangeText = config.label.toLowerCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">
            Success Rate Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available for {timeRangeText}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">
            Average Duration Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available for {timeRangeText}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderSuccessRateChart(
  chartData: ChartDataPoint[],
  granularity: TimeGranularity
): React.JSX.Element {
  const config = GRANULARITY_OPTIONS[granularity];
  const groupByText = config.groupBy === 'hour' ? 'hour' : 'day';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-900">Success Rate Over Time</CardTitle>
        <p className="text-sm text-gray-600">
          Percentage of successful validation runs by {groupByText}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tick={{ fill: '#6b7280' }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#374151',
              }}
              formatter={(value: number) => [
                `${value.toFixed(1)}%`,
                'Success Rate',
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="successRate"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function renderDurationChart(
  chartData: ChartDataPoint[],
  granularity: TimeGranularity
): React.JSX.Element {
  const config = GRANULARITY_OPTIONS[granularity];
  const groupByText = config.groupBy === 'hour' ? 'hour' : 'day';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-900">
          Average Duration Over Time
        </CardTitle>
        <p className="text-sm text-gray-600">
          Average validation pipeline duration by {groupByText}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tick={{ fill: '#6b7280' }}
              tickFormatter={(value) => `${value}s`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#374151',
              }}
              formatter={(value: number) => [
                `${value.toFixed(1)}s`,
                'Avg Duration',
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="averageDuration"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TimeSeriesCharts({
  runs,
}: TimeSeriesChartsProps): React.JSX.Element {
  const [granularity, setGranularity] = useState<TimeGranularity>('7days');

  const chartData = useMemo(
    () => processRunsData(runs, granularity),
    [runs, granularity]
  );

  const handleGranularityChange = (newGranularity: TimeGranularity) => {
    setGranularity(newGranularity);
  };

  return (
    <div>
      <GranularitySelector
        currentGranularity={granularity}
        onGranularityChange={handleGranularityChange}
      />

      {chartData.length === 0 ? (
        renderEmptyState(granularity)
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderSuccessRateChart(chartData, granularity)}
          {renderDurationChart(chartData, granularity)}
        </div>
      )}
    </div>
  );
}
