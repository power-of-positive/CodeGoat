/* eslint-disable max-lines */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { SimpleSelect as Select, Option } from '../../../shared/ui/select';
import { PageLoading } from '../../../shared/ui/loading';
import { analyticsApi } from '../../../shared/lib/api';

// Constants
const DEFAULT_DAYS_PERIOD = 30;
const STALE_TIME_MINUTES = 5;
const MINUTES_TO_MILLISECONDS = 60 * 1000;

interface StageStatisticsProps {
  defaultDays?: number;
  stageId?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function StageStatistics({ defaultDays = DEFAULT_DAYS_PERIOD, stageId }: StageStatisticsProps) {
  const [days, setDays] = useState(defaultDays);
  const [selectedStage, setSelectedStage] = useState(stageId || 'lint');

  const {
    data: stageData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stage-statistics', selectedStage, days],
    queryFn: () => {
      if (!selectedStage) {
        return Promise.resolve(null);
      }
      return analyticsApi.getStageStatistics({
        stage: selectedStage,
        days,
      });
    },
    staleTime: STALE_TIME_MINUTES * MINUTES_TO_MILLISECONDS,
    enabled: !!selectedStage,
  });

  const availableStages = useMemo(() => [
    { id: 'lint', name: 'Linting' },
    { id: 'typecheck', name: 'Type Checking' },
    { id: 'unit-tests-backend', name: 'Backend Unit Tests' },
    { id: 'unit-tests-frontend', name: 'Frontend Unit Tests' },
    { id: 'e2e-tests', name: 'E2E Tests' },
    { id: 'api-e2e-tests', name: 'API E2E Tests' },
  ], []);

  const handleExportData = () => {
    if (!stageData) return;
    
    const exportData = {
      exportDate: new Date().toISOString(),
      stage: selectedStage,
      days,
      data: stageData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stage-statistics-${selectedStage}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <PageLoading message="Loading stage statistics..." type="skeleton" />;
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Statistics</h3>
              <p className="text-gray-600 mb-4">
                Failed to load stage performance statistics. Please try again.
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stageData) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Statistics Available</h3>
              <p className="text-gray-600 mb-4">
                No stage performance data found for the selected time period.
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Will use typed data instead of destructuring

  // Type-safe access to data
  const typedData = stageData as {
    overview: {
      totalAttempts: number;
      totalSuccesses: number;
      totalFailures: number;
      successRate: number;
      averageDuration: number;
      medianDuration: number;
      minDuration: number;
      maxDuration: number;
      standardDeviation: number;
    };
    recentRuns: Array<{
      timestamp: string;
      success: boolean;
      duration: number;
      sessionId?: string;
      output?: string;
      error?: string;
    }>;
    performanceMetrics: {
      durationsPercentiles: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
      };
      successRateByTimeOfDay: Record<string, { attempts: number; successes: number; rate: number }>;
      failureReasons: Record<string, number>;
    };
  };

  // Create chart data from success rate by time of day
  const hourlyData = Object.entries(typedData.performanceMetrics.successRateByTimeOfDay).map(([hour, data]) => ({
    hour,
    successRate: data.rate,
    attempts: data.attempts,
  }));

  // Create failure reasons pie chart data
  const failureReasonsData = Object.entries(typedData.performanceMetrics.failureReasons).map(([reason, count], index) => ({
    name: reason,
    value: count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stage Performance Analytics</h2>
          <p className="text-gray-600">
            Detailed analysis of {availableStages.find(s => s.id === selectedStage)?.name || selectedStage} performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => refetch()} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Stage</label>
              <Select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-48"
              >
                {availableStages.map((stage) => (
                  <Option key={stage.id} value={stage.id}>
                    {stage.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Time Period</label>
              <Select
                value={days.toString()}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-32"
              >
                <Option value="7">7 days</Option>
                <Option value="14">14 days</Option>
                <Option value="30">30 days</Option>
                <Option value="60">60 days</Option>
                <Option value="90">90 days</Option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-900">{typedData.overview.totalAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{typedData.overview.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">{(typedData.overview.averageDuration / 1000).toFixed(1)}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failures</p>
                <p className="text-2xl font-bold text-gray-900">{typedData.overview.totalFailures}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate by Time of Day */}
      {hourlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Success Rate by Time of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'successRate' ? `${value.toFixed(1)}%` : value,
                      name === 'successRate' ? 'Success Rate' : 'Attempts'
                    ]}
                  />
                  <Bar dataKey="successRate" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Reasons */}
      {failureReasonsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failure Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={failureReasonsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {failureReasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {typedData.recentRuns.slice(0, 10).map((run, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {run.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {run.success ? 'Success' : 'Failed'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(run.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{(run.duration / 1000).toFixed(1)}s</p>
                  {run.sessionId && (
                    <p className="text-xs text-gray-500">{run.sessionId}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}