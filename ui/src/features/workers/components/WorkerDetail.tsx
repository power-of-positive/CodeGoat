import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Play,
  Square,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  GitMerge,
  Code2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import { Label } from '../../../shared/ui/label';
import { claudeWorkersApi } from '../../../shared/lib/api';
import { TaskLogs } from '../../tasks/components/TaskLogs';

interface ValidationStageResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
  attempt?: number;
}

interface ValidationRun {
  id: string;
  timestamp: string;
  success: boolean;
  duration?: number;
  stages: ValidationStageResult[];
}

interface WorkerStatus {
  id: string;
  taskId: string;
  taskContent: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'validating';
  startTime: string;
  endTime?: string;
  pid?: number;
  logFile: string;
  blockedCommands: number;
  hasPermissionSystem: boolean;
  validationPassed?: boolean;
  validationRuns?: number;
  validationHistory?: ValidationRun[];
  lastValidationRun?: ValidationRun;
}

// interface WorkerInteractionResponse {
//   workerId: string;
//   message: string;
//   response?: string;
//   success: boolean;
// }

// Status badge styling
const statusStyles = {
  starting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  running: 'bg-blue-100 text-blue-800 border-blue-300',
  validating: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  stopped: 'bg-gray-100 text-gray-800 border-gray-300',
} as const;

const statusIcons = {
  starting: AlertCircle,
  running: Play,
  validating: RefreshCw,
  completed: CheckCircle,
  failed: XCircle,
  stopped: Square,
} as const;

export function WorkerDetail() {
  const { workerId } = useParams<{ workerId: string }>();
  const queryClient = useQueryClient();

  // Fetch worker status
  const { data: worker, isLoading: isLoadingWorker } = useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      const response = await claudeWorkersApi.getWorkerStatus(workerId!);
      return response as WorkerStatus;
    },
    enabled: !!workerId,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Start worker
  const startWorkerMutation = useMutation({
    mutationFn: async () => {
      if (!worker) {
        throw new Error('Worker data not available');
      }
      const response = await claudeWorkersApi.startWorker({
        taskId: worker.taskId,
        taskContent: worker.taskContent,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
    },
  });

  // Stop worker
  const stopWorkerMutation = useMutation({
    mutationFn: async () => {
      await claudeWorkersApi.stopWorker(workerId!);
    },
    onSuccess: () => {
      // Invalidate and refetch immediately
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
      queryClient.refetchQueries({ queryKey: ['worker', workerId] });
      alert('Worker stopped. Running validation checks...');
    },
    onError: (error: Error) => {
      console.error('Failed to stop worker:', error);
      alert(`Failed to stop worker: ${error.message}`);
    },
  });

  // Open VS Code
  const openVSCodeMutation = useMutation({
    mutationFn: async () => {
      await claudeWorkersApi.openVSCode(workerId!);
    },
    onSuccess: () => {
      alert('✅ Opened worktree in VS Code!');
    },
    onError: (error: Error) => {
      console.error('Failed to open VS Code:', error);
      alert(`❌ Failed to open VS Code: ${error.message}\n\nMake sure VS Code CLI tools are installed.`);
    },
  });

  // Re-trigger worker when validation fails
  const retryWorkerMutation = useMutation({
    mutationFn: async () => {
      if (!worker) {
        throw new Error('Worker data not available');
      }
      // Start the worker again with the same task and worktree
      const response = await claudeWorkersApi.startWorker({
        taskId: worker.taskId,
        taskContent: worker.taskContent,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker-logs', workerId] });
    },
  });

  // Merge worker changes with commit message
  const mergeChangesMutation = useMutation({
    mutationFn: async (commitMessage?: string) => {
      const response = await claudeWorkersApi.mergeWorkerChanges(workerId!, { commitMessage });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker-logs', workerId] });
      alert('✅ Changes merged successfully to main branch!');
    },
    onError: (error: Error) => {
      console.error('Failed to merge changes:', error);
      alert(`❌ Failed to merge changes: ${error.message}`);
    },
  });

  // Check if worker should be auto-retriggered after validation failure
  useEffect(() => {
    if (
      worker &&
      (worker.status === 'failed' || worker.status === 'completed') &&
      worker.validationPassed === false &&
      worker.validationRuns > 0
    ) {
      // Auto-retry logic could go here, but for now we'll show manual trigger
      // Worker validation failed, manual retry is available
    }
  }, [worker]);

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (isLoadingWorker) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Loading worker details...</span>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Worker Not Found</h1>
          <p className="text-gray-600">The worker with ID {workerId} could not be found.</p>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[worker.status];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div className="flex items-center space-x-3">
            <StatusIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Worker {worker.id.split('-').pop()}
              </h1>
              <p className="text-sm text-gray-500">{worker.taskId}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
              queryClient.invalidateQueries({
                queryKey: ['worker-logs', workerId],
              });
            }}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Badge className={`text-sm ${statusStyles[worker.status]}`}>
            {worker.status.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-sm">
            PID: {worker.pid || 'N/A'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Worker Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Worker Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Task Content:</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border mt-1">
                  {worker.taskContent}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <Label className="font-medium text-gray-700">Started:</Label>
                  <p className="text-gray-600">{new Date(worker.startTime).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">Duration:</Label>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <p className="text-gray-600">
                      {formatDuration(worker.startTime, worker.endTime)}
                    </p>
                  </div>
                </div>
                {worker.endTime && (
                  <div>
                    <Label className="font-medium text-gray-700">End Time:</Label>
                    <p className="text-gray-600">{new Date(worker.endTime).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <Label className="font-medium text-gray-700">Log File:</Label>
                  <p className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded">
                    {worker.logFile}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium text-gray-700">Permission System:</Label>
                  <div className="flex items-center space-x-1 mt-1">
                    {worker.hasPermissionSystem ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">Inactive</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">Blocked Commands:</Label>
                  <p
                    className={`mt-1 ${worker.blockedCommands > 0 ? 'text-red-600' : 'text-gray-600'}`}
                  >
                    {worker.blockedCommands}
                  </p>
                </div>
              </div>

              {/* Validation Status */}
              {worker.validationRuns && worker.validationRuns > 0 && (
                <div className="space-y-3">
                  <Label className="font-medium text-gray-700">Validation Status:</Label>

                  {/* Overall Status */}
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-50 border-purple-300 text-purple-700"
                    >
                      🔍 {worker.validationRuns} run
                      {worker.validationRuns > 1 ? 's' : ''}
                    </Badge>
                    {worker.validationPassed === true && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-50 border-green-300 text-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Passed
                      </Badge>
                    )}
                    {worker.validationPassed === false && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-red-50 border-red-300 text-red-700"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>

                  {/* Last Validation Run Details */}
                  {worker.lastValidationRun && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Latest Run:</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(worker.lastValidationRun.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {worker.lastValidationRun.stages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-bold text-green-600">
                              {worker.lastValidationRun.stages.filter(s => s.success).length}
                            </div>
                            <div className="text-gray-600">Passed</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="font-bold text-red-600">
                              {worker.lastValidationRun.stages.filter(s => !s.success).length}
                            </div>
                            <div className="text-gray-600">Failed</div>
                          </div>
                        </div>
                      )}

                      {worker.lastValidationRun.duration && (
                        <div className="flex items-center justify-center mt-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {(worker.lastValidationRun.duration / 1000).toFixed(1)}s duration
                        </div>
                      )}
                    </div>
                  )}

                  {/* Validation History Links */}
                  {worker.validationHistory && worker.validationHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Validation History ({worker.validationHistory.length} runs):
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open('/analytics', '_blank')}
                          className="text-xs px-2 py-1 h-6"
                        >
                          View All
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {worker.validationHistory.slice(0, 5).map(run => (
                          <div
                            key={run.id}
                            className="flex items-center justify-between p-2 bg-white rounded border text-xs hover:bg-gray-50 cursor-pointer"
                            onClick={() => window.open(`/validation-run/${run.id}`, '_blank')}
                          >
                            <div className="flex items-center space-x-2">
                              {run.success ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                              <span className={run.success ? 'text-green-700' : 'text-red-700'}>
                                {run.success ? 'Passed' : 'Failed'}
                              </span>
                              {run.stages && (
                                <span className="text-gray-500">
                                  ({run.stages.filter(s => s.success).length}/{run.stages.length}{' '}
                                  stages)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 text-gray-500">
                              {run.duration && (
                                <>
                                  <Clock className="h-3 w-3" />
                                  <span>{(run.duration / 1000).toFixed(1)}s</span>
                                </>
                              )}
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          </div>
                        ))}
                        {worker.validationHistory.length > 5 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            ...and {worker.validationHistory.length - 5} more runs
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Helpful message for failed validation */}
                  {worker.validationPassed === false &&
                    (worker.status === 'completed' || worker.status === 'failed') && (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        💡 Use "Retry with Same Worktree" to continue working on the same code
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {worker.status === 'stopped' && (
                <div className="space-y-2">
                  <Button
                    onClick={() => startWorkerMutation.mutate()}
                    disabled={startWorkerMutation.isPending}
                    className="w-full flex items-center justify-center space-x-2 text-green-600"
                    variant="outline"
                  >
                    <Play className="h-4 w-4" />
                    <span>{startWorkerMutation.isPending ? 'Starting...' : 'Restart Worker'}</span>
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Restarts the worker with the original task content
                  </p>
                </div>
              )}

              {worker.status === 'running' && (
                <div className="space-y-2">
                  <Button
                    onClick={() => stopWorkerMutation.mutate()}
                    disabled={stopWorkerMutation.isPending}
                    className="w-full flex items-center justify-center space-x-2 text-red-600"
                    variant="outline"
                  >
                    <Square className="h-4 w-4" />
                    <span>{stopWorkerMutation.isPending ? 'Stopping...' : 'Stop Worker'}</span>
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Stops the current Claude Code execution
                  </p>
                </div>
              )}

              {/* Retry Worker Button - Show when validation has failed */}
              {(worker.status === 'completed' || worker.status === 'failed') &&
                worker.validationPassed === false &&
                worker.validationRuns &&
                worker.validationRuns > 0 && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => retryWorkerMutation.mutate()}
                      disabled={retryWorkerMutation.isPending}
                      className="w-full flex items-center justify-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>
                        {retryWorkerMutation.isPending ? 'Retrying...' : 'Retry with Same Worktree'}
                      </span>
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Continues working from where validation failed
                    </p>
                  </div>
                )}

              {(worker.status === 'completed' || worker.status === 'stopped') &&
                worker.validationPassed && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        const commitMessage = prompt(
                          'Enter a commit message (optional):',
                          `Task ${worker.taskId}: ${worker.taskContent.substring(0, 50)}...`
                        );
                        // If user cancels, commitMessage will be null, so don't proceed
                        if (commitMessage !== null) {
                          mergeChangesMutation.mutate(commitMessage || undefined);
                        }
                      }}
                      disabled={mergeChangesMutation.isPending}
                      className="w-full flex items-center justify-center space-x-2 text-green-600"
                      variant="outline"
                    >
                      <GitMerge className="h-4 w-4" />
                      <span>{mergeChangesMutation.isPending ? 'Merging...' : 'Merge Changes'}</span>
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Merges successful changes back to main branch
                    </p>
                  </div>
                )}

              <div className="space-y-2">
                <Button
                  onClick={() => openVSCodeMutation.mutate()}
                  disabled={openVSCodeMutation.isPending}
                  className="w-full flex items-center justify-center space-x-2 text-blue-600"
                  variant="outline"
                >
                  <Code2 className="h-4 w-4" />
                  <span>{openVSCodeMutation.isPending ? 'Opening...' : 'Open in VS Code'}</span>
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Opens the worker's code directory in VS Code
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2">
          <TaskLogs executorId={workerId} />
        </div>
      </div>
    </div>
  );
}
