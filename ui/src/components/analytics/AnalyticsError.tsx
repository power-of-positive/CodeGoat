import { BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface AnalyticsErrorProps {
  onRetry: () => void;
}

export function AnalyticsError({ onRetry }: AnalyticsErrorProps) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Development Analytics</h2>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">Failed to load analytics data</span>
        </div>
        <Button
          onClick={onRetry}
          className="mt-3"
          variant="outline"
          size="sm"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}