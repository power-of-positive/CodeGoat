import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Activity, 
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  Timer,
  Zap
} from 'lucide-react';
import { analyticsApi } from '../lib/api';

interface StageHistoryViewProps {
  stageId: string;
  stageName: string;
  onBack: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatTrendValue(value: number, unit: string): string {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${absValue.toFixed(1)}${unit}`;
}

function TrendIndicator({ value, unit, label }: { value: number; unit: string; label: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${colorClass}`} />
      <span className={`text-sm font-medium ${colorClass}`}>
        {formatTrendValue(value, unit)}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

interface StageStatistics {
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
}

interface StageHistory {
  dailyMetrics: Array<{
    date: string;
    attempts: number;
    successes: number;
    failures: number;
    successRate: number;
    averageDuration: number;
    totalDuration: number;
  }>;
  trends: {
    successRateTrend: number;
    durationTrend: number;
    totalAttempts: number;
    totalSuccesses: number;
  };
}

function OverviewStats({ statistics }: { statistics: StageStatistics }) {
  const { overview } = statistics;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Attempts</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{overview.totalAttempts}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {overview.successRate.toFixed(1)}%
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Avg Duration</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {formatDuration(overview.averageDuration)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Median Duration</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {formatDuration(overview.medianDuration)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceMetrics({ statistics }: { statistics: StageStatistics }) {
  const { performanceMetrics } = statistics;
  const { durationsPercentiles, failureReasons } = performanceMetrics;
  
  const failureEntries = Object.entries(failureReasons).sort(([, a], [, b]) => (b as number) - (a as number));
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Duration Percentiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">50th percentile (median)</span>
              <span className="font-medium">{formatDuration(durationsPercentiles.p50)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">90th percentile</span>
              <span className="font-medium">{formatDuration(durationsPercentiles.p90)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">95th percentile</span>
              <span className="font-medium">{formatDuration(durationsPercentiles.p95)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">99th percentile</span>
              <span className="font-medium">{formatDuration(durationsPercentiles.p99)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Failure Reasons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {failureEntries.length > 0 ? (
              failureEntries.slice(0, 5).map(([reason, count]) => (
                <div key={reason} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{reason}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">No failure data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentRuns({ statistics }: { statistics: StageStatistics }) {
  const { recentRuns } = statistics;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Runs (Last 20)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentRuns.slice(0, 20).map((run, index: number) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {run.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {new Date(run.timestamp).toLocaleString()}
                  </div>
                  {run.sessionId && (
                    <div className="text-xs text-gray-500">
                      Session: {run.sessionId.slice(-8)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={run.success ? 'default' : 'destructive'}>
                  {run.success ? 'PASS' : 'FAIL'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {formatDuration(run.duration)}
                </span>
              </div>
            </div>
          ))}
          {recentRuns.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent runs available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTrends({ history }: { history: StageHistory }) {
  const { trends } = history;
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {trends.totalAttempts}
            </div>
            <div className="text-sm text-gray-600">Total Attempts</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {trends.totalSuccesses}
            </div>
            <div className="text-sm text-gray-600">Total Successes</div>
          </div>
          
          <div className="text-center">
            <TrendIndicator 
              value={trends.successRateTrend} 
              unit="%" 
              label="Success Rate Trend" 
            />
          </div>
          
          <div className="text-center">
            <TrendIndicator 
              value={trends.durationTrend} 
              unit="ms" 
              label="Duration Trend" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StageHistoryView({ stageId, stageName, onBack }: StageHistoryViewProps) {
  const [timeRange, setTimeRange] = useState(30);
  
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['stage-history', stageId, timeRange],
    queryFn: () => analyticsApi.getStageHistory(stageId, timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: statisticsData, isLoading: statisticsLoading } = useQuery({
    queryKey: ['stage-statistics', stageId],
    queryFn: () => analyticsApi.getStageStatistics(stageId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const isLoading = historyLoading || statisticsLoading;
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stageName}</h2>
            <p className="text-gray-600">Detailed stage analytics and history</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>
      
      {statisticsData && <OverviewStats statistics={statisticsData.statistics} />}
      
      {historyData && <HistoryTrends history={historyData.history} />}
      
      {statisticsData && <PerformanceMetrics statistics={statisticsData.statistics} />}
      
      {statisticsData && <RecentRuns statistics={statisticsData.statistics} />}
    </div>
  );
}