import { AlertCircle } from 'lucide-react';

interface MostFailedStageAlertProps {
  mostFailedStage: string;
}

export function MostFailedStageAlert({ mostFailedStage }: MostFailedStageAlertProps) {
  if (!mostFailedStage || mostFailedStage === 'none') {
    return null;
  }

  return (
    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Most Failed Stage: {mostFailedStage}
          </p>
          <p className="text-sm text-yellow-700">
            Consider reviewing this validation stage for potential improvements.
          </p>
        </div>
      </div>
    </div>
  );
}