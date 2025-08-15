import { 
  Clock, 
  CheckCircle, 
  Activity,
  Target
} from 'lucide-react';
import type { DevelopmentAnalytics } from '../../types/api';

interface AnalyticsSummaryCardsProps {
  analytics: DevelopmentAnalytics;
}

export function AnalyticsSummaryCards({ analytics }: AnalyticsSummaryCardsProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatPercentage = (num: number) => {
    // Backend already sends percentages (not decimals), so no need to multiply by 100
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Total Sessions</p>
            <p className="text-2xl font-bold text-slate-100">{analytics.totalSessions}</p>
          </div>
          <Activity className="h-8 w-8 text-blue-400" />
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Success Rate</p>
            <p className="text-2xl font-bold text-slate-100">{formatPercentage(analytics.successRate)}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Avg Time to Success</p>
            <p className="text-2xl font-bold text-slate-100">{formatDuration(analytics.averageTimeToSuccess)}</p>
          </div>
          <Clock className="h-8 w-8 text-orange-400" />
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Avg Attempts</p>
            <p className="text-2xl font-bold text-slate-100">{analytics.averageAttemptsToSuccess.toFixed(1)}</p>
          </div>
          <Target className="h-8 w-8 text-purple-400" />
        </div>
      </div>
    </div>
  );
}