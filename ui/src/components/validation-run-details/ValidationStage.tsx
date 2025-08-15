import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDuration } from './utils';

interface ValidationStageProps {
  stage: { 
    id: string; 
    name: string; 
    success: boolean; 
    startTime: number; 
    endTime?: number; 
    duration?: number; 
    error?: string; 
  };
}

export function ValidationStage({ stage }: ValidationStageProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-md">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {stage.success ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
          <span className="font-medium text-sm text-gray-900">
            {stage.name}
          </span>
        </div>
        {stage.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-800 mb-1">Error:</div>
                <div className="text-red-700 font-mono text-xs whitespace-pre-wrap">
                  {stage.error}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="text-right text-xs text-gray-500 ml-4">
        {stage.duration && formatDuration(stage.duration)}
      </div>
    </div>
  );
}