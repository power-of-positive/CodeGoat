import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { SimpleSelect as Select, Option } from './ui/select';
import { analyticsApi } from '../lib/api';
import { ValidationChart } from './ValidationChart';
import { TimeSeriesCharts } from './TimeSeriesCharts';
import { AnalyticsHeader, MetricsSummary } from './AnalyticsComponents';
import { RecentRuns } from './RecentRuns';

function useAnalyticsData(agentFilter?: string) {
  const metricsQuery = useQuery({
    queryKey: ['validation-metrics', agentFilter],
    queryFn: () => analyticsApi.getValidationMetrics(agentFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const runsQuery = useQuery({
    queryKey: ['validation-runs', agentFilter],
    queryFn: () => analyticsApi.getValidationRuns(agentFilter),
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


export function Analytics() {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const { metrics, runs, isLoading, error, refetch } = useAnalyticsData(selectedAgent || undefined);

  // Extract unique agent IDs from runs for filter options
  // For now, we'll use common agent IDs until the backend provides them
  const agentIds = React.useMemo(() => {
    return ['claude_code', 'claude_3_5_sonnet', 'gpt_4', 'local_agent'];
  }, []);

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
      
      {/* Agent Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Agent:
          </label>
          <Select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-48"
          >
            <Option value="">All Agents</Option>
            {agentIds.map((agentId) => (
              <Option key={agentId} value={agentId}>
                {agentId}
              </Option>
            ))}
          </Select>
        </div>
      </div>
      
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