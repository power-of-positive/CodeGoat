import React from 'react';
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
    mutationFn: (scenario: Omit<BDDScenario, 'id'>) =>
      taskApi.addScenario(taskId!, scenario),
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

  return useMutation({
    mutationFn: async () => {
      if (!task?.executorId) {
        throw new Error('No executor ID available for this task');
      }
      const commitMessage = `Task ${taskId}: Merge changes from task execution`;
      const response = await claudeWorkersApi.mergeWorktree(task.executorId, commitMessage);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

// Task header component
function TaskHeader({ navigate, task, mergeChangesMutation, completeTaskMutation }: {
  navigate: (path: string) => void;
  task: Task;
  mergeChangesMutation: {
    mutate: () => void;
    isPending: boolean;
  };
  completeTaskMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}) {
  return (
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
          <Button
            onClick={() => mergeChangesMutation.mutate()}
            disabled={mergeChangesMutation.isPending}
            className="flex items-center gap-2"
            variant="outline"
          >
            <GitMerge className="w-4 h-4" />
            {mergeChangesMutation.isPending ? 'Merging...' : 'Merge Changes'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Task information component
function TaskInformation({ task }: { task: Task }) {
  const StatusIcon =
    statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;

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
          <div className="text-sm font-medium text-gray-700 mb-1">
            Description
          </div>
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
  );
}

// BDD scenarios section component
function BDDScenariosSection({ taskId, task, scenarioHandlers }: {
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
function ValidationRunsSection({ validationRuns }: {
  validationRuns: ValidationRunData[];
}) {
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
  );
}

// Error state component
function TaskNotFound({ navigate }: { navigate: (path: string) => void }) {
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
  const mergeChangesMutation = useMergeChanges(taskId, task);
  const queryClient = useQueryClient();

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: () => taskApi.updateTask(taskId!, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      alert('✅ Task marked as completed!');
    },
    onError: (error) => {
      console.error('Failed to complete task:', error);
      alert('❌ Failed to complete task. Please check the console for details.');
    },
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
    stages: run.stages?.map(s => s.name).join(', '),
  }));

  return (
    <div className="p-6 space-y-6">
      <TaskHeader navigate={navigate} task={task} mergeChangesMutation={mergeChangesMutation} completeTaskMutation={completeTaskMutation} />
      <TaskInformation task={task} />
      <TaskLogs executorId={task.executorId} />
      {task.executorId && <WorkerInfo executorId={task.executorId} />}
      <BDDScenariosSection taskId={taskId!} task={task} scenarioHandlers={scenarioHandlers} />
      <ValidationRunsSection validationRuns={validationRuns} />
    </div>
  );
}