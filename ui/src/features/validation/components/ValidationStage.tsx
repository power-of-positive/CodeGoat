import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { ValidationStageResult } from '../../../shared/types/index';

interface ValidationStageProps {
  stage: ValidationStageResult;
  onRetry?: () => void;
}

export function ValidationStage({ stage, onRetry }: ValidationStageProps) {
  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(stage.success)}</span>
            <span>{stage.name}</span>
          </div>
          <span className={`text-sm font-medium ${getStatusColor(stage.success)}`}>
            {(stage.duration / 1000).toFixed(1)}s
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stage.output && (
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Output:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {stage.output}
            </pre>
          </div>
        )}
        {stage.error && (
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2 text-red-600">Error:</h4>
            <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-32 text-red-700">
              {stage.error}
            </pre>
          </div>
        )}
        {onRetry && !stage.success && (
          <Button size="sm" onClick={onRetry}>
            Retry Stage
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
