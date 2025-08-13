import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown, ChevronUp, BarChart3, Server, Clock, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../services/api';
import type { OpenRouterStats } from '../types/api';

interface OpenRouterStatsProps {
  modelSlug: string;
}

export function OpenRouterStats({ modelSlug }: OpenRouterStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['openrouter-stats', modelSlug],
    queryFn: () => api.getOpenRouterStats(modelSlug),
    enabled: isExpanded, // Only fetch when expanded
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  return (
    <div className="border-t border-slate-600 pt-3 mt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-2 font-normal text-slate-300 hover:text-slate-100"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        OpenRouter Statistics
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-3 pl-4 border-l-2 border-slate-100">
          {isLoading && <div className="text-sm text-slate-400">Loading statistics...</div>}

          {error && (
            <div className="text-sm text-red-400">Unable to load statistics for this model</div>
          )}

          {stats && (
            <div className="space-y-3">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Server className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-300">Providers:</span>
                  <span className="font-medium text-slate-100">{stats.providerCount}</span>
                </div>
                {stats.averageUptime !== null && stats.averageUptime !== undefined ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-300">Avg Uptime:</span>
                    <span
                      className={`font-medium ${stats.averageUptime > 95 ? 'text-green-400' : stats.averageUptime > 85 ? 'text-yellow-400' : 'text-red-400'}`}
                    >
                      {stats.averageUptime.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-300">Uptime:</span>
                    <span className="text-slate-400 text-xs">Not available</span>
                  </div>
                )}
              </div>

              {/* Provider Details */}
              {stats.endpoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-100 mb-2">Provider Details</h4>
                  <div className="space-y-2">
                    {stats.endpoints.slice(0, 3).map((endpoint, index) => (
                      <div key={index} className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="font-medium">{endpoint.provider}</span>
                          {endpoint.moderated && <span className="ml-1 text-slate-400">(mod)</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {endpoint.uptime !== null && endpoint.uptime !== undefined ? (
                            <span
                              className={
                                endpoint.uptime > 95
                                  ? 'text-green-400'
                                  : endpoint.uptime > 85
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                              }
                            >
                              {endpoint.uptime}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-300">
                            ${(parseFloat(endpoint.pricing?.prompt || '0') * 1000).toFixed(3)}/1k
                          </span>
                        </div>
                      </div>
                    ))}
                    {stats.endpoints.length > 3 && (
                      <div className="text-xs text-slate-400">
                        +{stats.endpoints.length - 3} more providers
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
