import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Square,
  Activity,
  Terminal,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { orchestratorApi } from '../lib/orchestrator-api';
import { OrchestratorStreamViewer } from './OrchestratorStreamViewer';

interface ExecutePromptRequest {
  prompt: string;
  options?: {
    maxRetries?: number;
    maxTaskRetries?: number;
    validationTimeout?: number;
    enableValidation?: boolean;
  };
}

export function OrchestratorPanel() {
  const [isStreamVisible, setIsStreamVisible] = useState(false);
  const [executePrompt, setExecutePrompt] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const queryClient = useQueryClient();

  // Query orchestrator status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['orchestrator-status'],
    queryFn: orchestratorApi.getStatus,
    refetchInterval: 2000,
  });

  // Query orchestrator metrics
  const { data: metrics } = useQuery({
    queryKey: ['orchestrator-metrics'],
    queryFn: () => orchestratorApi.getMetrics(),
    refetchInterval: 10000, // Less frequent for metrics
  });

  // Start orchestrator mutation
  const startMutation = useMutation({
    mutationFn: orchestratorApi.start,
    onSuccess: data => {
      if (data.data?.sessionId) {
        setSessionId(data.data.sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ['orchestrator-status'] });
    },
  });

  // Stop orchestrator mutation
  const stopMutation = useMutation({
    mutationFn: orchestratorApi.stop,
    onSuccess: () => {
      setSessionId(undefined);
      queryClient.invalidateQueries({ queryKey: ['orchestrator-status'] });
    },
  });

  // Execute prompt mutation
  const executeMutation = useMutation({
    mutationFn: (request: ExecutePromptRequest) => orchestratorApi.executePrompt(request),
    onSuccess: () => {
      setExecutePrompt('');
      queryClient.invalidateQueries({ queryKey: ['orchestrator-metrics'] });
    },
  });

  // Update sessionId when status changes
  useEffect(() => {
    if (status?.sessionId && !sessionId) {
      setSessionId(status.sessionId);
    }
  }, [status?.sessionId, sessionId]);

  const handleStart = () => {
    startMutation.mutate({
      options: {
        enableValidation: true,
        maxRetries: 3,
        maxTaskRetries: 2,
      },
    });
  };

  const handleStop = () => {
    stopMutation.mutate();
  };

  const handleExecutePrompt = () => {
    if (!executePrompt.trim()) {
      return;
    }

    executeMutation.mutate({
      prompt: executePrompt,
      options: {
        maxTaskRetries: 2,
        enableValidation: true,
        validationTimeout: 300000,
      },
    });
  };

  const handleQuickPrompt = (prompt: string) => {
    setExecutePrompt(prompt);
  };

  const quickPrompts = [
    'Create a simple test file called test.txt with "Hello, World!" content',
    'Fix any TypeScript errors in the codebase',
    'Run npm run lint and fix any linting issues',
    'Check the database connection and display the status',
  ];

  return (
    <div className="space-y-6">
      {/* Status and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Claude Task Orchestrator
            {status?.isRunning && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Running
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 ${status?.isRunning ? 'text-green-600' : 'text-gray-600'}`}>
                  {statusLoading ? 'Loading...' : status?.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div>
                <span className="font-medium">Validation:</span>
                <span className="ml-2">{status?.enableValidation ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span className="font-medium">Max Retries:</span>
                <span className="ml-2">{status?.maxTaskRetries || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Session:</span>
                <span className="ml-2 text-xs text-gray-500 font-mono">
                  {sessionId?.split('-').slice(-1)[0] || 'N/A'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {status?.isRunning ? (
                <Button
                  onClick={handleStop}
                  disabled={stopMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Orchestrator
                </Button>
              ) : (
                <Button onClick={handleStart} disabled={startMutation.isPending} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start Orchestrator
                </Button>
              )}

              <Button
                onClick={() => setIsStreamVisible(!isStreamVisible)}
                variant="outline"
                size="sm"
              >
                <Terminal className="h-4 w-4 mr-2" />
                {isStreamVisible ? 'Hide Stream' : 'Show Stream'}
              </Button>

              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['orchestrator-status'] })}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.summary.successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Tasks Processed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.summary.tasksProcessed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Validation Runs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.summary.totalValidationRuns}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(metrics.summary.averageDuration / 1000)}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execute Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execute Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Actions */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    onClick={() => handleQuickPrompt(prompt)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {prompt.length > 40 ? `${prompt.substring(0, 40)}...` : prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <textarea
                value={executePrompt}
                onChange={e => setExecutePrompt(e.target.value)}
                placeholder="Enter a prompt for Claude to execute..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                This will create a new task and execute it with validation.
              </p>
              <Button
                onClick={handleExecutePrompt}
                disabled={!executePrompt.trim() || executeMutation.isPending}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Execute Prompt
              </Button>
            </div>

            {executeMutation.isError && (
              <div className="text-sm text-red-600">
                Failed to execute prompt. Please check your connection and try again.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stream Viewer */}
      {isStreamVisible && (
        <OrchestratorStreamViewer sessionId={sessionId} onClose={() => setIsStreamVisible(false)} />
      )}
    </div>
  );
}
