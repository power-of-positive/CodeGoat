import { Clock, Cog, Play, Terminal, Code, Zap } from 'lucide-react';

interface ProcessStartPayload {
  runReason: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  processId?: string;
}

interface ProcessStartCardProps {
  payload: ProcessStartPayload;
}

function ProcessStartCard({ payload }: ProcessStartCardProps) {
  const getProcessIcon = (runReason: string) => {
    switch (runReason) {
      case 'setupscript':
        return <Cog className="h-4 w-4" />;
      case 'cleanupscript':
        return <Terminal className="h-4 w-4" />;
      case 'codingagent':
        return <Code className="h-4 w-4" />;
      case 'devserver':
        return <Play className="h-4 w-4" />;
      case 'worker':
        return <Zap className="h-4 w-4" />;
      default:
        return <Cog className="h-4 w-4" />;
    }
  };

  const getProcessLabel = (runReason: string) => {
    switch (runReason) {
      case 'setupscript':
        return 'Setup Script';
      case 'cleanupscript':
        return 'Cleanup Script';
      case 'codingagent':
        return 'Coding Agent';
      case 'devserver':
        return 'Dev Server';
      case 'worker':
        return 'Claude Worker';
      default:
        return runReason.charAt(0).toUpperCase() + runReason.slice(1);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="bg-muted/50 border border-border rounded-lg p-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            {getProcessIcon(payload.runReason)}
            <span className="font-medium">
              {getProcessLabel(payload.runReason)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(payload.startedAt)}</span>
          </div>
          {payload.processId && (
            <div className="text-xs text-muted-foreground font-mono">
              PID: {payload.processId}
            </div>
          )}
          <div
            className={`ml-auto text-xs px-2 py-1 rounded-full ${getStatusColor(payload.status)}`}
          >
            {payload.status}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcessStartCard;