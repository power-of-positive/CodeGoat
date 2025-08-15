import { Activity } from 'lucide-react';
import type { DevelopmentAnalytics, Settings } from '../../types/api';

interface ValidationStageChartProps {
  analytics: DevelopmentAnalytics;
  settings?: Settings;
}

export function ValidationStageChart({ analytics, settings }: ValidationStageChartProps) {
  const formatPercentage = (num: number) => {
    // Backend already sends percentages (not decimals), so no need to multiply by 100
    return `${num.toFixed(1)}%`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Validation Stage Success Rates
      </h3>
      {Object.keys(analytics.stageSuccessRates).length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No validation stages data available</p>
          <p className="text-sm text-gray-400">
            Start running validation stages to see analytics
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(analytics.stageSuccessRates)
            .sort(([aId], [bId]) => {
              // Sort by settings order if available, otherwise maintain existing order
              if (settings?.validation?.stages) {
                const stageOrder = settings.validation.stages.reduce((acc, stage, _index) => {
                  acc[stage.id] = stage.order;
                  return acc;
                }, {} as Record<string, number>);
                
                const aOrder = stageOrder[aId] ?? Number.MAX_VALUE;
                const bOrder = stageOrder[bId] ?? Number.MAX_VALUE;
                return aOrder - bOrder;
              }
              // Fallback to sorting by success rate if no settings
              const aRate = analytics.stageSuccessRates[aId]?.rate ?? 0;
              const bRate = analytics.stageSuccessRates[bId]?.rate ?? 0;
              return bRate - aRate;
            })
            .map(([stageId, stats]) => {
              // Get stage name from settings if available
              const stageName = settings?.validation?.stages?.find(s => s.id === stageId)?.name || stageId;
              return (
              <div key={stageId} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {stageName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatPercentage(stats.rate)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stats.rate >= 80
                          ? 'bg-green-500'
                          : stats.rate >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.rate, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{stats.successes} successful</span>
                    <span>{stats.attempts} total attempts</span>
                    {analytics.averageStageTime[stageId] && (
                      <span>avg: {formatDuration(analytics.averageStageTime[stageId])}</span>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
        </div>
      )}
    </div>
  );
}