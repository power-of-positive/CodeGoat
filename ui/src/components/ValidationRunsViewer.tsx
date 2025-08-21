import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { claudeWorkersApi } from '../lib/api';

interface ValidationRunsViewerProps {
  workerId: string;
  onClose: () => void;
}

export function ValidationRunsViewer({ workerId, onClose }: ValidationRunsViewerProps) {
  const { data: validationData, isLoading } = useQuery({
    queryKey: ['worker-validation-runs', workerId],
    queryFn: () => claudeWorkersApi.getValidationRuns(workerId),
    refetchInterval: 5000,
  });

  const statusStyles = {
    passed: 'bg-green-100 text-green-800 border-green-300',
    failed: 'bg-red-100 text-red-800 border-red-300',
    running: 'bg-blue-100 text-blue-800 border-blue-300',
    pending: 'bg-gray-100 text-gray-800 border-gray-300',
    skipped: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-purple-600" />
            Validation Runs - {workerId.split('-').pop()}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-600">Loading validation runs...</div>
          </div>
        ) : (
          <div>
            {validationData && validationData.validationRuns.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  Total validation runs:{' '}
                  <span className="font-semibold text-purple-600">{validationData.totalRuns}</span>
                </div>
                {validationData.validationRuns.map(run => (
                  <div key={run.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${statusStyles[run.overallStatus]}`}>
                          {run.overallStatus.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(run.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-gray-400">
                        {run.id.split('-').slice(-2).join('-')}
                      </div>
                    </div>

                    {run.stages.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">Stages:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {run.stages.map((stage, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  stage.status === 'passed'
                                    ? 'bg-green-500'
                                    : stage.status === 'failed'
                                      ? 'bg-red-500'
                                      : stage.status === 'running'
                                        ? 'bg-blue-500 animate-pulse'
                                        : stage.status === 'skipped'
                                          ? 'bg-yellow-500'
                                          : 'bg-gray-400'
                                }`}
                              />
                              <span className="font-mono">{stage.name}</span>
                              {stage.duration && (
                                <span className="text-gray-400">
                                  ({(stage.duration / 1000).toFixed(1)}s)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {run.metricsFile && (
                      <div className="text-xs text-gray-500">
                        <a
                          href={`/api/claude-workers/${workerId}/validation-runs/${run.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View detailed metrics →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileCheck className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600">No validation runs yet</div>
                <div className="text-xs text-gray-400 mt-2">
                  Validation runs will appear here when a worker completes
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}