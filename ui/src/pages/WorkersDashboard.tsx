import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Terminal,
} from 'lucide-react';
import { Button } from '../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/ui/card';
import { PageLoading } from '../shared/ui/loading';
import { claudeWorkersApi } from '../shared/lib/api';
import LogsViewer from '../features/logs/components/LogsViewer';
import { WorkerCard } from '../features/workers/components/WorkerCard';
import { ValidationRunsViewer } from '../features/validation/components/ValidationRunsViewer';
import { BlockedCommandsViewer } from '../features/permissions/components/BlockedCommandsViewer';
import type { UnifiedLogEntry } from '../shared/types/logs';

// Constants
const AUTO_REFRESH_INTERVAL_MS = 2000;
const LOG_PROCESSING_INTERVALS = {
  BASE_INTERVAL_MS: 1000,
  LINE_INTERVAL_MS: 100,
  START_OFFSET_MS: 1000
};

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
}

interface WorkersStatusResponse {
  workers: WorkerStatus[];
  activeCount: number;
  totalCount: number;
  totalBlockedCommands: number;
}

interface WorkerLogsResponse {
  workerId: string;
  logs: string;
  logFile: string;
}

interface LogViewerProps {
  workerId: string;
  onClose: () => void;
}

function LogViewer({ workerId, onClose }: LogViewerProps) {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data: logsData } = useQuery<WorkerLogsResponse>({
    queryKey: ['worker-logs', workerId],
    queryFn: () => claudeWorkersApi.getWorkerLogs(workerId),
    refetchInterval: isAutoRefresh ? AUTO_REFRESH_INTERVAL_MS : false,
  });

  // Process logs into UnifiedLogEntry format to match TaskDetail
  const logEntries = React.useMemo(() => {
    if (!logsData?.logs) {
      return [];
    }

    const lines = logsData.logs
      .split('\n')
      .filter((line: string) => line.trim());
    const entries: UnifiedLogEntry[] = [];
    const baseTimestamp = Date.now() - lines.length * LOG_PROCESSING_INTERVALS.BASE_INTERVAL_MS;

    // Add process start entry for consistency
    entries.push({
      id: `${workerId}-start`,
      ts: baseTimestamp - LOG_PROCESSING_INTERVALS.START_OFFSET_MS,
      processId: workerId,
      processName: `claude-worker`,
      channel: 'process_start',
      payload: {
        processId: workerId,
        runReason: 'claude-code-worker',
        startedAt: new Date(baseTimestamp).toISOString(),
        status: 'running',
      },
    });

    // Process each log line
    lines.forEach((line: string, index: number) => {
      const timestamp = baseTimestamp + index * LOG_PROCESSING_INTERVALS.LINE_INTERVAL_MS;

      if (
        line.includes('[ERROR]') ||
        line.includes('ERROR:') ||
        line.toLowerCase().includes('error')
      ) {
        entries.push({
          id: `log-${workerId}-${index}`,
          ts: timestamp,
          processId: workerId,
          processName: 'claude-worker',
          channel: 'stderr',
          payload: line,
        });
      } else if (
        line.includes('🤖') ||
        line.includes('assistant:') ||
        line.includes('Claude:')
      ) {
        entries.push({
          id: `log-${workerId}-${index}`,
          ts: timestamp,
          processId: workerId,
          processName: 'claude-worker',
          channel: 'normalized',
          payload: {
            entry_type: { type: 'assistant_message' },
            content: line
              .replace(/^🤖\s*/, '')
              .replace(/^assistant:\s*/i, '')
              .replace(/^Claude:\s*/i, ''),
            timestamp: new Date(timestamp).toISOString(),
          },
        });
      } else {
        entries.push({
          id: `log-${workerId}-${index}`,
          ts: timestamp,
          processId: workerId,
          processName: 'claude-worker',
          channel: 'stdout',
          payload: line,
        });
      }
    });

    return entries.sort((a, b) => a.ts - b.ts);
  }, [logsData, workerId]);

  return (
    <Card className="h-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Worker Logs - {workerId.split('-').pop()}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={autoScroll ? 'default' : 'outline'}
              onClick={() => setAutoScroll(!autoScroll)}
              className="flex items-center space-x-1"
            >
              <span>{autoScroll ? 'Auto' : 'Manual'}</span>
            </Button>
            <Button
              size="sm"
              variant={isAutoRefresh ? 'default' : 'outline'}
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${isAutoRefresh ? 'animate-spin' : ''}`} />
              <span>{isAutoRefresh ? 'Live' : 'Paused'}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-900 dark:bg-gray-900 text-gray-100 dark:text-gray-100 rounded overflow-hidden">
          <LogsViewer
            entries={logEntries}
            followOutput={autoScroll}
            className="h-full"
            useVibeLogComponent={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Custom hook for worker mutations
function useWorkerMutations(queryClient: { invalidateQueries: (query: { queryKey: string[] }) => void }) {
  const stopWorkerMutation = useMutation({
    mutationFn: claudeWorkersApi.stopWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-status'] });
    },
    onError: error => {
      console.error('Failed to stop worker:', error);
      alert('Failed to stop worker. Please check the console for details.');
    },
  });

  const mergeWorktreeMutation = useMutation({
    mutationFn: claudeWorkersApi.mergeWorktree,
    onSuccess: data => {
      alert(
        `Successfully merged changes from ${data.workerId}${data.hasChanges ? ' with changes committed' : ' (no changes to commit)'}`
      );
      queryClient.invalidateQueries({ queryKey: ['workers-status'] });
    },
    onError: error => {
      console.error('Failed to merge worktree:', error);
      alert('Failed to merge worktree. Please check the console for details.');
    },
  });

  const openVSCodeMutation = useMutation({
    mutationFn: claudeWorkersApi.openVSCode,
    onSuccess: data => {
      alert(`VSCode opened for worktree: ${data.worktreePath}`);
    },
    onError: error => {
      console.error('Failed to open VSCode:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('VSCode command line tools')) {
        alert(
          'VSCode command line tools not found. Please install VSCode and enable shell command integration from the Command Palette.'
        );
      } else {
        alert(`Failed to open VSCode: ${errorMessage}`);
      }
    },
  });

  return { stopWorkerMutation, mergeWorktreeMutation, openVSCodeMutation };
}

// Worker action handlers
function useWorkerActions(
  navigate: (path: string) => void,
  mutations: {
    stopWorkerMutation: { mutate: (workerId: string) => void };
    mergeWorktreeMutation: { mutate: (workerId: string) => void };
    openVSCodeMutation: { mutate: (workerId: string) => void };
  },
  setters: {
    setSelectedBlockedWorkerId: (id: string) => void;
    setSelectedValidationWorkerId: (id: string) => void;
  }
) {
  const handleViewLogs = (workerId: string) => {
    navigate(`/workers/${workerId}`);
  };

  const handleStopWorker = (workerId: string) => {
    if (confirm('Are you sure you want to stop this worker?')) {
      mutations.stopWorkerMutation.mutate(workerId);
    }
  };

  const handleMergeWorktree = (workerId: string) => {
    if (confirm('Are you sure you want to merge the worktree changes to the main branch?')) {
      mutations.mergeWorktreeMutation.mutate(workerId);
    }
  };

  const handleOpenVSCode = (workerId: string) => {
    mutations.openVSCodeMutation.mutate(workerId);
  };

  const handleViewBlockedCommands = (workerId: string) => {
    setters.setSelectedBlockedWorkerId(workerId);
  };

  const handleViewValidationRuns = (workerId: string) => {
    setters.setSelectedValidationWorkerId(workerId);
  };

  return {
    handleViewLogs,
    handleStopWorker,
    handleMergeWorktree,
    handleOpenVSCode,
    handleViewBlockedCommands,
    handleViewValidationRuns,
  };
}

// Dashboard header component
function DashboardHeader({ queryClient }: { queryClient: { invalidateQueries: (query: { queryKey: string[] }) => void } }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Claude Code Workers</h1>
        <p className="text-gray-600">Monitor and manage Claude Code worker processes</p>
      </div>
      <Button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['workers-status'] })}
        className="flex items-center space-x-2"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Refresh</span>
      </Button>
    </div>
  );
}

// Stats card component
function StatsCard({ icon: Icon, iconColor, title, value }: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <Icon className={`h-8 w-8 ${iconColor}`} />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stats cards component
function StatsCards({ workersData }: { workersData: WorkersStatusResponse | undefined }) {
  const workers = workersData?.workers || [];
  const activeCount = workersData?.activeCount || 0;
  const totalCount = workersData?.totalCount || 0;
  const totalBlockedCommands = workersData?.totalBlockedCommands || 0;
  
  const successRate = totalCount > 0
    ? Math.round((workers.filter(w => w.status === 'completed').length / totalCount) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatsCard icon={Zap} iconColor="text-blue-600" title="Active Workers" value={activeCount} />
      <StatsCard icon={Terminal} iconColor="text-green-600" title="Total Workers" value={totalCount} />
      <StatsCard icon={CheckCircle} iconColor="text-purple-600" title="Success Rate" value={`${successRate}%`} />
      <StatsCard icon={XCircle} iconColor="text-red-600" title="Blocked Commands" value={totalBlockedCommands} />
    </div>
  );
}

// Workers list component
function WorkersList({ workers, actions }: {
  workers: WorkerStatus[];
  actions: {
    handleViewLogs: (workerId: string) => void;
    handleStopWorker: (workerId: string) => void;
    handleMergeWorktree: (workerId: string) => void;
    handleOpenVSCode: (workerId: string) => void;
    handleViewBlockedCommands: (workerId: string) => void;
    handleViewValidationRuns: (workerId: string) => void;
  };
}) {
  if (workers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Terminal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers</h3>
          <p className="text-gray-600">
            No Claude Code workers are currently running. Start a worker from the task board to
            see it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {workers.map(worker => (
        <WorkerCard
          key={worker.id}
          worker={worker}
          onViewLogs={actions.handleViewLogs}
          onStopWorker={actions.handleStopWorker}
          onMergeWorktree={actions.handleMergeWorktree}
          onOpenVSCode={actions.handleOpenVSCode}
          onViewBlockedCommands={actions.handleViewBlockedCommands}
          onViewValidationRuns={actions.handleViewValidationRuns}
        />
      ))}
    </div>
  );
}

// Modal components
function DashboardModals({ selections, setters }: {
  selections: {
    selectedWorkerId: string | null;
    selectedBlockedWorkerId: string | null;
    selectedValidationWorkerId: string | null;
  };
  setters: {
    setSelectedWorkerId: (id: string | null) => void;
    setSelectedBlockedWorkerId: (id: string | null) => void;
    setSelectedValidationWorkerId: (id: string | null) => void;
  };
}) {
  return (
    <>
      {selections.selectedWorkerId && (
        <LogViewer workerId={selections.selectedWorkerId} onClose={() => setters.setSelectedWorkerId(null)} />
      )}
      {selections.selectedBlockedWorkerId && (
        <BlockedCommandsViewer
          workerId={selections.selectedBlockedWorkerId}
          onClose={() => setters.setSelectedBlockedWorkerId(null)}
        />
      )}
      {selections.selectedValidationWorkerId && (
        <ValidationRunsViewer
          workerId={selections.selectedValidationWorkerId}
          onClose={() => setters.setSelectedValidationWorkerId(null)}
        />
      )}
    </>
  );
}

// Error state component
function WorkersError() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Workers</h2>
          <p className="text-gray-600">Could not load worker status</p>
        </div>
      </div>
    </div>
  );
}

export function WorkersDashboard() {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedBlockedWorkerId, setSelectedBlockedWorkerId] = useState<string | null>(null);
  const [selectedValidationWorkerId, setSelectedValidationWorkerId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch workers status
  const {
    data: workersData,
    isLoading,
    error,
  } = useQuery<WorkersStatusResponse>({
    queryKey: ['workers-status'],
    queryFn: claudeWorkersApi.getWorkersStatus,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const mutations = useWorkerMutations(queryClient);
  const setters = { setSelectedBlockedWorkerId, setSelectedValidationWorkerId };
  const actions = useWorkerActions(navigate, mutations, setters);

  const selections = {
    selectedWorkerId,
    selectedBlockedWorkerId,
    selectedValidationWorkerId,
  };

  const modalSetters = {
    setSelectedWorkerId,
    setSelectedBlockedWorkerId,
    setSelectedValidationWorkerId,
  };

  if (isLoading) {
    return <PageLoading message="Loading workers..." />;
  }

  if (error) {
    return <WorkersError />;
  }

  const workers = workersData?.workers || [];

  return (
    <div className="p-6 space-y-6">
      <DashboardHeader queryClient={queryClient} />
      <StatsCards workersData={workersData} />
      <DashboardModals selections={selections} setters={modalSetters} />
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workers ({workers.length})</h2>
        <WorkersList workers={workers} actions={actions} />
      </div>
    </div>
  );
}