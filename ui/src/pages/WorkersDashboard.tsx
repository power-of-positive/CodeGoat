import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VariableSizeList } from 'react-window';
import type { VariableSizeList as VariableSizeListType } from 'react-window';
import useMeasure from 'react-use-measure';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  ChevronDown,
  ChevronRight,
  Pause,
  GitMerge,
  Code2,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { claudeWorkersApi } from '../lib/api';
import LogEntryRow from '../components/logs/LogEntryRow';

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

interface WorkerCardProps {
  worker: WorkerStatus;
  onViewLogs: (workerId: string) => void;
  onStopWorker: (workerId: string) => void;
  onMergeWorktree: (workerId: string) => void;
  onOpenVSCode: (workerId: string) => void;
  onViewBlockedCommands: (workerId: string) => void;
}

function WorkerCard({ worker, onViewLogs, onStopWorker, onMergeWorktree, onOpenVSCode, onViewBlockedCommands }: WorkerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = statusIcons[worker.status];
  
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

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div 
          className="cursor-pointer hover:bg-gray-50 -m-6 p-6 rounded-lg"
          onClick={() => setIsExpanded(!isExpanded)}
        >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <StatusIcon className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-sm font-medium">
                Worker {worker.id.split('-').pop()}
              </CardTitle>
              <p className="text-xs text-gray-500">{worker.taskId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs ${statusStyles[worker.status]}`}>
              {worker.status.toUpperCase()}
            </Badge>
            {worker.pid && (
              <Badge variant="outline" className="text-xs">
                PID: {worker.pid}
              </Badge>
            )}
            {worker.blockedCommands > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 border-red-300 text-red-700">
                🚫 {worker.blockedCommands} blocked
              </Badge>
            )}
            {worker.validationPassed === false && worker.status === 'failed' && (
              <Badge variant="outline" className="text-xs bg-orange-50 border-orange-300 text-orange-700">
                ⚠️ Validation Failed
              </Badge>
            )}
            {worker.validationPassed === true && worker.status === 'completed' && (
              <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                ✅ Validated
              </Badge>
            )}
          </div>
        </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Task Content */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Task:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                {worker.taskContent}
              </p>
            </div>
            
            {/* Timing Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Started:</p>
                <p className="text-gray-600">
                  {new Date(worker.startTime).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Duration:</p>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <p className="text-gray-600">
                    {formatDuration(worker.startTime, worker.endTime)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Log File Path */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Log File:</p>
              <p className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded">
                {worker.logFile}
              </p>
            </div>
            
            {/* Permission System Status */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Permission System:</p>
                <div className="flex items-center space-x-1">
                  {worker.hasPermissionSystem ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <p className="text-green-600">Active</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-red-600" />
                      <p className="text-red-600">Inactive</p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-700">Blocked Commands:</p>
                <p className={`${worker.blockedCommands > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {worker.blockedCommands}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewLogs(worker.id)}
                className="flex items-center space-x-1"
              >
                <Terminal className="h-3 w-3" />
                <span>View Logs</span>
              </Button>
              
              {worker.status === 'running' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStopWorker(worker.id)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Square className="h-3 w-3" />
                  <span>Stop</span>
                </Button>
              )}
              
              {(worker.status === 'completed' || worker.status === 'stopped') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMergeWorktree(worker.id)}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <GitMerge className="h-3 w-3" />
                  <span>Merge</span>
                </Button>
              )}
              
              {(worker.status === 'completed' || worker.status === 'stopped' || worker.status === 'running') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenVSCode(worker.id)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Code2 className="h-3 w-3" />
                  <span>VSCode</span>
                </Button>
              )}
              
              {worker.blockedCommands > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewBlockedCommands(worker.id)}
                  className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Blocked ({worker.blockedCommands})</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface LogViewerProps {
  workerId: string;
  onClose: () => void;
}

function LogViewer({ workerId, onClose }: LogViewerProps) {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<VariableSizeListType>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerRef, bounds] = useMeasure();

  const { data: logsData } = useQuery<WorkerLogsResponse>({
    queryKey: ['worker-logs', workerId],
    queryFn: () => claudeWorkersApi.getWorkerLogs(workerId),
    refetchInterval: isAutoRefresh ? 2000 : false, // Refresh every 2 seconds
  });

  // Process logs into structured format
  const processedLogs = React.useMemo(() => {
    if (!logsData?.logs) return [];
    
    const logLines = logsData.logs.split('\n').filter(line => line.trim());
    return logLines.map((line, index) => ({
      id: `log-${workerId}-${index}`,
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      content: line,
      workerId,
    }));
  }, [logsData, workerId]);

  const rowHeights = useRef<Record<number, number>>({});

  const getRowHeight = useCallback((index: number): number => {
    const h = rowHeights.current[index];
    return h !== undefined ? h : 24; // Default height for log lines
  }, []);

  const setRowHeight = useCallback((index: number, size: number) => {
    listRef.current?.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && processedLogs.length > 0 && listRef.current) {
      listRef.current.scrollToItem(processedLogs.length - 1, 'end');
    }
  }, [processedLogs.length, autoScroll]);

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
    <Card className="h-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Worker Logs - {workerId.split('-').pop()}
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
              variant={isAutoRefresh ? "default" : "outline"}
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
        <div ref={containerRef} className="h-64 bg-black text-green-400 rounded">
          {bounds.height && bounds.width && processedLogs.length > 0 ? (
            <VariableSizeList
              ref={listRef}
              innerRef={innerRef}
              height={bounds.height}
              width={bounds.width}
              itemCount={processedLogs.length}
              itemSize={getRowHeight}
              onScroll={onScroll}
              itemData={processedLogs}
            >
              {({ index, style, data }) => {
                const styleWithPadding = { ...style };
                if (index === processedLogs.length - 1) {
                  styleWithPadding.paddingBottom = '20px';
                }

                // Pass the raw log content as string for backwards compatibility
                return (
                  <LogEntryRow
                    entry={data[index].content}
                    index={index}
                    style={styleWithPadding}
                    setRowHeight={setRowHeight}
                  />
                );
              }}
            </VariableSizeList>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              {processedLogs.length === 0 ? 'No logs available yet...' : 'Loading logs...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BlockedCommandsViewerProps {
  workerId: string;
  onClose: () => void;
}

function BlockedCommandsViewer({ workerId, onClose }: BlockedCommandsViewerProps) {
  const { data: blockedData, isLoading } = useQuery({
    queryKey: ['worker-blocked-commands', workerId],
    queryFn: () => claudeWorkersApi.getBlockedCommands(workerId),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            Blocked Commands - {workerId.split('-').pop()}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-600">Loading blocked commands...</div>
          </div>
        ) : (
          <div>
            {blockedData && blockedData.blockedCommandsList.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  Total blocked commands: <span className="font-semibold text-orange-600">{blockedData.blockedCommands}</span>
                  {!blockedData.hasPermissionSystem && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Permission system disabled
                    </span>
                  )}
                </div>
                {blockedData.blockedCommandsList.map((blocked, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono text-sm text-red-800 bg-red-100 px-2 py-1 rounded">
                        {blocked.command}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(blocked.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-red-700 mb-1">
                      <strong>Reason:</strong> {blocked.reason}
                    </div>
                    {blocked.suggestion && (
                      <div className="text-sm text-gray-600">
                        <strong>Suggestion:</strong> {blocked.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldAlert className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600">No blocked commands</div>
                {blockedData && !blockedData.hasPermissionSystem && (
                  <div className="text-xs text-yellow-600 mt-2">
                    Permission system is not active for this worker
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkersDashboard() {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedBlockedWorkerId, setSelectedBlockedWorkerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch workers status
  const { data: workersData, isLoading, error } = useQuery<WorkersStatusResponse>({
    queryKey: ['workers-status'],
    queryFn: claudeWorkersApi.getWorkersStatus,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Stop worker mutation
  const stopWorkerMutation = useMutation({
    mutationFn: claudeWorkersApi.stopWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-status'] });
    },
    onError: (error) => {
      console.error('Failed to stop worker:', error);
      alert('Failed to stop worker. Please check the console for details.');
    },
  });

  // Merge worktree mutation
  const mergeWorktreeMutation = useMutation({
    mutationFn: claudeWorkersApi.mergeWorktree,
    onSuccess: (data) => {
      alert(`Successfully merged changes from ${data.workerId}${data.hasChanges ? ' with changes committed' : ' (no changes to commit)'}`);
      queryClient.invalidateQueries({ queryKey: ['workers-status'] });
    },
    onError: (error) => {
      console.error('Failed to merge worktree:', error);
      alert('Failed to merge worktree. Please check the console for details.');
    },
  });

  // Open VSCode mutation
  const openVSCodeMutation = useMutation({
    mutationFn: claudeWorkersApi.openVSCode,
    onSuccess: (data) => {
      alert(`VSCode opened for worktree: ${data.worktreePath}`);
    },
    onError: (error) => {
      console.error('Failed to open VSCode:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('VSCode command line tools')) {
        alert('VSCode command line tools not found. Please install VSCode and enable shell command integration from the Command Palette.');
      } else {
        alert(`Failed to open VSCode: ${errorMessage}`);
      }
    },
  });

  const handleViewLogs = (workerId: string) => {
    setSelectedWorkerId(workerId);
  };

  const handleStopWorker = (workerId: string) => {
    if (confirm('Are you sure you want to stop this worker?')) {
      stopWorkerMutation.mutate(workerId);
    }
  };

  const handleMergeWorktree = (workerId: string) => {
    if (confirm('Are you sure you want to merge the worktree changes to the main branch?')) {
      mergeWorktreeMutation.mutate(workerId);
    }
  };

  const handleOpenVSCode = (workerId: string) => {
    openVSCodeMutation.mutate(workerId);
  };

  const handleViewBlockedCommands = (workerId: string) => {
    setSelectedBlockedWorkerId(workerId);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading workers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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

  const workers = workersData?.workers || [];
  const activeCount = workersData?.activeCount || 0;
  const totalCount = workersData?.totalCount || 0;
  const totalBlockedCommands = workersData?.totalBlockedCommands || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Workers</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Terminal className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalCount > 0 
                    ? Math.round(((workers.filter(w => w.status === 'completed').length) / totalCount) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blocked Commands</p>
                <p className="text-2xl font-bold text-gray-900">{totalBlockedCommands}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log Viewer */}
      {selectedWorkerId && (
        <LogViewer 
          workerId={selectedWorkerId} 
          onClose={() => setSelectedWorkerId(null)} 
        />
      )}

      {/* Blocked Commands Viewer */}
      {selectedBlockedWorkerId && (
        <BlockedCommandsViewer 
          workerId={selectedBlockedWorkerId} 
          onClose={() => setSelectedBlockedWorkerId(null)} 
        />
      )}

      {/* Workers List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Workers ({workers.length})
        </h2>
        
        {workers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Terminal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers</h3>
              <p className="text-gray-600">
                No Claude Code workers are currently running. Start a worker from the task board to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            {workers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onViewLogs={handleViewLogs}
                onStopWorker={handleStopWorker}
                onMergeWorktree={handleMergeWorktree}
                onOpenVSCode={handleOpenVSCode}
                onViewBlockedCommands={handleViewBlockedCommands}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}