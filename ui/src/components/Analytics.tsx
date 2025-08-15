import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../services/api';
import { QUERY_CONFIG } from '../constants/api';
import type { DevelopmentAnalytics, SessionMetrics, Settings } from '../types/api';
import { AnalyticsLoader } from './analytics/AnalyticsLoader';
import { AnalyticsError } from './analytics/AnalyticsError';
import { AnalyticsSummaryCards } from './analytics/AnalyticsSummaryCards';
import { ValidationStageChart } from './analytics/ValidationStageChart';
import { StageSuccessLineChart } from './analytics/StageSuccessLineChart';
import { RecentSessionsList } from './analytics/RecentSessionsList';
import { MostFailedStageAlert } from './analytics/MostFailedStageAlert';

interface AnalyticsData {
  analytics: DevelopmentAnalytics | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  settings: Settings | undefined;
  sessions: SessionMetrics[];
}

function useAnalyticsData(): AnalyticsData {
  const analyticsQuery = useQuery<DevelopmentAnalytics>({
    queryKey: ['analytics'],
    queryFn: api.getAnalytics,
    staleTime: QUERY_CONFIG.defaultStaleTime,
  });

  const settingsQuery = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: api.getSettings,
    staleTime: QUERY_CONFIG.defaultStaleTime,
  });

  const sessionsQuery = useQuery<SessionMetrics[]>({
    queryKey: ['analytics-sessions'],
    queryFn: () => api.getRecentSessions(20),
    staleTime: QUERY_CONFIG.defaultStaleTime,
  });

  return {
    analytics: analyticsQuery.data,
    isLoading: analyticsQuery.isLoading || settingsQuery.isLoading || sessionsQuery.isLoading,
    error: analyticsQuery.error,
    refetch: analyticsQuery.refetch,
    settings: settingsQuery.data,
    sessions: sessionsQuery.data || []
  };
}

function AnalyticsHeader({ refetch }: { refetch: () => void }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Development Analytics</h2>
          <p className="text-gray-600">
            Track validation success rates and development workflow insights
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

export function Analytics(): React.JSX.Element {
  const { analytics, isLoading, error, refetch, settings, sessions } = useAnalyticsData();

  if (isLoading) {
    return <AnalyticsLoader />;
  }

  if (error || !analytics) {
    return <AnalyticsError onRetry={refetch} />;
  }

  return (
    <div className="p-6">
      <AnalyticsHeader refetch={refetch} />
      <AnalyticsSummaryCards analytics={analytics} />
      <MostFailedStageAlert mostFailedStage={analytics.mostFailedStage} settings={settings} />
      <div className="grid grid-cols-1 gap-6 mb-6">
        <RecentSessionsList sessions={sessions} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ValidationStageChart analytics={analytics} settings={settings} />
        <StageSuccessLineChart analytics={analytics} settings={settings} />
      </div>
    </div>
  );
}