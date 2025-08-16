import React, { useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ValidationRun } from '../../shared/types';

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

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TimeSeriesCharts({ runs }: TimeSeriesChartsProps) {
  const chartData = useMemo(() => {
    if (!runs || runs.length === 0) return [];

    // Group runs by day for better visualization
    const groupedByDay = runs.reduce((acc, run) => {
      const day = new Date(run.timestamp).toDateString();
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(run);
      return acc;
    }, {} as Record<string, ValidationRun[]>);

    // Calculate daily metrics
    const dailyData: ChartDataPoint[] = Object.entries(groupedByDay)
      .map(([day, dayRuns]) => {
        const successfulRuns = dayRuns.filter(run => run.success).length;
        const successRate = successfulRuns / dayRuns.length;
        const averageDuration = dayRuns.reduce((sum, run) => sum + run.duration, 0) / dayRuns.length;
        
        return {
          timestamp: dayRuns[0].timestamp,
          date: formatDate(dayRuns[0].timestamp),
          successRate: successRate * 100, // Convert to percentage
          averageDuration: averageDuration / 1000, // Convert to seconds
          runCount: dayRuns.length,
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-30); // Show last 30 days

    return dailyData;
  }, [runs]);

  if (chartData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Success Rate Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available for success rate tracking
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Average Duration Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available for duration tracking
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Success Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Success Rate Over Time</CardTitle>
          <p className="text-sm text-gray-600">Percentage of successful validation runs by day</p>
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
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
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

      {/* Duration Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Average Duration Over Time</CardTitle>
          <p className="text-sm text-gray-600">Average validation pipeline duration by day</p>
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
                formatter={(value: number) => [`${value.toFixed(1)}s`, 'Avg Duration']}
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
    </div>
  );
}