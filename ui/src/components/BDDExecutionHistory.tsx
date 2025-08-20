import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Minus,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { taskApi } from '../lib/api';

interface BDDExecutionHistoryProps {
  taskId: string;
  scenarioId: string;
}

const BDDExecutionHistory: React.FC<BDDExecutionHistoryProps> = ({
  taskId,
  scenarioId,
}) => {
  const [selectedDays, setSelectedDays] = useState(30);

  const {
    data: executions,
    isLoading: executionsLoading,
    refetch: refetchExecutions,
  } = useQuery({
    queryKey: ['scenario-executions', taskId, scenarioId],
    queryFn: () =>
      taskApi.getScenarioExecutions(taskId, scenarioId, { limit: 50 }),
  });

  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['scenario-analytics', taskId, scenarioId, selectedDays],
    queryFn: () =>
      taskApi.getScenarioAnalytics(taskId, scenarioId, selectedDays),
  });

  const handleRefresh = () => {
    refetchExecutions();
    refetchAnalytics();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Passed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'skipped':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Minus className="w-3 h-3 mr-1" />
            Skipped
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (executionsLoading || analyticsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Execution History</h3>
          <Button disabled>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          data-testid="loading-cards"
        >
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh and time period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button onClick={handleRefresh} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.summary.totalExecutions}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.summary.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {analytics.summary.passedExecutions} passed,{' '}
                {analytics.summary.failedExecutions} failed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(analytics.summary.averageDuration)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Skipped
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.summary.skippedExecutions}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execution Trends Chart */}
      {analytics && analytics.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Execution Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) =>
                      new Date(date).toLocaleDateString()
                    }
                    formatter={(value, name) => [
                      value,
                      name === 'passed'
                        ? 'Passed'
                        : name === 'failed'
                          ? 'Failed'
                          : 'Skipped',
                    ]}
                  />
                  <Bar
                    dataKey="passed"
                    stackId="a"
                    fill="#22c55e"
                    name="passed"
                  />
                  <Bar
                    dataKey="failed"
                    stackId="a"
                    fill="#ef4444"
                    name="failed"
                  />
                  <Bar
                    dataKey="skipped"
                    stackId="a"
                    fill="#eab308"
                    name="skipped"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Executions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {executions && executions.length > 0 ? (
            <div className="space-y-3">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(execution.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {formatDate(execution.executedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Duration: {formatDuration(execution.executionDuration)}
                        {execution.environment && ` • ${execution.environment}`}
                        {execution.executedBy &&
                          ` • by ${execution.executedBy}`}
                      </div>
                    </div>
                  </div>

                  {execution.errorMessage && (
                    <div
                      className="max-w-md truncate text-sm text-red-600"
                      title={execution.errorMessage}
                    >
                      {execution.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No execution history found</p>
              <p className="text-sm">
                Executions will appear here once the scenario is run
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Results for Recent Executions */}
      {executions && executions.some((e) => e.stepResults) && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Step Results</CardTitle>
          </CardHeader>
          <CardContent>
            {executions
              .filter((e) => e.stepResults)
              .slice(0, 1)
              .map((execution) => (
                <div key={execution.id} className="space-y-2">
                  <div className="text-sm font-medium text-gray-600 mb-3">
                    Execution from {formatDate(execution.executedAt)}
                  </div>
                  <div className="space-y-2">
                    {execution.stepResults?.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(step.status)}
                          <span className="text-sm font-mono">{step.step}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDuration(step.duration)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BDDExecutionHistory;
