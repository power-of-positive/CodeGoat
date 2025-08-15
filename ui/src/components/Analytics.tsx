import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Activity, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { analyticsApi } from '../lib/api';
import { ValidationRun, ValidationMetrics } from 'shared/types';
import { ValidationChart } from './ValidationChart';

function useAnalyticsData() {
  const metricsQuery = useQuery({
    queryKey: ['validation-metrics'],
    queryFn: analyticsApi.getValidationMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const runsQuery = useQuery({
    queryKey: ['validation-runs'],
    queryFn: analyticsApi.getValidationRuns,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    metrics: metricsQuery.data,
    runs: runsQuery.data || [],
    isLoading: metricsQuery.isLoading || runsQuery.isLoading,
    error: metricsQuery.error || runsQuery.error,
    refetch: () => {
      metricsQuery.refetch();
      runsQuery.refetch();
    },
  };
}

function AnalyticsHeader({ refetch }: { refetch: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Validation Analytics</h2>
          <p className="text-gray-600">
            Track validation pipeline performance and success rates
          </p>
        </div>
      </div>
      <Button onClick={() => refetch()} variant="outline" size="sm">
        <Activity className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}

function MetricsSummary({ metrics }: { metrics: ValidationMetrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalRuns}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {(metrics.successRate * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(metrics.averageDuration / 1000).toFixed(1)}s
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentRuns({ runs }: { runs: ValidationRun[] }) {
  const recentRuns = runs.slice(0, 10);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Validation Runs</CardTitle>
      </CardHeader>
      <CardContent>
        {recentRuns.length === 0 ? (
          <p className="text-gray-500">No validation runs found</p>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className={`p-3 rounded border-l-4 ${
                  run.success 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {run.success ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {run.stages.length} stages
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(run.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Duration: {(run.duration / 1000).toFixed(1)}s
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StageMetrics({ metrics }: { metrics: ValidationMetrics }) {
  const stageEntries = Object.entries(metrics.stageMetrics);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {stageEntries.length === 0 ? (
          <p className="text-gray-500">No stage metrics available</p>
        ) : (
          <div className="space-y-3">
            {stageEntries.map(([stageName, stageMetrics]) => (
              <div key={stageName} className="p-3 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{stageName}</span>
                  <span className={`text-sm font-medium ${
                    stageMetrics.successRate > 0.8 ? 'text-green-600' : 
                    stageMetrics.successRate > 0.5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(stageMetrics.successRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Avg: {(stageMetrics.averageDuration / 1000).toFixed(1)}s • 
                  Runs: {stageMetrics.totalRuns}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Analytics() {
  const { metrics, runs, isLoading, error, refetch } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load analytics
            </h3>
            <p className="text-gray-600 mb-4">
              There was an error loading the validation analytics data.
            </p>
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AnalyticsHeader refetch={refetch} />
      
      {metrics && <MetricsSummary metrics={metrics} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRuns runs={runs} />
        {metrics && <ValidationChart metrics={metrics} />}
      </div>
    </div>
  );
}