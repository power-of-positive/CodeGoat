import { AlertCircle } from 'lucide-react';
import type { Settings } from '../../types/api';

interface MostFailedStageAlertProps {
  mostFailedStage: string;
  settings?: Settings;
}

export function MostFailedStageAlert({ mostFailedStage, settings }: MostFailedStageAlertProps) {
  if (!mostFailedStage || mostFailedStage === 'none') {
    return null;
  }

  // Get stage name from settings if available
  const stageName = settings?.validation?.stages?.find(s => s.id === mostFailedStage)?.name || mostFailedStage;

  return (
    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Most Failed Stage: {stageName}
          </p>
          <p className="text-sm text-yellow-700">
            Consider reviewing this validation stage for potential improvements.
          </p>
        </div>
      </div>
    </div>
  );
}