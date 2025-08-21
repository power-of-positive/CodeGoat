import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  Play,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { taskApi } from '../lib/api';
import { BDDScenarioManager } from './BDDScenarioManager';
import { BDDScenario } from '../../shared/types';
import { ValidationRunCard } from './ValidationRunCard';
import { TaskLogs } from './TaskLogs';
import { WorkerInfo } from './WorkerInfo';

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