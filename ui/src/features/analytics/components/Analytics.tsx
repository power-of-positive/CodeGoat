import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, TrendingUp, Clock, BarChart3, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/button';
import { SimpleSelect as Select, Option } from '../../../shared/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { PageLoading } from '../../../shared/ui/loading';
import { analyticsApi } from '../../../shared/lib/api';
import { ValidationChart } from './ValidationChart';
import { TimeSeriesCharts } from './TimeSeriesCharts';
import { AnalyticsHeader, MetricsSummary } from './AnalyticsComponents';
import { RecentRuns } from '../../validation/components/RecentRuns';
import type { ValidationMetrics } from '../../../shared/types/index';
import type { AnalyticsData } from '../../../shared/lib/analytics-api';

// Constants
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const CACHE_STALE_TIME_MINUTES = 5;
const CACHE_STALE_TIME_MS = CACHE_STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;

// Transform AnalyticsData to ValidationMetrics format
function transformAnalyticsData(data?: AnalyticsData): ValidationMetrics | undefined {
  if (!data) {
    return undefined;
  }

  const successfulRuns = Math.floor((data.successRate / 100) * data.totalRuns);
  const failedRuns = data.totalRuns - successfulRuns;

  // Transform stages data to stageMetrics format
  const stageMetrics = (data.stages || []).reduce(
    (acc, stage, index) => {
      // Handle missing stageName field gracefully
      const stageName = stage.stageName || `Stage ${index + 1}` || 'Unknown Stage';
      const stageKey = stageName.toLowerCase().replace(/\s+/g, '-');
      const successfulStageRuns = Math.floor((stage.successRate / 100) * stage.totalRuns);

      acc[stageKey] = {
        id: stageKey,
        name: stageName,
        enabled: true,
        attempts: stage.totalRuns,
        successes: successfulStageRuns,
        successRate: stage.successRate / 100,
        averageDuration: stage.averageDuration,
        totalRuns: stage.totalRuns,
      };
      return acc;
    },
    {} as ValidationMetrics['stageMetrics']
  );

  return {
    totalRuns: data.totalRuns,
    successfulRuns,
    failedRuns,
    successRate: data.successRate / 100,
    averageDuration: data.averageDuration,
    stageMetrics,
  };
}

function useAnalyticsData(agentFilter?: string) {
  const metricsQuery = useQuery({
    queryKey: ['validation-metrics', agentFilter],
    queryFn: () => analyticsApi.getValidationMetrics(),
    staleTime: CACHE_STALE_TIME_MS,
  });

  const runsQuery = useQuery({
    queryKey: ['validation-runs', agentFilter],
    queryFn: () => analyticsApi.getValidationRuns(),
    staleTime: CACHE_STALE_TIME_MS,
  });

  return {
    metrics: metricsQuery.data ? transformAnalyticsData(metricsQuery.data) : null,
    runs: runsQuery.data || [],
    isLoading: metricsQuery.isLoading || runsQuery.isLoading,
    error: metricsQuery.error || runsQuery.error,
    refetch: () => {
      metricsQuery.refetch();
      runsQuery.refetch();
    },
  };
}

export function Analytics() {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const { metrics, runs, isLoading, error, refetch } = useAnalyticsData(selectedAgent || undefined);

  // Extract unique agent IDs from runs for filter options
  const agentIds = React.useMemo(() => {
    return ['claude_cli', 'gemini_cli', 'cursor_cli'];
  }, []);

  if (isLoading) {
    return <PageLoading message="Loading validation analytics..." type="skeleton" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load analytics</h3>
            <p className="text-gray-600 mb-4">
              There was an error loading the validation analytics data.
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AnalyticsHeader refetch={refetch} />

      {/* Agent Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Agent:</label>
          <Select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="w-48"
            data-testid="agent-filter"
          >
            <Option value="">All Agents</Option>
            {agentIds.map(agentId => (
              <Option key={agentId} value={agentId}>
                {agentId}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      {metrics && (
        <div data-testid={selectedAgent ? 'filtered-metrics' : 'metrics-summary'}>
          <MetricsSummary metrics={metrics} />
        </div>
      )}

      {/* Time Series Charts */}
      <div
        className="mb-6"
        data-testid={selectedAgent ? 'agent-specific-charts' : 'time-series-charts'}
      >
        <TimeSeriesCharts runs={runs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div data-testid="recent-runs">
          <RecentRuns runs={runs} />
        </div>
        {metrics && (
          <div data-testid="validation-chart">
            <ValidationChart metrics={metrics} />
          </div>
        )}
      </div>

      {/* Advanced Analytics Promotion */}
      <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="w-5 h-5" />
            Advanced Stage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-800 mb-4">
            Get deeper insights into your validation pipeline performance with advanced stage
            analytics, historical trends, and comparative analysis across different time periods.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/stage-history?view=statistics" className="block">
              <div className="p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                    Stage Statistics
                  </h4>
                  <ExternalLink className="w-3 h-3 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-600">
                  Detailed performance metrics, reliability analysis, and success rate trends for
                  each stage.
                </p>
              </div>
            </Link>

            <Link to="/stage-history?view=timeline" className="block">
              <div className="p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                    Historical Timeline
                  </h4>
                  <ExternalLink className="w-3 h-3 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-600">
                  Interactive timeline view with animation, trends visualization, and real-time
                  monitoring.
                </p>
              </div>
            </Link>

            <Link to="/stage-history?view=comparison" className="block">
              <div className="p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                    Performance Comparison
                  </h4>
                  <ExternalLink className="w-3 h-3 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-600">
                  Compare performance between different time periods with detailed change analysis.
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-4 flex justify-end">
            <Link to="/stage-history">
              <Button className="flex items-center gap-2">
                Explore All Features
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
