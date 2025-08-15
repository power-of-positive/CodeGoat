import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DevelopmentAnalytics, Settings } from '../../types/api';

interface StageSuccessLineChartProps {
  analytics: DevelopmentAnalytics;
  settings?: Settings;
}

export function StageSuccessLineChart({ analytics, settings }: StageSuccessLineChartProps) {
  const stageData = Object.entries(analytics.stageSuccessRates);
  
  if (stageData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Stage Success Trends
        </h3>
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No validation data available</p>
          <p className="text-sm text-gray-400">
            Success trends will appear after running validation stages
          </p>
        </div>
      </div>
    );
  }

  // Sort stages by settings order if available, otherwise by success rate
  const sortedStages = stageData.sort(([aId], [bId]) => {
    if (settings?.validation?.stages) {
      const stageOrder = settings.validation.stages.reduce((acc, stage) => {
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
  });
  
  // const maxRate = 100; // Reserved for future chart scaling
  // const minRate = 0; // Reserved for future chart scaling
  const chartWidth = 300;
  const chartHeight = 200;
  const padding = 40;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Stage Success Trends
      </h3>
      
      <div className="space-y-6">
        {/* Line Chart */}
        <div className="relative">
          <svg width={chartWidth + padding * 2} height={chartHeight + padding * 2} className="mx-auto">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = chartHeight + padding - (tick / 100) * chartHeight;
              return (
                <g key={tick}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth + padding}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    fontSize="12"
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}
            
            {/* Stage lines and points */}
            {sortedStages.map(([stageId, stats], index) => {
              const x = padding + (index / Math.max(sortedStages.length - 1, 1)) * chartWidth;
              const y = chartHeight + padding - (stats.rate / 100) * chartHeight;
              const color = stats.rate >= 80 ? '#10b981' : stats.rate >= 60 ? '#f59e0b' : '#ef4444';
              // Get stage name from settings if available
              const stageName = settings?.validation?.stages?.find(s => s.id === stageId)?.name || stageId;
              
              return (
                <g key={stageId}>
                  {/* Connecting line (if not first point) */}
                  {index > 0 && (
                    <line
                      x1={padding + ((index - 1) / Math.max(sortedStages.length - 1, 1)) * chartWidth}
                      y1={chartHeight + padding - (sortedStages[index - 1][1].rate / 100) * chartHeight}
                      x2={x}
                      y2={y}
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Data point */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  
                  {/* Stage label */}
                  <text
                    x={x}
                    y={chartHeight + padding + 20}
                    fontSize="12"
                    fill="#374151"
                    textAnchor="middle"
                    className="font-medium"
                  >
                    {stageName}
                  </text>
                  
                  {/* Success rate label */}
                  <text
                    x={x}
                    y={y - 10}
                    fontSize="11"
                    fill={color}
                    textAnchor="middle"
                    className="font-semibold"
                  >
                    {stats.rate.toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">≥80% Success</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">60-79% Success</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">&lt;60% Success</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {sortedStages[0]?.[1].rate > sortedStages[sortedStages.length - 1]?.[1].rate ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className="text-sm font-medium text-gray-700">Best Stage</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {sortedStages[0] ? (settings?.validation?.stages?.find(s => s.id === sortedStages[0][0])?.name || sortedStages[0][0]) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {sortedStages[0]?.[1].rate.toFixed(1)}% success
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-sm font-medium text-gray-700">Needs Work</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {sortedStages[sortedStages.length - 1] ? (settings?.validation?.stages?.find(s => s.id === sortedStages[sortedStages.length - 1][0])?.name || sortedStages[sortedStages.length - 1][0]) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {sortedStages[sortedStages.length - 1]?.[1].rate.toFixed(1)}% success
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}