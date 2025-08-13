import { useQuery } from '@tanstack/react-query';
import { BarChart3, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../services/api';
import { QUERY_CONFIG } from '../constants/api';
import type { DevelopmentAnalytics, SessionMetrics } from '../types/api';
import { AnalyticsLoader } from './analytics/AnalyticsLoader';
import { AnalyticsError } from './analytics/AnalyticsError';
import { AnalyticsSummaryCards } from './analytics/AnalyticsSummaryCards';
import { ValidationStageChart } from './analytics/ValidationStageChart';
import { RecentSessionsList } from './analytics/RecentSessionsList';
import { MostFailedStageAlert } from './analytics/MostFailedStageAlert';

export function Analytics() {
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery<DevelopmentAnalytics>({
    queryKey: ['analytics'],
    queryFn: api.getAnalytics,
    staleTime: QUERY_CONFIG.defaultStaleTime,
  });

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
  } = useQuery<{ sessions: SessionMetrics[] }>({
    queryKey: ['analytics-sessions'],
    queryFn: () => api.getRecentSessions(20),
    staleTime: QUERY_CONFIG.defaultStaleTime,
  });

  if (analyticsLoading || sessionsLoading) {
    return <AnalyticsLoader />;
  }

  if (analyticsError || !analytics) {
    return <AnalyticsError onRetry={refetchAnalytics} />;
  }

  const sessions = sessionsData?.sessions || [];

  return (
    <div className="p-6">
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
        <Button onClick={() => refetchAnalytics()} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <AnalyticsSummaryCards analytics={analytics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ValidationStageChart analytics={analytics} />
        <RecentSessionsList sessions={sessions} />
      </div>

      <MostFailedStageAlert mostFailedStage={analytics.mostFailedStage} />
    </div>
  );
}