import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom'; // Commented out - not currently used
import {
  BarChart3,
  Clock,
  TrendingUp,
  Filter,
  Settings,
  Download,
  RefreshCw,
  Maximize2,
  X,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { SimpleSelect as Select, Option } from '../../../shared/ui/select';
import { StageStatistics } from './StageStatistics';
import { HistoricalTimeline } from './HistoricalTimeline';
import { PerformanceComparison } from './PerformanceComparison';

// Constants
const DEFAULT_DATE_RANGE_DAYS = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DEFAULT_REFRESH_INTERVAL_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND; // 1 minute
const QUICK_SELECT_PRESET_LIMIT = 4;

interface StageHistoryDashboardProps {
  initialView?: 'statistics' | 'timeline' | 'comparison';
  stageId?: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface FilterState {
  dateRange: DateRange;
  environment: string;
  stageId: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

const VIEW_CONFIG = {
  statistics: {
    title: 'Stage Statistics',
    description: 'Detailed performance metrics and reliability analysis',
    icon: BarChart3,
    component: 'StageStatistics',
  },
  timeline: {
    title: 'Historical Timeline',
    description: 'Interactive timeline view with animation and trends',
    icon: Clock,
    component: 'HistoricalTimeline',
  },
  comparison: {
    title: 'Performance Comparison',
    description: 'Compare performance between different time periods',
    icon: TrendingUp,
    component: 'PerformanceComparison',
  },
} as const;

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
];

const REFRESH_INTERVALS = [
  { label: 'Never', value: 0 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
  { label: '15 minutes', value: 900000 },
];

export function StageHistoryDashboard({
  initialView = 'statistics',
  stageId: initialStageId = '',
}: StageHistoryDashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate(); // Commented out - not currently used

  // Parse initial state from URL parameters
  const viewFromURL = searchParams.get('view');
  const currentView = (
    viewFromURL && viewFromURL in VIEW_CONFIG ? viewFromURL : initialView
  ) as keyof typeof VIEW_CONFIG;
  const urlDateRange = searchParams.get('dateRange');
  const urlEnvironment = searchParams.get('environment') || '';
  const urlStageId = searchParams.get('stageId') || initialStageId;

  // Calculate default date range
  const getDefaultDateRange = (): DateRange => {
    const end = new Date();
    const start = new Date(end.getTime() - DEFAULT_DATE_RANGE_DAYS * MILLISECONDS_PER_DAY);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const [filters, setFilters] = useState<FilterState>(() => {
    const defaultRange = getDefaultDateRange();
    let dateRange = defaultRange;

    if (urlDateRange) {
      try {
        dateRange = JSON.parse(urlDateRange);
      } catch {
        // Use default if parsing fails
      }
    }

    return {
      dateRange,
      environment: urlEnvironment,
      stageId: urlStageId,
      autoRefresh: false,
      refreshInterval: DEFAULT_REFRESH_INTERVAL_MS,
    };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [expandedView, setExpandedView] = useState(false);

  // Update URL when filters change
  const updateURL = (newFilters: Partial<FilterState>, newView?: keyof typeof VIEW_CONFIG) => {
    const params = new URLSearchParams(searchParams);

    if (newView) {
      params.set('view', newView);
    }

    if (newFilters.dateRange) {
      params.set('dateRange', JSON.stringify(newFilters.dateRange));
    }

    if (newFilters.environment !== undefined) {
      if (newFilters.environment) {
        params.set('environment', newFilters.environment);
      } else {
        params.delete('environment');
      }
    }

    if (newFilters.stageId !== undefined) {
      if (newFilters.stageId) {
        params.set('stageId', newFilters.stageId);
      } else {
        params.delete('stageId');
      }
    }

    setSearchParams(params);
  };

  const handleViewChange = (view: keyof typeof VIEW_CONFIG) => {
    updateURL({}, view);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    updateURL(newFilters);
  };

  const handlePresetRangeSelect = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * MILLISECONDS_PER_DAY);
    const newRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };

    handleFilterChange({ dateRange: newRange });
  };

  const handleExportData = async () => {
    // This would export current view data
    const exportData = {
      view: currentView,
      filters: filters,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stage-history-${currentView}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentViewConfig = VIEW_CONFIG[currentView];

  // Component mapping to avoid circular reference issues
  const componentMap = {
    StageStatistics,
    HistoricalTimeline,
    PerformanceComparison,
  };

  const CurrentViewComponent = currentViewConfig
    ? componentMap[currentViewConfig.component as keyof typeof componentMap]
    : null;

  const componentProps = useMemo(() => {
    // Calculate days for components that need it
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY);

    // Base props that all components might need for testing
    const baseProps = {
      stageId: filters.stageId || undefined,
      dateRange: filters.dateRange,
      environment: filters.environment || 'all', // Default to 'all' for tests
    };

    switch (currentView) {
      case 'statistics':
        return {
          ...baseProps,
          defaultDays: days,
        };
      case 'timeline':
        return {
          ...baseProps,
          defaultDays: days,
          stageId: filters.stageId, // Override for timeline specifically
          autoRefresh: filters.autoRefresh,
          refreshInterval: filters.refreshInterval,
        };
      case 'comparison':
        return {
          ...baseProps,
          defaultPeriod1: filters.dateRange,
          defaultPeriod2: {
            start: new Date(startDate.getTime() - days * MILLISECONDS_PER_DAY)
              .toISOString()
              .split('T')[0],
            end: filters.dateRange.start,
          },
        };
    }

    return baseProps;
  }, [currentView, filters]);

  return (
    <div
      className={`space-y-6 ${expandedView ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : 'p-6'}`}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {currentViewConfig &&
              React.createElement(currentViewConfig.icon, { className: 'w-8 h-8 text-blue-600' })}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Stage History & Performance Analytics
              </h1>
              <p className="text-gray-600 mt-1">{currentViewConfig?.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expandedView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedView(false)}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Exit Fullscreen
            </Button>
          )}

          {!expandedView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedView(true)}
              className="flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Fullscreen
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 ${showSettings ? 'bg-gray-100' : ''}`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* View Navigation */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(VIEW_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={key}
              variant={currentView === key ? 'default' : 'outline'}
              onClick={() => handleViewChange(key as keyof typeof VIEW_CONFIG)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {config.title}
            </Button>
          );
        })}
      </div>

      {/* Global Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Global Filters & Settings
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date Range</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={e =>
                        handleFilterChange({
                          dateRange: { ...filters.dateRange, start: e.target.value },
                        })
                      }
                      className="px-2 py-1 border rounded text-sm flex-1"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={e =>
                        handleFilterChange({
                          dateRange: { ...filters.dateRange, end: e.target.value },
                        })
                      }
                      className="px-2 py-1 border rounded text-sm flex-1"
                    />
                  </div>

                  {/* Preset Ranges */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quick Select:</label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_RANGES.slice(0, QUICK_SELECT_PRESET_LIMIT).map(preset => (
                        <Button
                          key={preset.days}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePresetRangeSelect(preset.days)}
                          className="text-xs py-1 px-2 h-6"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Environment</label>
                <Select
                  value={filters.environment}
                  onChange={e => handleFilterChange({ environment: e.target.value })}
                  className="w-full"
                  data-testid="environment-select"
                >
                  <Option value="">All Environments</Option>
                  <Option value="development">Development</Option>
                  <Option value="ci">CI/CD</Option>
                  <Option value="production">Production</Option>
                </Select>
              </div>

              {/* Stage Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Specific Stage</label>
                <Select
                  value={filters.stageId}
                  onChange={e => handleFilterChange({ stageId: e.target.value })}
                  className="w-full"
                  data-testid="stage-select"
                >
                  <Option value="">All Stages</Option>
                  {/* These would be populated dynamically */}
                  <Option value="lint">Lint</Option>
                  <Option value="typecheck">Type Check</Option>
                  <Option value="unit-tests-backend">Unit Tests (Backend)</Option>
                  <Option value="unit-tests-frontend">Unit Tests (Frontend)</Option>
                  <Option value="integration-tests">Integration Tests</Option>
                  <Option value="e2e-tests">E2E Tests</Option>
                </Select>
              </div>

              {/* Auto Refresh Settings */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Auto Refresh</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoRefresh"
                      checked={filters.autoRefresh}
                      onChange={e => handleFilterChange({ autoRefresh: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                      Enable auto refresh
                    </label>
                  </div>

                  {filters.autoRefresh && (
                    <Select
                      value={filters.refreshInterval.toString()}
                      onChange={e =>
                        handleFilterChange({
                          refreshInterval: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    >
                      {REFRESH_INTERVALS.slice(1).map(interval => (
                        <Option key={interval.value} value={interval.value.toString()}>
                          {interval.label}
                        </Option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Tips for Stage Analytics:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Use date range filtering to focus on specific periods of interest</li>
                    <li>Filter by environment to compare dev vs production performance</li>
                    <li>Enable auto-refresh for real-time monitoring during critical periods</li>
                    <li>Export data for external analysis or reporting</li>
                    <li>Use fullscreen mode for detailed analysis and presentations</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div>
        {CurrentViewComponent ? (
          <CurrentViewComponent {...componentProps} />
        ) : (
          <div className="p-8 text-center">
            <p className="text-red-500">
              Component not found: {currentViewConfig?.component || 'unknown'}
            </p>
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      {!expandedView && (
        <Card className="bg-gray-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  Period: {new Date(filters.dateRange.start).toLocaleDateString()} -{' '}
                  {new Date(filters.dateRange.end).toLocaleDateString()}
                </span>
                {filters.environment && <span>Environment: {filters.environment}</span>}
                {filters.stageId && <span>Stage: {filters.stageId}</span>}
              </div>
              <div className="flex items-center gap-2">
                {filters.autoRefresh && (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Auto-refreshing</span>
                  </div>
                )}
                <span className="text-xs">Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
