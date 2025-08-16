import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Activity, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { analyticsApi } from '../lib/api';
import { ValidationRun, ValidationMetrics } from '../../shared/types';
import { ValidationChart } from './ValidationChart';
import { TimeSeriesCharts } from './TimeSeriesCharts';

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
  const totalRuns = metrics.totalRuns || 0;
  const successRate = metrics.successRate || 0;
  const averageDuration = metrics.averageDuration || 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Total Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{totalRuns}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {(successRate * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Avg Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
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
  const [runsPerPage, setRunsPerPage] = useState(5);
  
  const totalPages = Math.ceil(runs.length / runsPerPage);
  const startIndex = currentPage * runsPerPage;
  const currentRuns = runs.slice(startIndex, startIndex + runsPerPage);
  
  // Reset to first page when runs per page changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [runsPerPage]);
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show ellipsis pagination for large numbers
      const start = Math.max(0, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      
      if (start > 0) {
        pages.push(0);
        if (start > 1) pages.push(-1); // Ellipsis marker
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        if (end < totalPages - 2) pages.push(-1); // Ellipsis marker
        pages.push(totalPages - 1);
      }
    }
    
    return pages;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-gray-900">Recent Validation Runs</CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select
                value={runsPerPage}
                onChange={(e) => setRunsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={runs.length}>All ({runs.length})</option>
              </select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* First and Previous buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0}
                  className="px-2"
                >
                  ⟨⟨
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-2">
                  {getPageNumbers().map((pageNum, index) => (
                    pageNum === -1 ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                    ) : (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[2rem] px-2"
                      >
                        {pageNum + 1}
                      </Button>
                    )
                  ))}
                </div>
                
                {/* Next and Last buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages - 1)}
                  disabled={currentPage === totalPages - 1}
                  className="px-2"
                >
                  ⟩⟩
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {startIndex + 1}-{Math.min(startIndex + runsPerPage, runs.length)} of {runs.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-gray-500">No validation runs found</p>
        ) : (
          <div className="space-y-2">
            {currentRuns.map((run) => {
              const successfulStages = run.stages.filter(stage => stage.success).length;
              const failedStages = run.stages.length - successfulStages;
              
              return (
                <div key={run.id}>
                  <div
                    className={`p-3 rounded border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      run.success 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
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
                          <span className="font-medium text-gray-900">
                            {run.stages.length} stages
                          </span>
                          <div className="text-xs text-gray-600">
                            {successfulStages} passed • {failedStages} failed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {new Date(run.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {(run.duration ? run.duration / 1000 : 0).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {expandedRun === run.id && (
                    <div className="mt-2 ml-4 p-3 bg-gray-50 rounded border">
                      <h4 className="font-medium text-gray-900 mb-2">Stage Details</h4>
                      <div className="space-y-2">
                        {run.stages.map((stage, index) => (
                          <div key={`${stage.id}-${index}`} className="flex justify-between items-center py-1">
                            <div className="flex items-center gap-2">
                              {stage.success ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              ) : (
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                              )}
                              <span className="text-sm text-gray-900">
                                {stage.name || stage.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={stage.success ? 'text-green-600' : 'text-red-600'}>
                                {stage.success ? 'PASS' : 'FAIL'}
                              </span>
                              <span className="text-gray-500">
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
      
      {/* Time Series Charts */}
      <div className="mb-6">
        <TimeSeriesCharts runs={runs} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRuns runs={runs} />
        {metrics && <ValidationChart metrics={metrics} />}
      </div>
    </div>
  );
}