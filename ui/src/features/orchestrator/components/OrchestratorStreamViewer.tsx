import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Pause, Play, Download, Trash2, Users, Activity } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';

interface StreamEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
}

interface OrchestratorStreamViewerProps {
  sessionId?: string;
  onClose?: () => void;
}

const EVENT_TYPE_COLORS = {
  orchestrator_start: 'text-green-600',
  orchestrator_stop: 'text-red-600',
  task_start: 'text-cyan-600',
  task_complete: 'text-green-600',
  task_failed: 'text-red-600',
  claude_start: 'text-blue-600',
  claude_output: 'text-gray-700',
  claude_error: 'text-red-600',
  claude_complete: 'text-blue-600',
  validation_start: 'text-amber-600',
  validation_stage: 'text-amber-600',
  validation_complete: 'text-green-600',
  validation_failed: 'text-red-600',
  retry_attempt: 'text-purple-600',
  info: 'text-cyan-600',
  error: 'text-red-600',
  debug: 'text-gray-500',
};

const EVENT_TYPE_LABELS = {
  orchestrator_start: 'ORCHESTRATOR START',
  orchestrator_stop: 'ORCHESTRATOR STOP',
  task_start: 'TASK START',
  task_complete: 'TASK COMPLETE',
  task_failed: 'TASK FAILED',
  claude_start: 'CLAUDE START',
  claude_output: 'CLAUDE OUTPUT',
  claude_error: 'CLAUDE ERROR',
  claude_complete: 'CLAUDE COMPLETE',
  validation_start: 'VALIDATION START',
  validation_stage: 'VALIDATION STAGE',
  validation_complete: 'VALIDATION COMPLETE',
  validation_failed: 'VALIDATION FAILED',
  retry_attempt: 'RETRY ATTEMPT',
  info: 'INFO',
  error: 'ERROR',
  debug: 'DEBUG',
};

export function OrchestratorStreamViewer({ sessionId, onClose }: OrchestratorStreamViewerProps) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [clientCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(true);

  // Connect to SSE stream
  const connect = () => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    const url = `${baseUrl}/api/orchestrator/stream${sessionId ? `?sessionId=${sessionId}` : ''}`;

    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onopen = () => {
      setIsConnected(true);
      addSystemEvent('Connected to orchestrator stream');
    };

    eventSourceRef.current.onmessage = event => {
      if (isPaused) {
        return;
      }

      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);
        setEvents(prev => [...prev, streamEvent]);
      } catch (error) {
        console.error('Failed to parse stream event:', error);
      }
    };

    eventSourceRef.current.onerror = () => {
      setIsConnected(false);
      addSystemEvent('Stream connection error');
    };
  };

  // Disconnect from stream
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      addSystemEvent('Disconnected from stream');
    }
  };

  // Add system event
  const addSystemEvent = (message: string) => {
    const systemEvent: StreamEvent = {
      type: 'info',
      data: { message },
      timestamp: new Date().toISOString(),
      sessionId: 'system',
    };
    setEvents(prev => [...prev, systemEvent]);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && isAutoScrollingRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Handle manual scroll
  const handleScroll = () => {
    if (!containerRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isAtBottom !== isAutoScrollingRef.current) {
      isAutoScrollingRef.current = isAtBottom;
      setAutoScroll(isAtBottom);
    }
  };

  // Connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [sessionId]);

  // Format event data for display
  const formatEventData = (event: StreamEvent): string => {
    const { type, data } = event;

    switch (type) {
      case 'orchestrator_start':
        return `Started with validation: ${data.enableValidation}, retries: ${data.maxTaskRetries}`;

      case 'task_start':
        return `Task ${data.taskId}: ${data.taskContent}`;

      case 'task_complete':
        return `Task ${data.taskId} completed in ${data.duration}ms (${data.attempts} attempts)`;

      case 'task_failed':
        return `Task ${data.taskId} failed: ${data.error}`;

      case 'claude_start':
        return `Claude execution started for ${data.taskId} (attempt ${data.attempt})\\nPrompt: ${data.promptPreview}`;

      case 'claude_output':
        return String(data.output);

      case 'claude_complete':
        return `Claude completed for ${data.taskId} (exit: ${data.exitCode}, ${data.duration}ms)`;

      case 'validation_start':
        return `Starting validation for ${data.taskId}`;

      case 'validation_stage': {
        const statusText =
          data.status === 'passed'
            ? '✅ PASSED'
            : data.status === 'failed'
              ? '❌ FAILED'
              : '⏳ RUNNING';
        return `${statusText} ${data.stageName}${data.duration ? ` (${data.duration}ms)` : ''}${data.error ? `\\n  Error: ${data.error}` : ''}`;
      }

      case 'validation_complete':
        return `Validation ${data.success ? '✅ PASSED' : '❌ FAILED'} (${data.passed}/${data.totalStages} stages, ${data.totalDuration}ms)`;

      case 'retry_attempt':
        return `Retrying ${data.taskId} (attempt ${data.attempt}): ${data.reason}`;

      case 'info':
        return String(data.message);

      case 'error':
        return String(data.error || data.message);

      default:
        return JSON.stringify(data, null, 2);
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => !eventTypeFilter || event.type === eventTypeFilter);

  // Get unique event types for filter
  const eventTypes = [...new Set(events.map(e => e.type))].sort();

  // Export events
  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orchestrator-events-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Orchestrator Stream
            {isConnected && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Events: {filteredEvents.length}</span>
            {clientCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700">
                <Users className="h-3 w-3 mr-1" />
                {clientCount} clients
              </span>
            )}
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsPaused(!isPaused)} variant="outline" size="sm">
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>

            <select
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="">All Events</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] || type.toUpperCase()}
                </option>
              ))}
            </select>

            <Button onClick={exportEvents} variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>

            <Button onClick={clearEvents} variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-96 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm"
          style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
        >
          {filteredEvents.length === 0 ? (
            <div className="text-gray-500 text-center mt-16">
              {isConnected ? 'Waiting for events...' : 'Not connected'}
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <div key={index} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start gap-2 text-xs text-gray-400 mb-1">
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span
                    className={`font-bold ${EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || 'text-gray-400'}`}
                  >
                    {EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] ||
                      event.type.toUpperCase()}
                  </span>
                  <span className="text-gray-500">({event.sessionId})</span>
                </div>
                <div className="text-gray-200 whitespace-pre-wrap pl-4 border-l-2 border-gray-700">
                  {formatEventData(event)}
                </div>
              </div>
            ))
          )}
        </div>

        {!isConnected && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Connection Lost</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              The stream connection was lost. Events will resume when the connection is restored.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
