import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Play,
  AlertCircle,
  ExternalLink,
  Pause,
  GitMerge,
  Bot,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';

// Constants for ID parsing
const ID_DISPLAY_PARTS_COUNT = 2; // Number of parts to show from the end of hyphen-separated IDs

interface WorkerInfoProps {
  executorId: string;
}

// Status configuration
const STATUS_CONFIG = {
  starting: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  running: { color: 'bg-blue-100 text-blue-800', icon: Play },
  validating: { color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
  completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
  stopped: { color: 'bg-gray-100 text-gray-800', icon: Pause },
};

// Worker type definition
type WorkerData = {
  id: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'validating';
  startTime: string;
  pid?: number;
  validationPassed?: boolean;
  blockedCommands: number;
};

// Custom hook for worker data and mutation
function useWorkerData(executorId: string) {
  const queryClient = useQueryClient();

  const workersQuery = useQuery({
    queryKey: ['workers-status'],
    queryFn: () =>
      import('../../../shared/lib/api').then((api) =>
        api.claudeWorkersApi.getWorkersStatus()
      ),
    refetchInterval: 5000,
  });

  const mergeWorktreeMutation = useMutation({
    mutationFn: async () => {
      const { claudeWorkersApi } = await import('../../../shared/lib/api');
      const response = await claudeWorkersApi.mergeWorktree(executorId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-status'] });
    },
  });

  const worker = workersQuery.data?.workers.find((w) => w.id === executorId);

  return { worker, mergeWorktreeMutation };
}

// Worker not found component
function WorkerNotFound({ executorId }: { executorId: string }) {
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

// Worker header component
function WorkerHeader({ navigate }: { navigate: (path: string) => void }) {
  return (
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
  );
}

// Worker status row component
function WorkerStatusRow({ worker }: { worker: WorkerData }) {
  const StatusIcon = STATUS_CONFIG[worker.status].icon;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">Status:</span>
      <div className="flex items-center gap-2">
        <StatusIcon className="h-4 w-4" />
        <Badge className={`text-xs ${STATUS_CONFIG[worker.status].color}`}>
          {worker.status.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

// Worker details component
function WorkerDetails({ worker }: { worker: WorkerData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Worker ID:</span>
        <Link
          to={`/workers#${worker.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {worker.id.split('-').slice(-ID_DISPLAY_PARTS_COUNT).join('-')}
        </Link>
      </div>

      <WorkerStatusRow worker={worker} />

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

      <WorkerValidationStatus worker={worker} />
      <WorkerBlockedCommands worker={worker} />
    </div>
  );
}

// Worker validation status component
function WorkerValidationStatus({ worker }: { worker: WorkerData }) {
  if (worker.validationPassed === undefined) {
    return null;
  }

  return (
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
  );
}

// Worker blocked commands component
function WorkerBlockedCommands({ worker }: { worker: WorkerData }) {
  if (worker.blockedCommands <= 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">Blocked Commands:</span>
      <Badge
        variant="outline"
        className="text-xs bg-orange-50 text-orange-700"
      >
        {worker.blockedCommands}
      </Badge>
    </div>
  );
}

// Worker merge action component
function WorkerMergeAction({ worker, mergeWorktreeMutation }: {
  worker: WorkerData;
  mergeWorktreeMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}) {
  const canMerge = (worker.status === 'completed' || worker.status === 'stopped') && worker.validationPassed;
  
  if (!canMerge) {
    return null;
  }

  return (
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
  );
}

export function WorkerInfo({ executorId }: WorkerInfoProps) {
  const navigate = useNavigate();
  const { worker, mergeWorktreeMutation } = useWorkerData(executorId);

  if (!worker) {
    return <WorkerNotFound executorId={executorId} />;
  }

  return (
    <Card>
      <WorkerHeader navigate={navigate} />
      <CardContent>
        <WorkerDetails worker={worker} />
        <WorkerMergeAction worker={worker} mergeWorktreeMutation={mergeWorktreeMutation} />
      </CardContent>
    </Card>
  );
}