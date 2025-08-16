import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Activity, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { analyticsApi } from '../lib/api';
import { ValidationRun, ValidationMetrics } from '../../shared/types';
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Validation Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
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
  const totalRuns = metrics.totalRuns || 0;
  const successRate = metrics.successRate || 0;
  const averageDuration = metrics.averageDuration || 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalRuns}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {(successRate * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(averageDuration / 1000).toFixed(1)}s
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentRuns({ runs }: { runs: ValidationRun[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const runsPerPage = 5;
  
  const totalPages = Math.ceil(runs.length / runsPerPage);
  const startIndex = currentPage * runsPerPage;
  const currentRuns = runs.slice(startIndex, startIndex + runsPerPage);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-gray-900 dark:text-gray-100">Recent Validation Runs</CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No validation runs found</p>
        ) : (
          <div className="space-y-2">
            {currentRuns.map((run) => {
              const successfulStages = run.stages.filter(stage => stage.success).length;
              const failedStages = run.stages.length - successfulStages;
              
              return (
                <div key={run.id}>
                  <div
                    className={`p-3 rounded border-l-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      run.success 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    }`}
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {run.success ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {run.stages.length} stages
                          </span>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {successfulStages} passed • {failedStages} failed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(run.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {(run.duration ? run.duration / 1000 : 0).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {expandedRun === run.id && (
                    <div className="mt-2 ml-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Stage Details</h4>
                      <div className="space-y-2">
                        {run.stages.map((stage, index) => (
                          <div key={`${stage.id}-${index}`} className="flex justify-between items-center py-1">
                            <div className="flex items-center gap-2">
                              {stage.success ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              ) : (
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                              )}
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {stage.name || stage.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={stage.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {stage.success ? 'PASS' : 'FAIL'}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {(stage.duration / 1000).toFixed(1)}s
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Failed to load analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
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