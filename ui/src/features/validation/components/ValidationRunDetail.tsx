import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { analyticsApi, taskApi } from '../../../shared/lib/api';
import { ValidationRun, ValidationStageResult } from '../../../shared/types/index';

// Task type with different validation run format (from backend)
interface TaskWithValidationRuns {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  taskType: 'story' | 'task';
  startTime?: string;
  endTime?: string;
  duration?: string;
  bddScenarios?: Array<{ id: string; name: string; status: string; }>;
  executorId?: string;
  validationRuns?: Array<{
    id: string;
    timestamp: string;
    success: boolean;
    duration: number;
    stages?: string; // JSON stringified ValidationStageResult[]
  }>;
}

// Component for stage detail with expanded logs view
function StageDetailExpanded({ stage }: { stage: ValidationStageResult }) {
  const [showLogs, setShowLogs] = React.useState(false);
  const hasOutput = stage.output && stage.output.trim().length > 0;
  const hasError = stage.error && stage.error.trim().length > 0;
  const hasLogs = hasOutput || hasError;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {stage.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <h3 className="font-medium text-gray-900">
                {stage.name || stage.id}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span
                  className={stage.success ? 'text-green-600' : 'text-red-600'}
                >
                  {stage.success ? 'PASSED' : 'FAILED'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(stage.duration / 1000).toFixed(1)}s
                </span>
                {stage.attempt && stage.attempt > 1 && (
                  <span>Attempt {stage.attempt}</span>
                )}
              </div>
            </div>
          </div>
          {hasLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {showLogs ? 'Hide Logs' : 'Show Logs'}
              {showLogs ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {showLogs && hasLogs && (
        <CardContent className="pt-0">
          {hasError && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 mb-2">
                Error Output:
              </h4>
              <pre className="text-sm bg-red-50 text-red-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {stage.error}
              </pre>
            </div>
          )}

          {hasOutput && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {hasError ? 'Standard Output:' : 'Output:'}
              </h4>
              <pre className="text-sm bg-gray-50 text-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {stage.output}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function ValidationRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  // First try to get from analytics API
  const {
    data: analyticsRuns,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery<ValidationRun[]>({
    queryKey: ['validation-runs'],
    queryFn: () => analyticsApi.getValidationRuns(),
  });

  // If not found in analytics, try all tasks to find the run
  const {
    data: allTasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery<TaskWithValidationRuns[]>({
    queryKey: ['all-tasks'],
    queryFn: () => taskApi.getTasks() as unknown as Promise<TaskWithValidationRuns[]>,
    enabled: !analyticsLoading && !analyticsRuns?.find((r) => r.id === runId),
  });

  const isLoading = analyticsLoading || tasksLoading;
  const error = analyticsError || tasksError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            Loading validation run details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load
          </h2>
          <p className="text-gray-600 mb-4">
            Could not load validation run details
          </p>
          <Button onClick={() => navigate('/analytics')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
        </div>
      </div>
    );
  }

  // First check analytics runs
  let run = analyticsRuns?.find((r) => r.id === runId);
  let taskContext = null;

  // If not found in analytics, check task validation runs
  if (!run && allTasks) {
    for (const task of allTasks) {
      if (task.validationRuns) {
        const taskRun = task.validationRuns.find((r) => r.id === runId);
        if (taskRun) {
          // Convert task validation run to ValidationRun format
          const stages = taskRun.stages ? JSON.parse(taskRun.stages) : [];
          run = {
            id: taskRun.id,
            timestamp: taskRun.timestamp,
            success: taskRun.success,
            duration: taskRun.duration,
            stages: stages,
          };
          taskContext = {
            taskId: task.id,
            taskContent: task.content,
          };
          break;
        }
      }
    }
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Run Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The validation run with ID "{runId}" could not be found.
          </p>
          <Button onClick={() => navigate('/analytics')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
        </div>
      </div>
    );
  }

  const successfulStages = run.stages.filter((stage) => stage.success).length;
  const failedStages = run.stages.length - successfulStages;
  const runDate = new Date(run.timestamp);

  return (
    <div className="p-6">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate(taskContext ? `/tasks/${taskContext.taskId}` : '/analytics')}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {taskContext ? 'Back to Task' : 'Back to Analytics'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Validation Run Details
            </h1>
            <p className="text-gray-600">
              Run ID: {run.id} • {runDate.toLocaleString()}
            </p>
            {taskContext && (
              <p className="text-sm text-blue-600 mt-1">
                Task: {taskContext.taskContent.slice(0, 100)}
                {taskContext.taskContent.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {run.success ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500" />
            )}
            <span className={run.success ? 'text-green-700' : 'text-red-700'}>
              {run.success ? 'Validation Passed' : 'Validation Failed'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-900">
                {run.stages.length}
              </div>
              <div className="text-sm text-gray-600">Total Stages</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {successfulStages}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">
                {failedStages}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {(run.duration ? run.duration / 1000 : 0).toFixed(1)}s
              </div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stages List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Stage Details ({run.stages.length} stages)
        </h2>
        <div className="space-y-4">
          {run.stages.map((stage, index) => (
            <StageDetailExpanded key={`${stage.id}-${index}`} stage={stage} />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
