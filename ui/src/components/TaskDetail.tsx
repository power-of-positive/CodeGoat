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
  ChevronUp,
  ChevronDown,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { taskApi } from '../lib/api';
import { BDDScenarioManager } from './BDDScenarioManager';
import { BDDScenario } from '../../shared/types';
import LogEntryRow from './logs/LogEntryRow';
import { useProcessesLogs } from '../hooks/useProcessesLogs';
import DisplayConversationEntry from './logs/DisplayConversationEntry';
import type { NormalizedEntry } from '../../shared/types';

// Priority colors
const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300'
} as const;

// Status colors and icons
const statusConfig = {
  pending: {
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: AlertCircle,
    label: 'Pending'
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Play,
    label: 'In Progress'
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    label: 'Completed'
  }
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
  const successRate = stages.length > 0 ? 
    Math.round((stages.filter((s) => s.success).length / stages.length) * 100) : 0;

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
              <span className="text-green-600">{stages.filter((s) => s.success).length}</span>
              /
              <span className="text-red-600">{stages.filter((s) => !s.success).length}</span>
            </div>
          </div>
        </div>

        {stages.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-2">Stages</div>
            <div className="space-y-1">
              {stages.slice(0, 3).map((stage, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
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


// Task logs viewer component
interface TaskLogsProps {
  taskId: string;
}

function TaskLogs({ taskId }: TaskLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const listRef = useRef<VariableSizeListType>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerRef, bounds] = useMeasure();

  // Mock execution processes for this task - replace with actual API call
  const mockProcesses = [
    {
      id: `process-${taskId}-1`,
      task_attempt_id: taskId,
      run_reason: 'setupscript',
      status: 'completed',
      started_at: new Date(Date.now() - 10000).toISOString(),
      completed_at: new Date(Date.now() - 5000).toISOString(),
    },
    {
      id: `process-${taskId}-2`,
      task_attempt_id: taskId,
      run_reason: 'codingagent',
      status: 'running',
      started_at: new Date(Date.now() - 3000).toISOString(),
    }
  ];

  // Use the enhanced logging hook
  const { entries: logEntries, isLoading, error } = useProcessesLogs(mockProcesses, autoRefresh);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Task Logs
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={autoScroll ? "default" : "outline"}
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
              variant={autoRefresh ? "default" : "outline"}
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
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            Error loading logs: {error}
          </div>
        )}
        <div ref={containerRef} className="h-64 bg-gray-900 text-green-400 rounded">
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

                // Pass the UnifiedLogEntry for enhanced processing
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
              {isLoading ? 'Loading logs...' : 
               logEntries.length === 0 ? 'No logs available for this task...' : 'No logs found'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Claude Code Interaction Demo Component
interface ClaudeCodeInteractionDemoProps {
  taskId: string;
}

function ClaudeCodeInteractionDemo({ taskId: _taskId }: ClaudeCodeInteractionDemoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock Claude Code conversation entries showing different types of interactions
  const mockConversationEntries: NormalizedEntry[] = [
    {
      timestamp: new Date(Date.now() - 30000).toISOString(),
      entry_type: { type: 'user_message' },
      content: 'Please implement enhanced logging functionality in the worker dashboard and task details components based on the example components provided.'
    },
    {
      timestamp: new Date(Date.now() - 29000).toISOString(),
      entry_type: { 
        type: 'tool_use',
        tool_name: 'TodoWrite',
        action_type: { action: 'plan_presentation', plan: 'Enhanced logging implementation plan' }
      },
      content: 'I\'ll create a comprehensive plan to implement enhanced logging functionality:\n\n1. **Examine example components** - Analyze the structure and functionality\n2. **Create log hooks** - Build useProcessesLogs hook for data management\n3. **Update components** - Enhance WorkersDashboard and TaskDetail with advanced log processing\n4. **Implement Claude Code response processing** - Add normalized conversation display'
    },
    {
      timestamp: new Date(Date.now() - 28000).toISOString(),
      entry_type: { 
        type: 'tool_use',
        tool_name: 'Read',
        action_type: { action: 'file_read', path: 'useful_logs_view_components/LogsTab.tsx' }
      },
      content: 'Reading the enhanced LogsTab component to understand the virtualized scrolling implementation and UnifiedLogEntry structure...'
    },
    {
      timestamp: new Date(Date.now() - 26000).toISOString(),
      entry_type: { type: 'assistant_message' },
      content: 'I can see this is a sophisticated logging system with:\n\n- **JSONL log processing** with structured data storage\n- **Multiple log channels**: stdout, stderr, normalized (Claude responses), process_start\n- **Virtualized scrolling** for performance with large log files\n- **Rich conversation display** with tool icons and action types\n\nLet me implement this enhanced system step by step.'
    },
    {
      timestamp: new Date(Date.now() - 25000).toISOString(),
      entry_type: { 
        type: 'tool_use',
        tool_name: 'Write',
        action_type: { action: 'file_write', path: 'ui/src/hooks/useProcessesLogs.ts' }
      },
      content: 'Creating enhanced logging hook with UnifiedLogEntry support and process management...'
    },
    {
      timestamp: new Date(Date.now() - 20000).toISOString(),
      entry_type: { 
        type: 'tool_use',
        tool_name: 'Edit',
        action_type: { action: 'file_write', path: 'ui/src/components/logs/LogEntryRow.tsx' }
      },
      content: 'Updating LogEntryRow to handle multiple log types including normalized conversation entries...'
    },
    {
      timestamp: new Date(Date.now() - 15000).toISOString(),
      entry_type: { 
        type: 'tool_use',
        tool_name: 'bash',
        action_type: { action: 'command_run', command: 'npm test' }
      },
      content: 'Running tests to ensure the enhanced logging components work correctly...'
    },
    {
      timestamp: new Date(Date.now() - 10000).toISOString(),
      entry_type: { type: 'assistant_message' },
      content: '✅ **Enhanced logging system successfully implemented!**\n\nKey features added:\n- **Structured log processing** with JSONL format\n- **Multi-channel support** for different log types\n- **Claude Code interaction display** with tool icons\n- **Performance optimizations** with virtualized scrolling\n- **Real-time log streaming** capabilities\n\nThe system now properly handles Claude Code responses, tool usage, and process execution logs in a unified, user-friendly interface.'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-600" />
            Claude Code Interaction
            <Badge variant="secondary">Demo</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Expand Conversation
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600 mb-4">
          This demonstrates how Claude Code interactions are processed and displayed with rich formatting,
          tool usage indicators, and structured conversation flow.
        </div>
        
        {isExpanded ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg max-h-96 overflow-y-auto">
            {mockConversationEntries.map((entry, index) => (
              <DisplayConversationEntry
                key={index}
                entry={entry}
                index={index}
                diffDeletable={false}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-medium">User:</span>
              <span className="truncate">Please implement enhanced logging functionality...</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-2">
              <Bot className="h-4 w-4 text-green-600" />
              <span className="font-medium">Claude:</span>
              <span className="truncate">Enhanced logging system successfully implemented!</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {mockConversationEntries.length} conversation entries • Click expand to view all
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: taskResponse, isLoading, error } = useQuery({
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
    mutationFn: ({ id, scenario }: { id: string; scenario: Partial<BDDScenario> }) =>
      taskApi.updateTaskScenario(taskId!, id, scenario),
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">The task you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const task = taskResponse;
  const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;
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
              <Badge className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                {task.priority}
              </Badge>
              <Badge className={`text-xs ${statusConfig[task.status as keyof typeof statusConfig]?.color}`}>
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
                <div className="text-sm font-medium text-gray-700">Completed</div>
                <div className="text-sm text-gray-600">
                  {new Date(task.endTime).toLocaleString()}
                </div>
              </div>
            )}
            
            {task.duration && (
              <div>
                <div className="text-sm font-medium text-gray-700">Duration</div>
                <div className="text-sm text-gray-600">{task.duration}</div>
              </div>
            )}
          </div>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Validation Runs</h3>
              <p className="text-gray-600">
                This task hasn't had any validation runs yet. 
                Validation runs will appear here when the task is validated.
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

      {/* Task Logs */}
      <TaskLogs taskId={taskId!} />

      {/* Claude Code Interaction Demo */}
      <ClaudeCodeInteractionDemo taskId={taskId!} />

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
    </div>
  );
}