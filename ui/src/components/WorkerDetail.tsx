import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { VariableSizeList } from 'react-window';
import {
  Play,
  Square,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  Send,
  MessageSquare,
  Pause,
  GitMerge,
  Code2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { claudeWorkersApi } from '../lib/api';
import LogEntryRow from './logs/LogEntryRow';
import { useProcessesLogs } from '../hooks/useProcessesLogs';

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
  status:
    | 'starting'
    | 'running'
    | 'completed'
    | 'failed'
    | 'stopped'
    | 'validating';
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

interface WorkerLogsResponse {
  workerId: string;
  logs: string;
  logFile: string;
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
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const listRef = useRef<VariableSizeList>(null);

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

  // Fetch worker logs with enhanced streaming
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    error: logsError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['worker-logs', workerId],
    queryFn: async () => {
      const response = await claudeWorkersApi.getWorkerLogs(workerId!);
      return response as WorkerLogsResponse;
    },
    enabled: !!workerId,
    refetchInterval: isStreaming ? 500 : 5000, // Faster polling when streaming (500ms)
    refetchOnWindowFocus: isStreaming, // Refetch when window gets focus during streaming
    staleTime: isStreaming ? 0 : 30000, // Always consider stale when streaming
  });

  // Create execution process for useProcessesLogs hook
  const executionProcesses = worker
    ? [
        {
          id: worker.id,
          task_attempt_id: worker.taskId,
          run_reason: 'codingagent',
          status:
            worker.status === 'completed'
              ? 'completed'
              : worker.status === 'failed'
                ? 'failed'
                : 'running',
          started_at: worker.startTime,
          completed_at: worker.endTime,
        },
      ]
    : [];

  // Use the processes logs hook for enhanced log display
  const { entries: processLogEntries } = useProcessesLogs(
    executionProcesses,
    isStreaming
  );

  // Send message to worker and restart it
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!worker) throw new Error('Worker data not available');

      // Step 1: Stop the current worker if it's running
      if (worker.status === 'running' || worker.status === 'validating') {
        await claudeWorkersApi.stopWorker(workerId!);

        // Wait a moment for the worker to stop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Step 2: Send the message
      const messageResponse = await claudeWorkersApi.sendWorkerMessage(
        workerId!,
        { message }
      );

      // Step 3: Restart the worker with the message context
      const restartResponse = await claudeWorkersApi.startWorker({
        taskId: worker.taskId,
        taskContent: `${worker.taskContent}\n\nAdditional Message: ${message}`,
      });

      return { messageResponse, restartResponse };
    },
    onSuccess: () => {
      setMessage('');
      // Refresh both worker status and logs
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker-logs', workerId] });
    },
  });

  // Start worker
  const startWorkerMutation = useMutation({
    mutationFn: async () => {
      if (!worker) throw new Error('Worker data not available');
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
      const response = await claudeWorkersApi.stopWorker(workerId!);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
    },
  });

  // Merge worktree
  const mergeWorktreeMutation = useMutation({
    mutationFn: async () => {
      const response = await claudeWorkersApi.mergeWorktree(workerId!);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
    },
  });

  // Open VS Code
  const openVSCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await claudeWorkersApi.openVSCode(workerId!);
      return response;
    },
  });

  // Re-trigger worker when validation fails
  const retryWorkerMutation = useMutation({
    mutationFn: async () => {
      if (!worker) throw new Error('Worker data not available');
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && workerId) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Parse logs into entries for display
  const logEntries = React.useMemo(() => {
    if (!logsData?.logs) return processLogEntries;

    // Parse raw logs into structured entries
    const rawLogLines = logsData.logs.split('\n').filter((line) => line.trim());
    const rawLogEntries = rawLogLines.map((line, index) => ({
      id: `raw-log-${index}`,
      channel: 'stdout' as const,
      payload: line,
      timestamp: new Date().toISOString(),
    }));

    // Combine process logs with parsed raw logs
    return [...processLogEntries, ...rawLogEntries];
  }, [logsData?.logs, processLogEntries]);

  const getRowHeight = useCallback(
    (index: number) => {
      if (rowHeights[index]) {
        return rowHeights[index];
      }

      // Calculate estimated height based on content
      const entry = logEntries[index];
      if (entry) {
        const content =
          typeof entry === 'string'
            ? entry
            : typeof entry.payload === 'string'
              ? entry.payload
              : JSON.stringify(entry.payload);

        // Estimate height based on content length and line breaks
        const lines = content.split('\n').length;
        const avgCharsPerLine = 80; // Average chars that fit per line
        const estimatedLines = Math.max(
          lines,
          Math.ceil(content.length / avgCharsPerLine)
        );

        // Base height + (line height * estimated lines) with reasonable bounds
        return Math.max(60, Math.min(400, 40 + estimatedLines * 20));
      }

      return 80; // Default height
    },
    [rowHeights, logEntries]
  );

  const setRowHeight = useCallback((index: number, height: number) => {
    setRowHeights((prev) => {
      if (prev[index] !== height) {
        const updated = { ...prev, [index]: height };
        return updated;
      }
      return prev;
    });
  }, []);

  // Auto-scroll to bottom when new entries arrive (only if streaming)
  useEffect(() => {
    if (listRef.current && logEntries.length > 0 && isStreaming) {
      // Small delay to allow height calculations
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToItem(logEntries.length - 1, 'end');
        }
      }, 100);
    }
  }, [logEntries.length, isStreaming]);

  // Reset row heights when log entries change significantly
  useEffect(() => {
    setRowHeights({});
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [logsData?.logs]);

  // Auto-enable streaming when worker is actively running
  useEffect(() => {
    if (worker) {
      if (worker.status === 'running' || worker.status === 'validating') {
        if (!isStreaming) {
          setIsStreaming(true);
        }
      } else if (
        worker.status === 'completed' ||
        worker.status === 'failed' ||
        worker.status === 'stopped'
      ) {
        // Keep streaming on for a few seconds after completion to catch final logs
        if (isStreaming) {
          const timer = setTimeout(() => {
            setIsStreaming(false);
          }, 5000); // Stop streaming 5 seconds after completion
          return () => clearTimeout(timer);
        }
      }
    }
  }, [worker?.status, isStreaming, worker]);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Worker Not Found
          </h1>
          <p className="text-gray-600">
            The worker with ID {workerId} could not be found.
          </p>
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
                <Label className="text-sm font-medium text-gray-700">
                  Task Content:
                </Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border mt-1">
                  {worker.taskContent}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <Label className="font-medium text-gray-700">Started:</Label>
                  <p className="text-gray-600">
                    {new Date(worker.startTime).toLocaleString()}
                  </p>
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
                    <Label className="font-medium text-gray-700">
                      End Time:
                    </Label>
                    <p className="text-gray-600">
                      {new Date(worker.endTime).toLocaleString()}
                    </p>
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
                  <Label className="font-medium text-gray-700">
                    Permission System:
                  </Label>
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
                  <Label className="font-medium text-gray-700">
                    Blocked Commands:
                  </Label>
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
                  <Label className="font-medium text-gray-700">
                    Validation Status:
                  </Label>

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
                        <span className="font-medium text-gray-700">
                          Latest Run:
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(
                            worker.lastValidationRun.timestamp
                          ).toLocaleString()}
                        </span>
                      </div>

                      {worker.lastValidationRun.stages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-bold text-green-600">
                              {
                                worker.lastValidationRun.stages.filter(
                                  (s) => s.success
                                ).length
                              }
                            </div>
                            <div className="text-gray-600">Passed</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="font-bold text-red-600">
                              {
                                worker.lastValidationRun.stages.filter(
                                  (s) => !s.success
                                ).length
                              }
                            </div>
                            <div className="text-gray-600">Failed</div>
                          </div>
                        </div>
                      )}

                      {worker.lastValidationRun.duration && (
                        <div className="flex items-center justify-center mt-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {(worker.lastValidationRun.duration / 1000).toFixed(
                            1
                          )}
                          s duration
                        </div>
                      )}
                    </div>
                  )}

                  {/* Validation History Links */}
                  {worker.validationHistory &&
                    worker.validationHistory.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Validation History (
                            {worker.validationHistory.length} runs):
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
                          {worker.validationHistory.slice(0, 5).map((run) => (
                            <div
                              key={run.id}
                              className="flex items-center justify-between p-2 bg-white rounded border text-xs hover:bg-gray-50 cursor-pointer"
                              onClick={() =>
                                window.open(
                                  `/analytics/validation/${run.id}`,
                                  '_blank'
                                )
                              }
                            >
                              <div className="flex items-center space-x-2">
                                {run.success ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span
                                  className={
                                    run.success
                                      ? 'text-green-700'
                                      : 'text-red-700'
                                  }
                                >
                                  {run.success ? 'Passed' : 'Failed'}
                                </span>
                                {run.stages && (
                                  <span className="text-gray-500">
                                    (
                                    {run.stages.filter((s) => s.success).length}
                                    /{run.stages.length} stages)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 text-gray-500">
                                {run.duration && (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {(run.duration / 1000).toFixed(1)}s
                                    </span>
                                  </>
                                )}
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            </div>
                          ))}
                          {worker.validationHistory.length > 5 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              ...and {worker.validationHistory.length - 5} more
                              runs
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Helpful message for failed validation */}
                  {worker.validationPassed === false &&
                    (worker.status === 'completed' ||
                      worker.status === 'failed') && (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        💡 Use "Retry with Same Worktree" to continue working on
                        the same code
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
                    <span>
                      {startWorkerMutation.isPending
                        ? 'Starting...'
                        : 'Restart Worker'}
                    </span>
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
                    <span>
                      {stopWorkerMutation.isPending
                        ? 'Stopping...'
                        : 'Stop Worker'}
                    </span>
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
                        {retryWorkerMutation.isPending
                          ? 'Retrying...'
                          : 'Retry with Same Worktree'}
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
                      onClick={() => mergeWorktreeMutation.mutate()}
                      disabled={mergeWorktreeMutation.isPending}
                      className="w-full flex items-center justify-center space-x-2 text-green-600"
                      variant="outline"
                    >
                      <GitMerge className="h-4 w-4" />
                      <span>
                        {mergeWorktreeMutation.isPending
                          ? 'Merging...'
                          : 'Merge Worktree'}
                      </span>
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
                  <span>
                    {openVSCodeMutation.isPending
                      ? 'Opening...'
                      : 'Open in VS Code'}
                  </span>
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Opens the worker's code directory in VS Code
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex flex-col">
                  <Label className="text-sm">Real-time Log Streaming:</Label>
                  <span className="text-xs text-gray-500">
                    {isStreaming ? 'Updates every 500ms' : 'Manual refresh'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={`${isStreaming ? 'text-red-600 border-red-300 bg-red-50' : 'text-green-600 border-green-300 bg-green-50'}`}
                >
                  {isStreaming ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span className="ml-1">Stop Stream</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span className="ml-1">Start Stream</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Message Worker Card */}
          {worker.status === 'running' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Interrupt & Send Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                  <div className="flex items-center space-x-1 mb-1">
                    <AlertCircle className="h-3 w-3" />
                    <span className="font-medium">
                      This will interrupt the current run
                    </span>
                  </div>
                  <p className="text-xs">
                    Sending a message will stop the current Claude Code
                    execution and restart it with your new instructions.
                  </p>
                </div>
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div>
                    <Label htmlFor="message">Additional instructions:</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter additional instructions or corrections..."
                      className="min-h-[100px] mt-1"
                      disabled={sendMessageMutation.isPending}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {sendMessageMutation.isPending
                        ? 'Interrupting & Restarting...'
                        : 'Interrupt & Send Message'}
                    </span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[800px]">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-5 w-5" />
                  <span>Worker Logs</span>
                  {isStreaming && (
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-50 border-green-300 text-green-700"
                      >
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>LIVE</span>
                        </div>
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Last update:{' '}
                        {new Date(dataUpdatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{logEntries.length} entries</span>
                  {logEntries.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (listRef.current) {
                          listRef.current.scrollToItem(
                            logEntries.length - 1,
                            'end'
                          );
                        }
                      }}
                      className="text-xs px-2 py-1 h-6"
                    >
                      Jump to End
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="h-full bg-gray-900 overflow-hidden">
                {logsError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                      <p className="text-red-400">Error loading logs</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {logsError instanceof Error
                          ? logsError.message
                          : 'Failed to load logs'}
                      </p>
                    </div>
                  </div>
                ) : isLoadingLogs ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading logs...</span>
                  </div>
                ) : logEntries.length > 0 ? (
                  <VariableSizeList
                    ref={listRef}
                    height={720} // Slightly larger to use full space
                    width="100%"
                    itemCount={logEntries.length}
                    itemSize={getRowHeight}
                    className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                    overscanCount={5} // Pre-render some items for smoother scrolling
                  >
                    {({ index, style }) => (
                      <LogEntryRow
                        entry={logEntries[index]}
                        index={index}
                        style={style}
                        setRowHeight={setRowHeight}
                      />
                    )}
                  </VariableSizeList>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Terminal className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No logs available yet</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Logs will appear here as the worker runs
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
