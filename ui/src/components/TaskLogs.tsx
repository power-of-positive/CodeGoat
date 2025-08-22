import React, { useState, useRef } from 'react';
import { Terminal, Play, Pause, FileText } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import EnhancedLogEntryRow from './logs/EnhancedLogEntryRow';
import { useEnhancedLogStream } from '../hooks/useEnhancedLogStream';

interface TaskLogsProps {
  executorId: string | null;
}

export function TaskLogs({ executorId }: TaskLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Use SSE streaming instead of polling to prevent continuous rerendering
  const { entries: logEntries, isConnected } = useEnhancedLogStream(executorId || '', !!executorId);

  if (!executorId) {
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
            <p className="text-sm">
              Logs will appear when a worker is assigned
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Task Logs
            {executorId && (
              <Badge variant="secondary" className="text-xs">
                {executorId.split('-').slice(-2).join('-')}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="flex items-center space-x-1"
            >
              {autoScroll ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span className="text-xs">
                {autoScroll ? 'Pause Scroll' : 'Auto Scroll'}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center space-x-1"
            >
              <FileText className="h-3 w-3" />
              <span className="text-xs">
                {autoRefresh ? 'Live' : 'Manual'}
              </span>
            </Button>
            <div className="flex items-center space-x-1">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border rounded-lg h-96">
          {logEntries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No logs available
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              className="h-full rounded-lg"
              data={logEntries}
              itemContent={(index, entry) => (
                <EnhancedLogEntryRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                />
              )}
              followOutput={autoScroll ? 'smooth' : false}
              increaseViewportBy={{ top: 0, bottom: 600 }}
            />
          )}
        </div>
        <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Total entries: {logEntries.length}</span>
            <span>Worker: {executorId}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}