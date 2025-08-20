import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VariableSizeList } from 'react-window';
import type { VariableSizeList as VariableSizeListType } from 'react-window';
import useMeasure from 'react-use-measure';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Play,
  AlertCircle,
  ExternalLink,
  Activity,
  Terminal,
  Pause,
  FileText,
  Bot,
  GitMerge,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { taskApi } from '../lib/api';
import { BDDScenarioManager } from './BDDScenarioManager';
import { BDDScenario } from '../../shared/types';
import LogEntryRow from './logs/LogEntryRow';
import type { UnifiedLogEntry } from '../types/logs';
// import DisplayConversationEntry from './logs/DisplayConversationEntry';
// import type { NormalizedEntry } from '../../shared/types';

// Priority colors
const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
} as const;

// Status colors and icons
const statusConfig = {
  pending: {
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: AlertCircle,
    label: 'Pending',
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Play,
    label: 'In Progress',
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    label: 'Completed',
  },
} as const;

interface ValidationStageData {
  id: string;
  name: string;
  success: boolean;
  duration: number;
}

interface ValidationRunData {
  id: string;
  success: boolean;
  duration: number;
  timestamp: string;
  stages?: string;
}

function ValidationRunCard({ run }: { run: ValidationRunData }) {
  const stages: ValidationStageData[] = JSON.parse(run.stages || '[]');
  const successRate =
    stages.length > 0
      ? Math.round(
          (stages.filter((s) => s.success).length / stages.length) * 100
        )
      : 0;

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {run.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {run.success ? 'Passed' : 'Failed'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {run.duration}ms
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(run.timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500">Total Stages</div>
            <div className="text-lg font-semibold">{stages.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Success Rate</div>
            <div className="text-lg font-semibold">{successRate}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Passed/Failed</div>
            <div className="text-lg font-semibold">
              <span className="text-green-600">
                {stages.filter((s) => s.success).length}
              </span>
              /
              <span className="text-red-600">
                {stages.filter((s) => !s.success).length}
              </span>
            </div>
          </div>
        </div>

        {stages.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-2">Stages</div>
            <div className="space-y-1">
              {stages.slice(0, 3).map((stage, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    {stage.success ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="truncate">{stage.name}</span>
                  </div>
                  <span className="text-gray-500">{stage.duration}ms</span>
                </div>
              ))}
              {stages.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{stages.length - 3} more stages
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Link
            to={`/validation-run/${run.id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced task logs viewer component using actual worker logs
interface TaskLogsProps {
  executorId?: string;
}

function TaskLogs({ executorId }: TaskLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const listRef = useRef<VariableSizeListType>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerRef, bounds] = useMeasure();

  // Get actual worker logs instead of mock data
  const { data: logsData } = useQuery({
    queryKey: ['worker-logs', executorId],
    queryFn: () =>
      executorId
        ? import('../lib/api').then((api) =>
            api.claudeWorkersApi.getWorkerLogs(executorId)
          )
        : Promise.resolve(null),
    refetchInterval: autoRefresh ? 2000 : false,
    enabled: !!executorId,
    retry: 1,
  });

  // Process actual logs into enhanced UnifiedLogEntry format with rich UI
  const logEntries = React.useMemo(() => {
    if (!logsData?.logs) return [];

    const lines = logsData.logs
      .split('\n')
      .filter((line: string) => line.trim());
    const entries: UnifiedLogEntry[] = [];
    const baseTimestamp = Date.now() - lines.length * 1000;

    // Add a process start entry for better visual context
    entries.push({
      id: `${executorId}-start`,
      ts: baseTimestamp - 1000,
      processId: executorId || 'unknown',
      processName: `claude-worker`,
      channel: 'process_start',
      payload: {
        processId: executorId || 'unknown',
        runReason: 'claude-code-worker',
        startedAt: new Date(baseTimestamp).toISOString(),
        status: 'running',
      },
    });

    // Process each log line and enhance it
    lines.forEach((line: string, index: number) => {
      const timestamp = baseTimestamp + index * 100;

      // Detect different types of log entries and create appropriate channels
      if (
        line.includes('[ERROR]') ||
        line.includes('ERROR:') ||
        line.toLowerCase().includes('error')
      ) {
        entries.push({
          id: `log-${executorId}-${index}`,
          ts: timestamp,
          processId: executorId || 'unknown',
          processName: 'claude-worker',
          channel: 'stderr',
          payload: `[${new Date(timestamp).toLocaleTimeString()}] ${line}`,
        });
      } else if (
        line.includes('🤖') ||
        line.includes('assistant:') ||
        line.includes('Claude:')
      ) {
        // Convert assistant messages to normalized entries for better UI
        entries.push({
          id: `log-${executorId}-${index}`,
          ts: timestamp,
          processId: executorId || 'unknown',
          processName: 'claude-worker',
          channel: 'normalized',
          payload: {
            timestamp: new Date(timestamp).toISOString(),
            entry_type: { type: 'assistant_message' },
            content: line
              .replace(/^🤖\s*/, '')
              .replace(/^assistant:\s*/i, '')
              .replace(/^Claude:\s*/i, ''),
          },
        });
      } else if (
        line.includes('user:') ||
        line.includes('👤') ||
        line.includes('Human:')
      ) {
        // Convert user messages to normalized entries
        entries.push({
          id: `log-${executorId}-${index}`,
          ts: timestamp,
          processId: executorId || 'unknown',
          processName: 'claude-worker',
          channel: 'normalized',
          payload: {
            timestamp: new Date(timestamp).toISOString(),
            entry_type: { type: 'user_message' },
            content: line
              .replace(/^👤\s*/, '')
              .replace(/^user:\s*/i, '')
              .replace(/^Human:\s*/i, ''),
          },
        });
      } else if (
        line.includes('📁') ||
        line.includes('Read tool') ||
        line.includes('Edit tool') ||
        line.includes('Bash tool')
      ) {
        // Convert tool usage to normalized entries
        entries.push({
          id: `log-${executorId}-${index}`,
          ts: timestamp,
          processId: executorId || 'unknown',
          processName: 'claude-worker',
          channel: 'normalized',
          payload: {
            timestamp: new Date(timestamp).toISOString(),
            entry_type: {
              type: 'tool_use',
              tool_name: line.includes('Read')
                ? 'Read'
                : line.includes('Edit')
                  ? 'Edit'
                  : line.includes('Bash')
                    ? 'Bash'
                    : 'Tool',
              action_type: { action: 'other', description: 'Tool execution' },
            },
            content: line.replace(/^📁\s*/, ''),
          },
        });
      } else {
        // Regular stdout entries with proper formatting
        entries.push({
          id: `log-${executorId}-${index}`,
          ts: timestamp,
          processId: executorId || 'unknown',
          processName: 'claude-worker',
          channel: 'stdout',
          payload: `[${new Date(timestamp).toLocaleTimeString()}] ${line}`,
        });
      }
    });

    // Sort by timestamp
    return entries.sort((a, b) => a.ts - b.ts);
  }, [logsData, executorId]);

  const rowHeights = useRef<Record<number, number>>({});

  const getRowHeight = useCallback((index: number): number => {
    const h = rowHeights.current[index];
    return h !== undefined ? h : 24;
  }, []);

  const setRowHeight = useCallback((index: number, size: number) => {
    listRef.current?.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logEntries.length > 0 && listRef.current) {
      listRef.current.scrollToItem(logEntries.length - 1, 'end');
    }
  }, [logEntries.length, autoScroll]);

  // Handle scroll events to detect user scrolling
  const onScroll = useCallback(
    ({
      scrollOffset,
      scrollUpdateWasRequested,
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      if (!scrollUpdateWasRequested && bounds.height) {
        const atBottom = innerRef.current
          ? innerRef.current.offsetHeight - scrollOffset - bounds.height < 20
          : false;
        setAutoScroll(atBottom);
      }
    },
    [bounds.height]
  );

  if (!executorId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Task Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Terminal className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No active worker for this task</p>
            <p className="text-sm">
              Logs will appear when a worker is assigned
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Task Logs
            {executorId && (
              <Badge variant="secondary" className="text-xs">
                {executorId.split('-').slice(-2).join('-')}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={autoScroll ? 'default' : 'outline'}
              onClick={() => setAutoScroll(!autoScroll)}
              className="flex items-center space-x-1"
            >
              {autoScroll ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              <span>{autoScroll ? 'Auto' : 'Manual'}</span>
            </Button>
            <Button
              size="sm"
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center space-x-1"
            >
              <FileText className="h-3 w-3" />
              <span>{autoRefresh ? 'Live' : 'Paused'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="h-64 bg-gray-900 text-green-400 rounded"
        >
          {bounds.height && bounds.width && logEntries.length > 0 ? (
            <VariableSizeList
              ref={listRef}
              innerRef={innerRef}
              height={bounds.height}
              width={bounds.width}
              itemCount={logEntries.length}
              itemSize={getRowHeight}
              onScroll={onScroll}
              itemData={logEntries}
            >
              {({ index, style, data }) => {
                const styleWithPadding = { ...style };
                if (index === logEntries.length - 1) {
                  styleWithPadding.paddingBottom = '20px';
                }

                // Pass the enhanced log entry for proper formatting with icons
                return (
                  <LogEntryRow
                    entry={data[index]}
                    index={index}
                    style={styleWithPadding}
                    setRowHeight={setRowHeight}
                  />
                );
              }}
            </VariableSizeList>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              {logEntries.length === 0
                ? 'No logs available for this task...'
                : 'Loading logs...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerInfo({ executorId }: { executorId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workersData } = useQuery({
    queryKey: ['workers-status'],
    queryFn: () =>
      import('../lib/api').then((api) =>
        api.claudeWorkersApi.getWorkersStatus()
      ),
    refetchInterval: 5000,
  });

  // Merge worktree mutation
  const mergeWorktreeMutation = useMutation({
    mutationFn: async () => {
      const { claudeWorkersApi } = await import('../lib/api');
      const response = await claudeWorkersApi.mergeWorktree(executorId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-status'] });
    },
  });

  const worker = workersData?.workers.find((w) => w.id === executorId);

  if (!worker) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-gray-400" />
            Worker Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Worker ID: <span className="font-mono">{executorId}</span>
            <p className="text-xs text-gray-400 mt-2">
              Worker not currently active
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    starting: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    running: { color: 'bg-blue-100 text-blue-800', icon: Play },
    validating: { color: 'bg-purple-100 text-purple-800', icon: Activity },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
    stopped: { color: 'bg-gray-100 text-gray-800', icon: Pause },
  };

  const StatusIcon = statusConfig[worker.status].icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-600" />
            Worker Information
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/workers')}
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View in Dashboard
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Worker ID:</span>
            <Link
              to={`/workers#${worker.id}`}
              className="font-mono text-sm text-blue-600 hover:underline"
            >
              {worker.id.split('-').slice(-2).join('-')}
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              <Badge className={`text-xs ${statusConfig[worker.status].color}`}>
                {worker.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {worker.pid && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Process ID:</span>
              <span className="font-mono text-sm">{worker.pid}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Started:</span>
            <span className="text-sm">
              {new Date(worker.startTime).toLocaleString()}
            </span>
          </div>

          {worker.validationPassed !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Validation:</span>
              <Badge
                className={`text-xs ${
                  worker.validationPassed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {worker.validationPassed ? '✅ Passed' : '❌ Failed'}
              </Badge>
            </div>
          )}

          {worker.blockedCommands > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Blocked Commands:</span>
              <Badge
                variant="outline"
                className="text-xs bg-orange-50 text-orange-700"
              >
                {worker.blockedCommands}
              </Badge>
            </div>
          )}

          {/* Merge Worktree Action */}
          {(worker.status === 'completed' || worker.status === 'stopped') &&
            worker.validationPassed && (
              <div className="pt-3 border-t border-gray-200">
                <Button
                  onClick={() => mergeWorktreeMutation.mutate()}
                  disabled={mergeWorktreeMutation.isPending}
                  className="w-full flex items-center justify-center space-x-2 text-green-600 hover:bg-green-50"
                  variant="outline"
                >
                  <GitMerge className="h-4 w-4" />
                  <span>
                    {mergeWorktreeMutation.isPending
                      ? 'Merging...'
                      : 'Merge Worker Changes'}
                  </span>
                </Button>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: taskResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId!),
    enabled: !!taskId,
  });

  // BDD Scenarios mutations
  const createScenarioMutation = useMutation({
    mutationFn: (scenario: Omit<BDDScenario, 'id'>) =>
      taskApi.addScenarioToTask(taskId!, scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const updateScenarioMutation = useMutation({
    mutationFn: ({
      id,
      scenario,
    }: {
      id: string;
      scenario: Partial<BDDScenario>;
    }) => taskApi.updateTaskScenario(taskId!, id, scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) =>
      taskApi.deleteTaskScenario(taskId!, scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleAddScenario = (scenario: Omit<BDDScenario, 'id'>) => {
    createScenarioMutation.mutate(scenario);
  };

  const handleUpdateScenario = (id: string, scenario: Partial<BDDScenario>) => {
    updateScenarioMutation.mutate({ id, scenario });
  };

  const handleDeleteScenario = (id: string) => {
    deleteScenarioMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error || !taskResponse) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Task Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The task you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const task = taskResponse;
  const StatusIcon =
    statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;
  const validationRuns = task.validationRuns || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tasks')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
        </div>
      </div>

      {/* Task Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Task Information</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors]}`}
              >
                {task.priority}
              </Badge>
              <Badge
                className={`text-xs ${statusConfig[task.status as keyof typeof statusConfig]?.color}`}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[task.status as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              Description
            </div>
            <p className="text-gray-900 leading-relaxed">{task.content}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Task ID</div>
              <div className="text-sm text-gray-600 font-mono">{task.id}</div>
            </div>

            {task.startTime && (
              <div>
                <div className="text-sm font-medium text-gray-700">Started</div>
                <div className="text-sm text-gray-600">
                  {new Date(task.startTime).toLocaleString()}
                </div>
              </div>
            )}

            {task.endTime && (
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Completed
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(task.endTime).toLocaleString()}
                </div>
              </div>
            )}

            {task.duration && (
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Duration
                </div>
                <div className="text-sm text-gray-600">{task.duration}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Logs */}
      <TaskLogs executorId={task.executorId} />

      {/* Worker Information */}
      {task.executorId && <WorkerInfo executorId={task.executorId} />}

      {/* BDD Scenarios */}
      <Card>
        <CardContent className="p-6">
          <BDDScenarioManager
            taskId={taskId!}
            scenarios={task.bddScenarios || []}
            onAddScenario={handleAddScenario}
            onUpdateScenario={handleUpdateScenario}
            onDeleteScenario={handleDeleteScenario}
            readonly={task.status === 'completed'}
          />
        </CardContent>
      </Card>

      {/* Validation Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Validation Runs
            <Badge variant="secondary" className="ml-auto">
              {validationRuns.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validationRuns.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Validation Runs
              </h3>
              <p className="text-gray-600">
                This task hasn't had any validation runs yet. Validation runs
                will appear here when the task is validated.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {validationRuns.map((run: ValidationRunData) => (
                <ValidationRunCard key={run.id} run={run} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
