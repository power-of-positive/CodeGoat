import { useState, useEffect, useRef } from 'react';
import type { UnifiedLogEntry, ProcessStartPayload } from '../types/logs';
import type { NormalizedEntry } from '../../../shared/types';

export interface ExecutionProcess {
  id: string;
  task_attempt_id: string;
  run_reason: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

/**
 * Hook to fetch and manage logs for multiple processes
 * Simulates the backend log streaming functionality
 */
export function useProcessesLogs(
  processes: ExecutionProcess[],
  enableStreaming = false
): {
  entries: UnifiedLogEntry[];
  isLoading: boolean;
  error: string | null;
} {
  const [entries, setEntries] = useState<UnifiedLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!processes.length) {
      setEntries(prev => (prev.length > 0 ? [] : prev)); // Only update if actually different
      setIsLoading(false);
      return;
    }

    const fetchLogs = () => {
      try {
        // Generate mock unified log entries for demonstration
        const mockEntries: UnifiedLogEntry[] = [];

        processes.forEach((process, processIndex) => {
          const baseTimestamp = Date.now() - 10000 * (processes.length - processIndex);

          // Add process start entry
          mockEntries.push({
            id: `${process.id}-start`,
            ts: baseTimestamp,
            processId: process.id,
            processName: process.run_reason,
            channel: 'process_start',
            payload: {
              processId: process.id,
              runReason: process.run_reason,
              startedAt: process.started_at,
              status: process.status,
            } as ProcessStartPayload,
          });

          // Add some stdout entries
          const stdoutMessages = [
            'Starting process execution...',
            'Loading configuration files',
            'Initializing Claude Code session',
            'Running validation checks',
            'Process completed successfully',
          ];

          stdoutMessages.forEach((msg, msgIndex) => {
            mockEntries.push({
              id: `${process.id}-stdout-${msgIndex}`,
              ts: baseTimestamp + msgIndex * 1000,
              processId: process.id,
              processName: process.run_reason,
              channel: 'stdout',
              payload: `[${new Date(baseTimestamp + msgIndex * 1000).toLocaleTimeString()}] ${msg}`,
            });
          });

          // Add some stderr entries if process failed
          if (process.status === 'failed') {
            mockEntries.push({
              id: `${process.id}-stderr-error`,
              ts: baseTimestamp + 3000,
              processId: process.id,
              processName: process.run_reason,
              channel: 'stderr',
              payload: `[${new Date(baseTimestamp + 3000).toLocaleTimeString()}] [ERROR] Process execution failed: Command not found`,
            });
          }

          // Add normalized conversation entries for codingagent processes
          if (process.run_reason === 'codingagent') {
            const normalizedEntries: NormalizedEntry[] = [
              {
                timestamp: new Date(baseTimestamp + 1500).toISOString(),
                entry_type: { type: 'user_message' },
                content: 'Please help me implement the enhanced logging functionality.',
              },
              {
                timestamp: new Date(baseTimestamp + 2000).toISOString(),
                entry_type: {
                  type: 'tool_use',
                  tool_name: 'Read',
                  action_type: {
                    action: 'file_read',
                    path: 'ui/src/components/logs/LogEntryRow.tsx',
                  },
                },
                content: 'Reading log component file to understand current implementation...',
              },
              {
                timestamp: new Date(baseTimestamp + 2500).toISOString(),
                entry_type: { type: 'assistant_message' },
                content:
                  "I'll help you implement the enhanced logging functionality. Let me analyze the current log processing system and create improved components based on your requirements.",
              },
            ];

            normalizedEntries.forEach((entry, entryIndex) => {
              mockEntries.push({
                id: `${process.id}-normalized-${entryIndex}`,
                ts: baseTimestamp + 1500 + entryIndex * 500,
                processId: process.id,
                processName: process.run_reason,
                channel: 'normalized',
                payload: entry,
              });
            });
          }
        });

        // Sort entries by timestamp
        mockEntries.sort((a, b) => a.ts - b.ts);
        setEntries(mockEntries);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchLogs();

    // Set up streaming if enabled
    if (enableStreaming) {
      intervalRef.current = setInterval(() => {
        // Add new log entries periodically
        const now = Date.now();
        const newEntry: UnifiedLogEntry = {
          id: `stream-${now}`,
          ts: now,
          processId: processes[0]?.id || 'unknown',
          processName: processes[0]?.run_reason || 'stream',
          channel: 'stdout',
          payload: `[${new Date().toLocaleTimeString()}] Streaming log entry at ${new Date().toISOString()}`,
        };

        setEntries(prev => [...prev, newEntry]);
      }, 5000); // Add new entry every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [processes, enableStreaming]);

  return { entries, isLoading, error };
}
