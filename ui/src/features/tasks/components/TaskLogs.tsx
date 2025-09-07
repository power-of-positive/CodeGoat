import React, { useState, useRef } from 'react';
import { Terminal, Play, Pause, FileText } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import EnhancedLogEntryRow from '../../logs/components/EnhancedLogEntryRow';
import { useEnhancedLogStream } from '../../../hooks/useEnhancedLogStream';
import type { UnifiedLogEntry } from '../../../shared/types/logs';

// Constants for ID parsing
const ID_DISPLAY_PARTS_COUNT = 2; // Number of parts to show from the end of hyphen-separated IDs

interface TaskLogsProps {
  executorId: string | null;
}

// No executor state component
function NoExecutorState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Task Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No active worker for this task</p>
          <p className="text-sm">Logs will appear when a worker is assigned</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Log controls component
function LogControls({
  autoScroll,
  autoRefresh,
  isConnected,
  onToggleAutoScroll,
  onToggleAutoRefresh,
}: {
  autoScroll: boolean;
  autoRefresh: boolean;
  isConnected: boolean;
  onToggleAutoScroll: () => void;
  onToggleAutoRefresh: () => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleAutoScroll}
        className="flex items-center space-x-1"
      >
        {autoScroll ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span className="text-xs">{autoScroll ? 'Pause Scroll' : 'Auto Scroll'}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleAutoRefresh}
        className="flex items-center space-x-1"
      >
        <FileText className="h-3 w-3" />
        <span className="text-xs">{autoRefresh ? 'Live' : 'Manual'}</span>
      </Button>
      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}

// Connection status component
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center space-x-1">
      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs text-muted-foreground">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

// Task logs header component
function TaskLogsHeader({
  executorId,
  autoScroll,
  autoRefresh,
  isConnected,
  onToggleAutoScroll,
  onToggleAutoRefresh,
}: {
  executorId: string;
  autoScroll: boolean;
  autoRefresh: boolean;
  isConnected: boolean;
  onToggleAutoScroll: () => void;
  onToggleAutoRefresh: () => void;
}) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Task Logs
          <Badge variant="secondary" className="text-xs">
            {executorId.split('-').slice(-ID_DISPLAY_PARTS_COUNT).join('-')}
          </Badge>
        </CardTitle>
        <LogControls
          autoScroll={autoScroll}
          autoRefresh={autoRefresh}
          isConnected={isConnected}
          onToggleAutoScroll={onToggleAutoScroll}
          onToggleAutoRefresh={onToggleAutoRefresh}
        />
      </div>
    </CardHeader>
  );
}

// Log content component
function LogContent({
  logEntries,
  autoScroll,
  virtuosoRef,
}: {
  logEntries: UnifiedLogEntry[];
  autoScroll: boolean;
  virtuosoRef: React.RefObject<VirtuosoHandle>;
}) {
  if (logEntries.length === 0) {
    return <div className="p-4 text-center text-muted-foreground text-sm">No logs available</div>;
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="h-full rounded-lg"
      data={logEntries}
      itemContent={(index, entry) => (
        <EnhancedLogEntryRow key={entry.id} entry={entry} index={index} />
      )}
      followOutput={autoScroll ? 'smooth' : false}
      increaseViewportBy={{ top: 0, bottom: 600 }}
    />
  );
}

// Log footer component
function LogFooter({
  logEntries,
  executorId,
}: {
  logEntries: UnifiedLogEntry[];
  executorId: string;
}) {
  return (
    <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground">
      <div className="flex justify-between">
        <span>Total entries: {logEntries.length}</span>
        <span>Worker: {executorId}</span>
      </div>
    </div>
  );
}

export function TaskLogs({ executorId }: TaskLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Use SSE streaming instead of polling to prevent continuous rerendering
  const { entries: logEntries, isConnected } = useEnhancedLogStream(executorId || '', !!executorId);

  if (!executorId) {
    return <NoExecutorState />;
  }

  return (
    <Card>
      <TaskLogsHeader
        executorId={executorId}
        autoScroll={autoScroll}
        autoRefresh={autoRefresh}
        isConnected={isConnected}
        onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      />
      <CardContent className="p-0">
        <div className="border rounded-lg h-96">
          <LogContent logEntries={logEntries} autoScroll={autoScroll} virtuosoRef={virtuosoRef} />
        </div>
        <LogFooter logEntries={logEntries} executorId={executorId} />
      </CardContent>
    </Card>
  );
}
