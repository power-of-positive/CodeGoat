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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Filter,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { SimpleSelect as Select, Option } from '../../../shared/ui/select';
import { PageLoading } from '../../../shared/ui/loading';
import { analyticsApi } from '../../../shared/lib/api';

interface PerformanceComparisonProps {
  defaultPeriod1?: { start: string; end: string };
  defaultPeriod2?: { start: string; end: string };
}

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  value: number;
  percentage: number;
  suffix?: string;
  isPositive?: boolean;
}

interface PeriodSelectorProps {
  label: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

interface ComparisonMetric {
  label: string;
  period1Value: number;
  period2Value: number;
  change: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  suffix: string;
  isPositive: boolean;
}

const QUICK_PERIOD_OPTIONS = [
  { label: 'Last 7 vs Previous 7 days', days: 7 },
  { label: 'Last 14 vs Previous 14 days', days: 14 },
  { label: 'Last 30 vs Previous 30 days', days: 30 },
  { label: 'Last 60 vs Previous 60 days', days: 60 },
];

function TrendIndicator({ trend, value, percentage, suffix = '', isPositive = true }: TrendIndicatorProps) {
  const isUp = trend === 'up';
  const isPositiveTrend = isPositive ? isUp : !isUp;
  const TrendIcon = trend === 'stable' ? Minus : isUp ? TrendingUp : TrendingDown;
  const colorClass = trend === 'stable' ? 'text-gray-600' : 
                     isPositiveTrend ? 'text-green-600' : 'text-red-600';
  const bgClass = trend === 'stable' ? 'bg-gray-50' : 
                  isPositiveTrend ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full ${bgClass}`}>
      <TrendIcon className={`w-3 h-3 mr-1 ${colorClass}`} />
      <span className={`text-sm font-medium ${colorClass}`}>
        {Math.abs(value).toFixed(1)}{suffix}
        {trend !== 'stable' && (
          <span className="ml-1">({Math.abs(percentage).toFixed(1)}%)</span>
        )}
      </span>
    </div>
  );
}

function PeriodSelector({ label, startDate, endDate, onStartDateChange, onEndDateChange }: PeriodSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="px-2 py-1 border rounded text-sm flex-1"
        />
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="px-2 py-1 border rounded text-sm flex-1"
        />
      </div>
    </div>
  );
}

export function PerformanceComparison({ 
  defaultPeriod1,
  defaultPeriod2
}: PerformanceComparisonProps) {
  // Calculate default periods if not provided
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [period1Start, setPeriod1Start] = useState(
    defaultPeriod1?.start || thirtyDaysAgo.toISOString().split('T')[0]
  );
  const [period1End, setPeriod1End] = useState(
    defaultPeriod1?.end || now.toISOString().split('T')[0]
  );
  const [period2Start, setPeriod2Start] = useState(
    defaultPeriod2?.start || sixtyDaysAgo.toISOString().split('T')[0]
  );
  const [period2End, setPeriod2End] = useState(
    defaultPeriod2?.end || thirtyDaysAgo.toISOString().split('T')[0]
  );
  const [environment, setEnvironment] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'stages' | 'radar'>('overview');

  const {
    data: comparisonData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['performance-comparison', period1Start, period1End, period2Start, period2End, environment],
    queryFn: () =>
      analyticsApi.getPerformanceComparison({
        period1Start,
        period1End,
        period2Start,
        period2End,
        environment: environment || undefined,
      }),
    enabled: !!(period1Start && period1End && period2Start && period2End),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleQuickPeriodSelect = (days: number) => {
    const end1 = new Date();
    const start1 = new Date(end1.getTime() - days * 24 * 60 * 60 * 1000);
    const end2 = new Date(start1.getTime() - 24 * 60 * 60 * 1000); // 1 day gap
    const start2 = new Date(end2.getTime() - days * 24 * 60 * 60 * 1000);

    setPeriod1Start(start1.toISOString().split('T')[0]);
    setPeriod1End(end1.toISOString().split('T')[0]);
    setPeriod2Start(start2.toISOString().split('T')[0]);
    setPeriod2End(end2.toISOString().split('T')[0]);
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!comparisonData) {return null;}

    const { periods, comparison } = comparisonData;

    // Overall metrics comparison
    const overallMetrics: ComparisonMetric[] = [
      {
        label: 'Success Rate',
        period1Value: periods.period1.successRate,
        period2Value: periods.period2.successRate,
        change: comparison.overall.successRate,
        suffix: '%',
        isPositive: true,
      },
      {
        label: 'Average Duration',
        period1Value: periods.period1.avgDuration,
        period2Value: periods.period2.avgDuration,
        change: comparison.overall.avgDuration,
        suffix: 'ms',
        isPositive: false, // Lower is better for duration
      },
      {
        label: 'Total Runs',
        period1Value: periods.period1.totalRuns,
        period2Value: periods.period2.totalRuns,
        change: comparison.overall.totalRuns,
        suffix: '',
        isPositive: true,
      },
    ];

    // Stage comparison data for charts
    const stageComparisonData = comparison.stages
      .filter(stage => stage.status === 'compared')
      .map(stage => ({
        stageName: stage.stageName,
        period1SuccessRate: periods.period1.stages.find(s => s.stageId === stage.stageId)?.successRate || 0,
        period2SuccessRate: periods.period2.stages.find(s => s.stageId === stage.stageId)?.successRate || 0,
        period1Duration: periods.period1.stages.find(s => s.stageId === stage.stageId)?.avgDuration || 0,
        period2Duration: periods.period2.stages.find(s => s.stageId === stage.stageId)?.avgDuration || 0,
        successRateChange: stage.successRateChange?.percentage || 0,
        durationChange: stage.durationChange?.percentage || 0,
      }));

    // Radar chart data
    const radarData = comparison.stages
      .filter(stage => stage.status === 'compared')
      .slice(0, 8) // Limit to 8 stages for readability
      .map(stage => {
        const p1Stage = periods.period1.stages.find(s => s.stageId === stage.stageId);
        const p2Stage = periods.period2.stages.find(s => s.stageId === stage.stageId);
        
        return {
          stage: stage.stageName.length > 15 ? stage.stageName.slice(0, 15) + '...' : stage.stageName,
          period1: p1Stage?.successRate || 0,
          period2: p2Stage?.successRate || 0,
        };
      });

    return {
      overallMetrics,
      stageComparisonData,
      radarData,
    };
  }, [comparisonData]);

  if (isLoading) {
    return <PageLoading message="Loading performance comparison..." type="skeleton" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load comparison data
          </h3>
          <p className="text-gray-600 mb-4">
            There was an error loading the performance comparison data.
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!comparisonData || !chartData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Comparison Data</h3>
          <p className="text-gray-600">
            Configure date ranges to compare validation performance across periods.
          </p>
        </div>
      </div>
    );
  }

  const { periods, comparison, insights } = comparisonData;
  const { overallMetrics, stageComparisonData, radarData } = chartData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Comparison</h2>
          <p className="text-gray-600">
            Compare validation performance between two time periods
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Comparison Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Comparisons
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_PERIOD_OPTIONS.map(option => (
                  <Button
                    key={option.days}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPeriodSelect(option.days)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Period Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PeriodSelector
                label="Period 1 (Recent)"
                startDate={period1Start}
                endDate={period1End}
                onStartDateChange={setPeriod1Start}
                onEndDateChange={setPeriod1End}
              />
              
              <PeriodSelector
                label="Period 2 (Previous)"
                startDate={period2Start}
                endDate={period2End}
                onStartDateChange={setPeriod2Start}
                onEndDateChange={setPeriod2End}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Environment</label>
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
            </div>

            {/* View Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
              <div className="flex gap-2">
                {[
                  { key: 'overview', label: 'Overview', icon: Activity },
                  { key: 'stages', label: 'Stage Details', icon: Target },
                  { key: 'radar', label: 'Radar Chart', icon: Zap },
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={viewMode === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(key as any)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Period 1 (Recent)
            </CardTitle>
            <p className="text-sm text-gray-600">{periods.period1.label}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{periods.period1.totalRuns}</div>
                  <div className="text-sm text-gray-600">Total Runs</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{periods.period1.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">{periods.period1.avgDuration.toFixed(1)}ms</div>
                <div className="text-sm text-gray-600">Average Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Period 2 (Previous)
            </CardTitle>
            <p className="text-sm text-gray-600">{periods.period2.label}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">{periods.period2.totalRuns}</div>
                  <div className="text-sm text-gray-600">Total Runs</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{periods.period2.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">{periods.period2.avgDuration.toFixed(1)}ms</div>
                <div className="text-sm text-gray-600">Average Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Comparison Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Changes</CardTitle>
          <p className="text-sm text-gray-600">
            Key metrics comparison between the two periods
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {overallMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{metric.label}</h4>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.period1Value.toFixed(1)}{metric.suffix}
                  </div>
                  <div className="flex items-center justify-center">
                    <TrendIndicator
                      trend={metric.change.trend}
                      value={metric.change.value}
                      percentage={metric.change.percentage}
                      suffix={metric.suffix}
                      isPositive={metric.isPositive}
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    vs {metric.period2Value.toFixed(1)}{metric.suffix}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{insights.improved}</div>
            <div className="text-sm text-gray-600">Improved Stages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{insights.degraded}</div>
            <div className="text-sm text-gray-600">Degraded Stages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Minus className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{insights.stable}</div>
            <div className="text-sm text-gray-600">Stable Stages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{insights.newStages}</div>
            <div className="text-sm text-gray-600">New Stages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{insights.removedStages}</div>
            <div className="text-sm text-gray-600">Removed Stages</div>
          </CardContent>
        </Card>
      </div>

      {/* View-specific Charts */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Success Rate Comparison</CardTitle>
              <p className="text-sm text-gray-600">Success rate comparison across periods</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageComparisonData.slice(0, 10)}>
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
                  />
                  <Bar dataKey="period1SuccessRate" fill="#3b82f6" name="Period 1" />
                  <Bar dataKey="period2SuccessRate" fill="#8b5cf6" name="Period 2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duration Comparison</CardTitle>
              <p className="text-sm text-gray-600">Average duration comparison across periods</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageComparisonData.slice(0, 10)}>
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
                  />
                  <Bar dataKey="period1Duration" fill="#10b981" name="Period 1" />
                  <Bar dataKey="period2Duration" fill="#f59e0b" name="Period 2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'stages' && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Stage Comparison</CardTitle>
            <p className="text-sm text-gray-600">
              Comprehensive comparison of all stages between periods
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
                      Period 1 Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period 2 Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comparison.stages.map((stage) => {
                    const p1Stage = periods.period1.stages.find(s => s.stageId === stage.stageId);
                    const p2Stage = periods.period2.stages.find(s => s.stageId === stage.stageId);

                    return (
                      <tr key={stage.stageId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {stage.stageName}
                          </div>
                          <div className="text-sm text-gray-500">{stage.stageId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {p1Stage ? `${p1Stage.successRate.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {p2Stage ? `${p2Stage.successRate.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stage.status === 'compared' && stage.successRateChange ? (
                            <TrendIndicator
                              trend={stage.successRateChange.trend}
                              value={stage.successRateChange.value}
                              percentage={stage.successRateChange.percentage}
                              suffix="%"
                              isPositive={true}
                            />
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stage.status === 'compared' && stage.durationChange ? (
                            <TrendIndicator
                              trend={stage.durationChange.trend}
                              value={stage.durationChange.value}
                              percentage={stage.durationChange.percentage}
                              suffix="ms"
                              isPositive={false}
                            />
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            stage.status === 'compared' ? 'bg-blue-100 text-blue-800' :
                            stage.status === 'new_in_period2' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {stage.status === 'compared' ? 'Compared' :
                             stage.status === 'new_in_period2' ? 'New' : 'Removed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'radar' && radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Radar Comparison</CardTitle>
            <p className="text-sm text-gray-600">
              Multi-dimensional view of success rates across stages
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar
                  name="Period 1 (Recent)"
                  dataKey="period1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="Period 2 (Previous)"
                  dataKey="period2"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: '#374151',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}