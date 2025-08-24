import React, { useState } from 'react';
import {
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Terminal,
  GitMerge,
  Code2,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';

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

interface WorkerCardProps {
  worker: WorkerStatus;
  onViewLogs: (workerId: string) => void;
  onStopWorker: (workerId: string) => void;
  onMergeWorktree: (workerId: string) => void;
  onOpenVSCode: (workerId: string) => void;
  onViewBlockedCommands: (workerId: string) => void;
  onViewValidationRuns: (workerId: string) => void;
}

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
  validating: XCircle,
  completed: CheckCircle,
  failed: XCircle,
  stopped: Square,
} as const;

export function WorkerCard({
  worker,
  onViewLogs,
  onStopWorker,
  onMergeWorktree,
  onOpenVSCode,
  onViewBlockedCommands,
  onViewValidationRuns,
}: WorkerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = statusIcons[worker.status];

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div
          className="cursor-pointer -m-6 p-6 rounded-lg"
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
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-50 border-orange-300 text-orange-700"
                >
                  ⚠️ Validation Failed
                </Badge>
              )}
              {worker.validationPassed === true && worker.status === 'completed' && (
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 border-green-300 text-green-700"
                >
                  ✅ Validated
                </Badge>
              )}
              {worker.validationRuns && worker.validationRuns > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 border-purple-300 text-purple-700"
                >
                  🔍 {worker.validationRuns} validation{worker.validationRuns > 1 ? 's' : ''}
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
                <p className="text-gray-600">{new Date(worker.startTime).toLocaleString()}</p>
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
                <span>Details</span>
              </Button>

              {worker.status === 'running' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStopWorker(worker.id)}
                  className="flex items-center space-x-1 text-red-600"
                >
                  <Square className="h-3 w-3" />
                  <span>Stop</span>
                </Button>
              )}

              {(worker.status === 'completed' || worker.status === 'stopped') &&
                worker.validationPassed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMergeWorktree(worker.id)}
                    className="flex items-center space-x-1 text-green-600"
                  >
                    <GitMerge className="h-3 w-3" />
                    <span>Merge</span>
                  </Button>
                )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenVSCode(worker.id)}
                className="flex items-center space-x-1 text-blue-600"
              >
                <Code2 className="h-3 w-3" />
                <span>VSCode</span>
              </Button>

              {worker.blockedCommands > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewBlockedCommands(worker.id)}
                  className="flex items-center space-x-1 text-orange-600"
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Blocked ({worker.blockedCommands})</span>
                </Button>
              )}

              {worker.validationRuns && worker.validationRuns > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewValidationRuns(worker.id)}
                  className="flex items-center space-x-1 text-purple-600"
                >
                  <FileCheck className="h-3 w-3" />
                  <span>Validations ({worker.validationRuns})</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}