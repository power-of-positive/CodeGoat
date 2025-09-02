/* eslint-disable max-lines */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
} from 'recharts';
import {
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Filter,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { SimpleSelect as Select, Option } from '../../../shared/ui/select';
import { PageLoading } from '../../../shared/ui/loading';
import { analyticsApi } from '../../../shared/lib/api';
import { HistoricalTimelineData } from '../../../shared/types/index';

interface HistoricalTimelineProps {
  defaultDays?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Commented out unused interface
// interface TimelineEvent {
//   timestamp: string;
//   totalRuns: number;
//   successfulRuns: number;
//   failedRuns: number;
//   successRate: number;
//   averageDuration: number;
//   stages: Record<string, {
//     success: number;
//     total: number;
//     avgDuration: number;
//     successRate: number;
//   }>;
//   runs: Array<{
//     id: string;
//     timestamp: string;
//     success: boolean;
//     totalTime: number;
//     environment?: string;
//     gitBranch?: string;
//   }>;
// }

interface StageVisibilityControl {
  [stageId: string]: boolean;
}

const GRANULARITY_OPTIONS = {
  hour: { label: 'Hourly', value: 'hour' },
  day: { label: 'Daily', value: 'day' },
  week: { label: 'Weekly', value: 'week' },
} as const;

// Time and refresh constants
const DEFAULT_REFRESH_INTERVAL_MS = 60000; // 60 seconds = 1 minute
const QUERY_STALE_TIME_MINUTES = 2;
const WEEK_OFFSET_DAYS = 6;
const CHART_HEIGHT = 80;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const SUCCESS_RATE_THRESHOLD_PERCENT = 80;

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function HistoricalTimeline({ 
  defaultDays = 30,
  autoRefresh = false,
  refreshInterval = DEFAULT_REFRESH_INTERVAL_MS
}: HistoricalTimelineProps) {
  const [days, setDays] = useState(defaultDays);
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week'>('day');
  const [environment, setEnvironment] = useState('');
  const [includeStages] = useState(true); // Remove setIncludeStages as it's not used
  const [chartType, setChartType] = useState<'success-rate' | 'duration' | 'volume' | 'combined'>('combined');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [stageVisibility, setStageVisibility] = useState<StageVisibilityControl>({});
  const [showSettings, setShowSettings] = useState(false);

  const {
    data: timelineData,
    isLoading,
    error,
    refetch,
  } = useQuery<HistoricalTimelineData>({
    queryKey: ['historical-timeline', days, granularity, environment, includeStages],
    queryFn: () =>
      analyticsApi.getHistoricalTimeline({
        days,
        granularity,
        stages: includeStages ? undefined : [],
      }),
    staleTime: QUERY_STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Extract all unique stages for visibility controls
  const availableStages = useMemo(() => {
    if (!timelineData?.timeline || !includeStages) {
      return [];
    }
    
    const stageSet = new Set<string>();
    timelineData.timeline.forEach(period => {
      Object.keys(period.stages || {}).forEach(stageId => {
        stageSet.add(stageId);
      });
    });
    
    return Array.from(stageSet).sort();
  }, [timelineData, includeStages]);

  // Initialize stage visibility
  React.useEffect(() => {
    if (availableStages.length > 0) {
      const initialVisibility = availableStages.reduce((acc, stageId) => {
        acc[stageId] = true; // Show all stages by default
        return acc;
      }, {} as StageVisibilityControl);
      setStageVisibility(prev => ({ ...initialVisibility, ...prev }));
    }
  }, [availableStages]);

  // Animation controls
  React.useEffect(() => {
    if (!isPlaying || !timelineData?.timeline) {
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentTimeIndex(prev => {
        const next = prev + 1;
        if (next >= timelineData.timeline.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000); // 1 second per timeline point

    return () => clearInterval(interval);
  }, [isPlaying, timelineData]);

  const handleToggleStageVisibility = (stageId: string) => {
    setStageVisibility(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (granularity) {
      case 'hour':
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          hour12: true,
        });
      case 'day':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      case 'week': {
        const endOfWeek = new Date(date);
        endOfWeek.setDate(date.getDate() + WEEK_OFFSET_DAYS);
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      default:
        return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading historical timeline..." type="skeleton" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load timeline data
          </h3>
          <p className="text-gray-600 mb-4">
            There was an error loading the historical timeline data.
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!timelineData?.timeline || timelineData.timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timeline Data</h3>
          <p className="text-gray-600">
            No validation run data found for the selected time period.
          </p>
        </div>
      </div>
    );
  }

  const { timeline, summary } = timelineData || { timeline: [], summary: { totalRuns: 0, successRate: 0, averageDuration: 0, totalPeriods: 0 } };

  // Prepare chart data with formatted timestamps
  const chartData = timeline.map((period, index) => ({
    ...period,
    displayTime: formatTimestamp(period.timestamp),
    index,
    // Flatten stage performance for easier charting
    ...Object.entries(period.stages || {}).reduce((acc, [stageId, perf]) => {
      acc[`${stageId}_successRate`] = perf.successRate;
      acc[`${stageId}_avgDuration`] = perf.avgDuration;
      return acc;
    }, {} as Record<string, number>)
  }));

  // Filter data for animation if playing
  const displayData = isPlaying ? chartData.slice(0, currentTimeIndex + 1) : chartData;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historical Timeline</h2>
          <p className="text-gray-600">
            Interactive timeline of validation run performance over time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Animation Controls */}
          <div className="flex items-center gap-1 border rounded p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTimeIndex(0)}
              disabled={currentTimeIndex === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTimeIndex(chartData.length - 1)}
              disabled={currentTimeIndex === chartData.length - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          
          <Button onClick={() => refetch()} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Timeline Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Time Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Period
                </label>
                <Select
                  value={days.toString()}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full"
                >
                  <Option value="7">Last 7 days</Option>
                  <Option value="14">Last 14 days</Option>
                  <Option value="30">Last 30 days</Option>
                  <Option value="60">Last 60 days</Option>
                  <Option value="90">Last 90 days</Option>
                </Select>
              </div>

              {/* Granularity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Granularity
                </label>
                <Select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as keyof typeof GRANULARITY_OPTIONS)}
                  className="w-full"
                >
                  {Object.entries(GRANULARITY_OPTIONS).map(([key, option]) => (
                    <Option key={key} value={key}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Environment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment
                </label>
                <Select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full"
                >
                  <Option value="">All Environments</Option>
                  <Option value="development">Development</Option>
                  <Option value="ci">CI/CD</Option>
                  <Option value="production">Production</Option>
                </Select>
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Type
                </label>
                <Select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'success-rate' | 'duration' | 'volume' | 'combined')}
                  className="w-full"
                >
                  <Option value="combined">Combined View</Option>
                  <Option value="success-rate">Success Rate</Option>
                  <Option value="duration">Duration Trends</Option>
                  <Option value="volume">Run Volume</Option>
                </Select>
              </div>
            </div>

            {/* Stage Visibility Controls */}
            {includeStages && availableStages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Stage Visibility</h4>
                <div className="flex flex-wrap gap-2">
                  {availableStages.map((stageId, index) => (
                    <Button
                      key={stageId}
                      variant={stageVisibility[stageId] ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleStageVisibility(stageId)}
                      className="flex items-center gap-2"
                      style={{
                        backgroundColor: stageVisibility[stageId] ? CHART_COLORS[index % CHART_COLORS.length] : undefined
                      }}
                    >
                      {stageVisibility[stageId] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {stageId}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline Progress */}
      {isPlaying && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentTimeIndex + 1) / chartData.length) * 100}%`
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {currentTimeIndex + 1} / {chartData.length}
              </div>
            </div>
            {currentTimeIndex < chartData.length && (
              <div className="mt-2 text-sm font-medium text-gray-900">
                Current: {formatTimestamp(chartData[currentTimeIndex].timestamp)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Periods</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalPeriods}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Granularity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {GRANULARITY_OPTIONS[granularity]?.label || 'Unknown'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Runs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timeline.reduce((sum, period) => sum + period.totalRuns, 0).toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(timeline.reduce((sum, period) => sum + period.successRate, 0) / timeline.length).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Timeline Chart */}
      {chartType === 'combined' && (
        <Card>
          <CardHeader>
            <CardTitle>Combined Timeline View</CardTitle>
            <p className="text-sm text-gray-600">
              Success rate and run volume over time with stage performance overlay
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <ComposedChart
                data={displayData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayTime"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={CHART_HEIGHT}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: '#374151',
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                
                {/* Success Rate Area */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="Success Rate (%)"
                />

                {/* Run Volume Bars */}
                <Bar
                  yAxisId="right"
                  dataKey="totalRuns"
                  fill="#3b82f6"
                  opacity={0.6}
                  name="Total Runs"
                />

                {/* Stage Performance Lines */}
                {includeStages && availableStages
                  .filter(stageId => stageVisibility[stageId])
                  .map((stageId, index) => (
                    <Line
                      key={stageId}
                      yAxisId="left"
                      type="monotone"
                      dataKey={`${stageId}_successRate`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name={`${stageId} Success Rate (%)`}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'success-rate' && (
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Timeline</CardTitle>
            <p className="text-sm text-gray-600">
              Overall and per-stage success rates over time
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={displayData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayTime"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={CHART_HEIGHT}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: '#374151',
                  }}
                />

                {/* Overall Success Rate */}
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Overall Success Rate"
                />

                {/* Stage Success Rates */}
                {includeStages && availableStages
                  .filter(stageId => stageVisibility[stageId])
                  .map((stageId, index) => (
                    <Line
                      key={stageId}
                      type="monotone"
                      dataKey={`${stageId}_successRate`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      name={`${stageId} Success Rate`}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'duration' && (
        <Card>
          <CardHeader>
            <CardTitle>Duration Trends</CardTitle>
            <p className="text-sm text-gray-600">
              Average execution duration trends over time
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={displayData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayTime"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={CHART_HEIGHT}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: '#374151',
                  }}
                />

                {/* Overall Duration */}
                <Line
                  type="monotone"
                  dataKey="averageDuration"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Overall Avg Duration (ms)"
                />

                {/* Stage Durations */}
                {includeStages && availableStages
                  .filter(stageId => stageVisibility[stageId])
                  .map((stageId, index) => (
                    <Line
                      key={stageId}
                      type="monotone"
                      dataKey={`${stageId}_avgDuration`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      name={`${stageId} Avg Duration (ms)`}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'volume' && (
        <Card>
          <CardHeader>
            <CardTitle>Run Volume Timeline</CardTitle>
            <p className="text-sm text-gray-600">
              Number of validation runs executed over time
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={displayData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayTime"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={CHART_HEIGHT}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: '#374151',
                  }}
                />

                <Bar dataKey="totalRuns" fill="#3b82f6" name="Total Runs" />
                <Bar dataKey="successfulRuns" fill="#10b981" name="Successful Runs" />
                <Bar dataKey="failedRuns" fill="#ef4444" name="Failed Runs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Current Period Detail (when playing animation) */}
      {isPlaying && currentTimeIndex < chartData.length && (
        <Card>
          <CardHeader>
            <CardTitle>Current Period Details</CardTitle>
            <p className="text-sm text-gray-600">
              Detailed breakdown for {formatTimestamp(chartData[currentTimeIndex].timestamp)}
            </p>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentPeriod = chartData[currentTimeIndex];
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Overall Metrics */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Overall Performance</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Runs:</span>
                        <span className="font-medium">{currentPeriod.totalRuns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Rate:</span>
                        <span className={`font-medium ${currentPeriod.successRate >= SUCCESS_RATE_THRESHOLD_PERCENT ? 'text-green-600' : 'text-red-600'}`}>
                          {currentPeriod.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Duration:</span>
                        <span className="font-medium">{currentPeriod.averageDuration.toFixed(1)}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Performance */}
                  {includeStages && Object.keys(currentPeriod.stages || {}).length > 0 && (
                    <div className="md:col-span-2 space-y-2">
                      <h4 className="font-medium text-gray-900">Stage Performance</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.entries(currentPeriod.stages || {}).map(([stageId, perf]) => (
                          <div key={stageId} className="p-3 border rounded">
                            <h5 className="font-medium text-sm text-gray-900 mb-1">{stageId}</h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Success Rate:</span>
                                <span className={`font-medium ${perf.successRate >= SUCCESS_RATE_THRESHOLD_PERCENT ? 'text-green-600' : 'text-red-600'}`}>
                                  {perf.successRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total:</span>
                                <span>{perf.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Avg Duration:</span>
                                <span>{perf.avgDuration.toFixed(1)}ms</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}