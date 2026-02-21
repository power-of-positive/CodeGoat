import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  Play,
  AlertCircle,
  Activity,
  GitMerge,
  Edit,
  RefreshCw,
  Server,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import { PageLoading } from '../../../shared/ui/loading';
import { taskApi, claudeWorkersApi } from '../../../shared/lib/api';
import { BDDScenarioManager } from '../../bdd/components/BDDScenarioManager';
import { BDDScenario, Task } from '../../../shared/types';
import { ValidationRunCard } from '../../validation/components/ValidationRunCard';
import { TaskLogs } from './TaskLogs';
import { WorkerInfo } from '../../workers/components/WorkerInfo';
import { formatDuration } from '../../../shared/utils/formatDuration';
import { DiffViewer } from '../../workers/components/DiffViewer';

type WorkerDiff = Awaited<ReturnType<typeof claudeWorkersApi.getWorkerDiff>>;

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

interface ValidationRunData {
  id: string;
  success: boolean;
  duration: number;
  timestamp: string;
  stages?: string;
}

// Custom hook for task data and mutations
function useTaskData(taskId: string | undefined) {
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId!),
    enabled: !!taskId,
  });

  const createScenarioMutation = useMutation({
    mutationFn: (scenario: Omit<BDDScenario, 'id'>) => taskApi.addScenario(taskId!, scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const updateScenarioMutation = useMutation({
    mutationFn: ({ id, scenario }: { id: string; scenario: Partial<BDDScenario> }) =>
      taskApi.updateTaskScenario(taskId!, id, scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => taskApi.deleteTaskScenario(taskId!, scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  return {
    taskQuery,
    createScenarioMutation,
    updateScenarioMutation,
    deleteScenarioMutation,
  };
}

// Custom hook for merge changes
function useMergeChanges(taskId: string | undefined, task: Task | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string | undefined>({
    mutationFn: async (commitMessage?: string) => {
      if (!task?.executorId) {
        throw new Error('No executor ID available for this task');
      }
      const defaultMessage = `Task ${taskId}: Merge changes from task execution`;
      const message = commitMessage || defaultMessage;
      await claudeWorkersApi.mergeWorktree(task.executorId, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

// Task header component
function TaskHeader({
  navigate,
  task,
  mergeChangesMutation,
  completeTaskMutation,
  startDevServerMutation,
}: {
  navigate: (path: string) => void;
  task: Task;
  mergeChangesMutation: ReturnType<typeof useMergeChanges>;
  completeTaskMutation: {
    mutate: () => void;
    isPending: boolean;
  };
  startDevServerMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}) {
  const [isAutoMerging, setIsAutoMerging] = useState(false);

  const defaultCommitMessage = `Task ${task.id}: ${task.content.substring(0, 50)}...`;

  const handleManualMerge = () => {
    const commitMessage = prompt('Enter a commit message (optional):', defaultCommitMessage);
    if (commitMessage !== null) {
      mergeChangesMutation.mutate(commitMessage || undefined);
    }
  };

  const handleAutoMerge = async () => {
    if (!task.executorId) {
      alert('No worker associated with this task to merge changes from.');
      return;
    }

    try {
      setIsAutoMerging(true);
      const result = await claudeWorkersApi.generateCommitMessage(task.executorId);
      const commitMessage = prompt(
        'Generated commit message (edit if needed):',
        result.commitMessage
      );

      if (commitMessage === null) {
        return;
      }

      await mergeChangesMutation.mutateAsync(commitMessage || undefined);
    } catch (error) {
      console.error('Failed to auto-generate commit message:', error);
      const fallbackCommit = prompt(
        'Enter a commit message (optional):',
        defaultCommitMessage
      );
      if (fallbackCommit !== null) {
        await mergeChangesMutation.mutateAsync(fallbackCommit || undefined);
      }
    } finally {
      setIsAutoMerging(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tasks
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => navigate(`/tasks?edit=${task.id}`)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Task
        </Button>
        {task.status !== 'completed' && (
          <Button
            onClick={() => {
              if (confirm('Are you sure you want to mark this task as completed?')) {
                completeTaskMutation.mutate();
              }
            }}
            disabled={completeTaskMutation.isPending}
            className="flex items-center gap-2"
            variant="default"
          >
            <CheckCircle className="w-4 h-4" />
            {completeTaskMutation.isPending ? 'Completing...' : 'Mark Complete'}
          </Button>
        )}
        {task.executorId && task.status === 'completed' && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutoMerge}
              disabled={mergeChangesMutation.isPending || isAutoMerging}
              className="flex items-center gap-2"
              variant="outline"
            >
              <GitMerge className="w-4 h-4" />
              {mergeChangesMutation.isPending || isAutoMerging
                ? 'Merging...'
                : 'Auto-Generate & Merge'}
            </Button>
            <Button
              onClick={handleManualMerge}
              disabled={mergeChangesMutation.isPending || isAutoMerging}
              className="flex items-center gap-2"
              variant="outline"
              size="sm"
            >
              <GitMerge className="w-4 h-4" />
              Manual
            </Button>
          </div>
        )}
        {task.executorId && (
          <Button
            onClick={() => startDevServerMutation.mutate()}
            disabled={startDevServerMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Server className="w-4 h-4" />
            {startDevServerMutation.isPending ? 'Starting Dev Servers…' : 'Start Dev Servers'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Task information component
function TaskInformation({ task }: { task: Task }) {
  const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;

  return (
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
          <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
          <p className="text-gray-900 leading-relaxed">{task.content}</p>
        </div>
        <TaskMetadata task={task} />
      </CardContent>
    </Card>
  );
}

// Task metadata component
function TaskMetadata({ task }: { task: Task }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <div className="text-sm font-medium text-gray-700">Task ID</div>
        <div className="text-sm text-gray-600 font-mono">{task.id}</div>
      </div>

      {task.startTime && (
        <div>
          <div className="text-sm font-medium text-gray-700">Started</div>
          <div className="text-sm text-gray-600">{new Date(task.startTime).toLocaleString()}</div>
        </div>
      )}

      {task.endTime && (
        <div>
          <div className="text-sm font-medium text-gray-700">Completed</div>
          <div className="text-sm text-gray-600">{new Date(task.endTime).toLocaleString()}</div>
        </div>
      )}

      {task.duration && (
        <div>
          <div className="text-sm font-medium text-gray-700">Duration</div>
          <div className="text-sm text-gray-600">{formatDuration(task.duration)}</div>
        </div>
      )}
    </div>
  );
}

// BDD scenarios section component
function BDDScenariosSection({
  taskId,
  task,
  scenarioHandlers,
}: {
  taskId: string;
  task: Task;
  scenarioHandlers: {
    handleAddScenario: (scenario: Omit<BDDScenario, 'id'>) => void;
    handleUpdateScenario: (id: string, scenario: Partial<BDDScenario>) => void;
    handleDeleteScenario: (id: string) => void;
  };
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <BDDScenarioManager
          taskId={taskId}
          scenarios={task.bddScenarios || []}
          onAddScenario={scenarioHandlers.handleAddScenario}
          onUpdateScenario={scenarioHandlers.handleUpdateScenario}
          onDeleteScenario={scenarioHandlers.handleDeleteScenario}
          readonly={task.status === 'completed'}
        />
      </CardContent>
    </Card>
  );
}

// Validation runs section component
function ValidationRunsSection({ validationRuns }: { validationRuns: ValidationRunData[] }) {
  return (
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Validation Runs</h3>
            <p className="text-gray-600">
              This task hasn't had any validation runs yet. Validation runs will appear here when
              the task is validated.
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
  );
}

// Error state component
function TaskNotFound({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Not Found</h2>
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

export function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const {
    taskQuery: { data: taskResponse, isLoading, error },
    createScenarioMutation,
    updateScenarioMutation,
    deleteScenarioMutation,
  } = useTaskData(taskId);

  const task = taskResponse;
  const executorId = task?.executorId;
  const mergeChangesMutation = useMergeChanges(taskId, task);
  const startDevServerMutation = useMutation({
    mutationFn: async () => {
      if (!task?.executorId) {
        throw new Error('No executor assigned to this task');
      }
      return claudeWorkersApi.startDevServer(task.executorId, 'both');
    },
    onSuccess: data => {
      const serverSummary = Array.isArray(data?.servers)
        ? data.servers
            .map(server => `${server.type} (${server.port ?? 'N/A'})`)
            .join(', ')
        : 'Dev servers started';
      alert(`Dev servers started successfully: ${serverSummary}`);
    },
    onError: (error: Error) => {
      console.error('Failed to start dev servers:', error);
      alert(`Failed to start dev servers: ${error.message}`);
    },
  });
  const queryClient = useQueryClient();

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: () => taskApi.updateTask(taskId!, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      alert('✅ Task marked as completed!');
    },
    onError: error => {
      console.error('Failed to complete task:', error);
      alert('❌ Failed to complete task. Please check the console for details.');
    },
  });

  const {
    data: workerDiff,
    isLoading: isLoadingDiff,
    isError: isDiffError,
    error: diffError,
    isFetching: isFetchingDiff,
    refetch: refetchWorkerDiff,
  } = useQuery<WorkerDiff>({
    queryKey: ['worker-diff', executorId],
    queryFn: () => claudeWorkersApi.getWorkerDiff(executorId!),
    enabled: !!executorId,
    refetchInterval: 5000,
    retry: false,
  });

  const scenarioHandlers = {
    handleAddScenario: (scenario: Omit<BDDScenario, 'id'>) => {
      createScenarioMutation.mutate(scenario);
    },
    handleUpdateScenario: (id: string, scenario: Partial<BDDScenario>) => {
      updateScenarioMutation.mutate({ id, scenario });
    },
    handleDeleteScenario: (id: string) => {
      deleteScenarioMutation.mutate(id);
    },
  };

  if (isLoading) {
    return <PageLoading message="Loading task details..." />;
  }

  if (error || !taskResponse) {
    return <TaskNotFound navigate={navigate} />;
  }

  const validationRuns: ValidationRunData[] = (task.validationRuns || []).map(run => ({
    id: run.id,
    success: run.success,
    duration: run.duration,
    timestamp: run.timestamp,
    stages: Array.isArray(run.stages) ? run.stages.map(s => s.name).join(', ') : run.stages,
  }));

  return (
    <div className="p-6 space-y-6">
      <TaskHeader
        navigate={navigate}
        task={task}
        mergeChangesMutation={mergeChangesMutation}
        completeTaskMutation={completeTaskMutation}
        startDevServerMutation={startDevServerMutation}
      />
      <TaskInformation task={task} />
      <TaskLogs executorId={task.executorId} />
      {task.executorId && <WorkerInfo executorId={task.executorId} />}
      {executorId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Worktree Changes</h2>
            <div className="flex items-center gap-2">
              {isFetchingDiff && (
                <span className="flex items-center text-xs text-gray-500 gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Updating…
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchWorkerDiff()}
                disabled={isLoadingDiff}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Diff</span>
              </Button>
            </div>
          </div>

          {isLoadingDiff && !workerDiff ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-10">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Loading git diff…</span>
              </CardContent>
            </Card>
          ) : isDiffError ? (
            <Card>
              <CardContent className="space-y-2 py-6">
                <p className="text-sm text-red-600 font-medium">
                  Failed to load worktree diff for this task&apos;s worker.
                </p>
                <p className="text-xs text-gray-600">
                  {diffError instanceof Error ? diffError.message : 'Unknown error occurred.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchWorkerDiff()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DiffViewer
              diff={workerDiff?.diff ?? ''}
              diffStat={workerDiff?.diffStat ?? ''}
              changedFiles={workerDiff?.changedFiles ?? []}
              worktreePath={workerDiff?.worktreePath}
            />
          )}
        </div>
      )}
      <BDDScenariosSection taskId={taskId!} task={task} scenarioHandlers={scenarioHandlers} />
      <ValidationRunsSection validationRuns={validationRuns} />
    </div>
  );
}
