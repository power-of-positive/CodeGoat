/* eslint-disable max-lines */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  // TrendingUp, // Currently unused
  // TrendingDown, // Currently unused
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Filter,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { SimpleSelect as Select, Option } from '../../../shared/ui/select';
import { PageLoading } from '../../../shared/ui/loading';
import { analyticsApi } from '../../../shared/lib/api';

// Constants
const RELIABILITY_THRESHOLD_EXCELLENT = 0.95; // 95%
const RELIABILITY_THRESHOLD_GOOD = 0.85; // 85%
const RELIABILITY_THRESHOLD_FAIR = 0.70; // 70%
const RELIABILITY_OPACITY_LIGHT = 0.15; // For background colors
const DEFAULT_DAYS_PERIOD = 30;
const HEX_MAX_VALUE = 255;
const HEX_BASE = 16;
const STALE_TIME_MINUTES = 5;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MINUTES_TO_MILLISECONDS = MINUTES_PER_HOUR * MILLISECONDS_PER_SECOND;
const HOURS_PER_DAY = 24;
const CHART_BORDER_RADIUS = 4;

interface StageStatisticsProps {
  defaultDays?: number;
  stageId?: string;
}

interface ReliabilityBadgeProps {
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const RELIABILITY_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444',
} as const;

const RELIABILITY_LABELS = {
  excellent: `Excellent (≥${(RELIABILITY_THRESHOLD_EXCELLENT * 100)}%)`,
  good: `Good (≥${(RELIABILITY_THRESHOLD_GOOD * 100)}%)`,
  fair: `Fair (≥${(RELIABILITY_THRESHOLD_FAIR * 100)}%)`,
  poor: `Poor (<${(RELIABILITY_THRESHOLD_FAIR * 100)}%)`,
} as const;

function ReliabilityBadge({ reliability }: ReliabilityBadgeProps) {
  const color = RELIABILITY_COLORS[reliability];
  const label = RELIABILITY_LABELS[reliability];

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}${Math.round(RELIABILITY_OPACITY_LIGHT * HEX_MAX_VALUE).toString(HEX_BASE).padStart(2, '0')}`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}

function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-500" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="px-2 py-1 border rounded text-sm"
      />
      <span className="text-gray-500">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="px-2 py-1 border rounded text-sm"
      />
    </div>
  );
}

export function StageStatistics({ defaultDays = DEFAULT_DAYS_PERIOD, stageId }: StageStatisticsProps) {
  const [days, setDays] = useState(defaultDays);
  const [environment, setEnvironment] = useState('');
  const [selectedStage, setSelectedStage] = useState(stageId || '');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartType, setChartType] = useState<'performance' | 'trends' | 'distribution' | 'duration' | 'comparison'>('performance');

  // Calculate date range
  const dateParams = useMemo(() => {
    if (useCustomDateRange && startDate && endDate) {
      return { startDate, endDate };
    }
    return { days };
  }, [useCustomDateRange, startDate, endDate, days]);

  const {
    data: stageData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stage-analytics', dateParams, environment, selectedStage],
    queryFn: () =>
      analyticsApi.getStageAnalytics({
        ...dateParams,
        environment: environment || undefined,
        stageId: selectedStage || undefined,
      }),
    staleTime: STALE_TIME_MINUTES * MINUTES_TO_MILLISECONDS,
  });

  const availableStages = useMemo(() => {
    if (!stageData?.stageStatistics) {
      return [];
    }
    return stageData.stageStatistics.map(stage => ({
      id: stage.stageId,
      name: stage.stageName,
    }));
  }, [stageData]);

  const handleExportData = () => {
    if (!stageData) {
      return;
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      period: stageData.overview.period,
      stageStatistics: stageData.stageStatistics,
      trends: stageData.trends,
      insights: stageData.insights,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stage-analytics-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <PageLoading message="Loading stage statistics..." type="skeleton" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load stage statistics
          </h3>
          <p className="text-gray-600 mb-4">
            There was an error loading the stage performance data.
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!stageData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Statistics Available</h3>
            <p className="text-gray-600 mb-4">
              No stage performance data found for the selected time period. Try adjusting your date range or check if validation runs exist.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2 mx-auto">
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, stageStatistics, trends, insights } = stageData;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stage Performance Analytics</h2>
          <p className="text-gray-600">
            Detailed analysis of validation stage performance and trends
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => refetch()} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Period Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Period
              </label>
              <div className="space-y-2">
                <Select
                  value={useCustomDateRange ? 'custom' : days.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setUseCustomDateRange(true);
                      const today = new Date();
                      const thirtyDaysAgo = new Date(today.getTime() - DEFAULT_DAYS_PERIOD * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
                      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    } else {
                      setUseCustomDateRange(false);
                      setDays(parseInt(value));
                    }
                  }}
                  className="w-full"
                >
                  <Option value="7">Last 7 days</Option>
                  <Option value="14">Last 14 days</Option>
                  <Option value="30">Last 30 days</Option>
                  <Option value="60">Last 60 days</Option>
                  <Option value="90">Last 90 days</Option>
                  <Option value="custom">Custom range</Option>
                </Select>
                
                {useCustomDateRange && (
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                  />
                )}
              </div>
            </div>

            {/* Environment Filter */}
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

            {/* Stage Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Stage
              </label>
              <Select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full"
              >
                <Option value="">All Stages</Option>
                {availableStages.map(stage => (
                  <Option key={stage.id} value={stage.id}>
                    {stage.name}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Chart Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                View Type
              </label>
              <Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'performance' | 'trends' | 'distribution' | 'duration' | 'comparison')}
                className="w-full"
              >
                <Option value="performance">Performance Overview</Option>
                <Option value="trends">Trend Analysis</Option>
                <Option value="distribution">Duration Distribution</Option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stages</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalStages}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.totalStageExecutions.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Problematic Stages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.problematicStages.length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.topPerformingStages.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      {chartType === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Success Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Success Rate by Stage</CardTitle>
              <p className="text-sm text-gray-600">
                Percentage of successful executions per stage
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={stageStatistics}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="stageName"
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    formatter={(value: number, _name) => [
                      `${value.toFixed(1)}%`,
                      'Success Rate',
                    ]}
                    labelFormatter={(label) => `Stage: ${label}`}
                  />
                  <Bar
                    dataKey="successRate"
                    fill="#3b82f6"
                    radius={[CHART_BORDER_RADIUS, CHART_BORDER_RADIUS, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Duration Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Average Duration by Stage</CardTitle>
              <p className="text-sm text-gray-600">
                Average execution time per stage in milliseconds
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={stageStatistics}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="stageName"
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    formatter={(value: number) => [
                      `${value.toFixed(1)}ms`,
                      'Avg Duration',
                    ]}
                    labelFormatter={(label) => `Stage: ${label}`}
                  />
                  <Bar
                    dataKey="avgDuration"
                    fill="#3b82f6"
                    radius={[CHART_BORDER_RADIUS, CHART_BORDER_RADIUS, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {chartType === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Trends Over Time</CardTitle>
            <p className="text-sm text-gray-600">
              Daily success rate trends for each stage
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart
                data={trends}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
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
                {/* Group trends by stage for line chart */}
                {Array.from(new Set(trends.map(t => t.stageId))).map((stageId, index) => {
                  const stageColor = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5];
                  return (
                    <Line
                      key={stageId}
                      type="monotone"
                      dataKey="successRate"
                      data={trends.filter(t => t.stageId === stageId)}
                      stroke={stageColor}
                      strokeWidth={2}
                      dot={{ fill: stageColor, strokeWidth: 2, r: 4 }}
                      name={trends.find(t => t.stageId === stageId)?.stageName || stageId}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'distribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duration Distribution Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle>Duration vs Success Rate</CardTitle>
              <p className="text-sm text-gray-600">
                Correlation between stage duration and success rate
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart
                  data={stageStatistics}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="avgDuration"
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <YAxis
                    dataKey="successRate"
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
                    formatter={(value, name) => {
                      if (name === 'avgDuration') {
                        return [`${value}ms`, 'Avg Duration'];
                      }
                      if (name === 'successRate') {
                        return [`${value}%`, 'Success Rate'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `Stage: ${payload[0].payload.stageName}`;
                      }
                      return label;
                    }}
                  />
                  <Scatter
                    data={stageStatistics}
                    fill="#3b82f6"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reliability Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Reliability Distribution</CardTitle>
              <p className="text-sm text-gray-600">
                Distribution of stages by reliability category
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const reliabilityData = Object.entries(RELIABILITY_LABELS).map(([key, label]) => ({
                  name: label,
                  value: stageStatistics.filter(s => s.reliability === key).length,
                  color: RELIABILITY_COLORS[key as keyof typeof RELIABILITY_COLORS],
                }));

                return (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={reliabilityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reliabilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          color: '#374151',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stage Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Stage Statistics</CardTitle>
          <p className="text-sm text-gray-600">
            Comprehensive performance metrics for each validation stage
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Runs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reliability
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stageStatistics.map((stage) => (
                  <tr key={stage.stageId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {stage.stageName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {stage.stageId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{stage.totalRuns.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {stage.successfulRuns} success, {stage.failedRuns} failed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div
                          className={`mr-2 w-2 h-2 rounded-full`}
                          style={{
                            backgroundColor: RELIABILITY_COLORS[stage.reliability],
                          }}
                        />
                        {stage.successRate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-gray-400" />
                        {stage.avgDuration.toFixed(1)}ms
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stage.minDuration}ms - {stage.maxDuration}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ReliabilityBadge reliability={stage.reliability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights Section */}
      {insights.problematicStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Problematic Stages
            </CardTitle>
            <p className="text-sm text-gray-600">
              Stages with the lowest success rates requiring attention
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.problematicStages.map((stage: { stageId: string; stageName: string; successRate: number; totalRuns: number; failedRuns?: number }) => (
                <div
                  key={stage.stageId}
                  className="p-4 border rounded-lg bg-red-50 border-red-200"
                >
                  <h4 className="font-medium text-gray-900 mb-2">
                    {stage.stageName}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="text-red-600 font-medium">
                        {stage.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Runs:</span>
                      <span>{stage.totalRuns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failures:</span>
                      <span className="text-red-600">{stage.failedRuns || (stage.totalRuns - Math.round(stage.successRate * stage.totalRuns / 100))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.topPerformingStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Top Performing Stages
            </CardTitle>
            <p className="text-sm text-gray-600">
              Stages with the highest success rates and reliability
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.topPerformingStages.map((stage: { stageId: string; stageName: string; successRate: number; totalRuns: number; avgDuration?: number }) => (
                <div
                  key={stage.stageId}
                  className="p-4 border rounded-lg bg-green-50 border-green-200"
                >
                  <h4 className="font-medium text-gray-900 mb-2">
                    {stage.stageName}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="text-green-600 font-medium">
                        {stage.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Runs:</span>
                      <span>{stage.totalRuns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Duration:</span>
                      <span>{(stage.avgDuration || 0).toFixed(1)}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}