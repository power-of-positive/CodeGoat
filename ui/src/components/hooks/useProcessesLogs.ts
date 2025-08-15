import { useMemo, useCallback } from 'react';
import type {
  ExecutionProcessSummary,
  NormalizedEntry,
  PatchType,
} from 'shared/types';
import type { UnifiedLogEntry, ProcessStartPayload } from '@/types/logs';
import { useEventSourceManager } from './useEventSourceManager';

interface UseProcessesLogsResult {
  entries: UnifiedLogEntry[];
  isConnected: boolean;
  error: string | null;
}

const MAX_ENTRIES = 5000;

export const useProcessesLogs = (
  processes: ExecutionProcessSummary[],
  enabled: boolean
): UseProcessesLogsResult => {
  const getEndpoint = useCallback((process: ExecutionProcessSummary) => {
    // Coding agents use normalized logs endpoint, scripts use raw logs endpoint
    // Both endpoints now return PatchType objects via JSON patches
    const isCodingAgent = process.run_reason === 'codingagent';
    return isCodingAgent
      ? `/api/execution-processes/${process.id}/normalized-logs`
      : `/api/execution-processes/${process.id}/raw-logs`;
  }, []);

  const initialData = useMemo(() => ({ entries: [] }), []);

  const { processData, isConnected, error } = useEventSourceManager({
    processes,
    enabled,
    getEndpoint,
    initialData,
  });

  const entries = useMemo(() => {
    const allEntries: UnifiedLogEntry[] = [];
    const entryCounter = 0;

    // Iterate through processes in order, adding process marker followed by logs
    processes.forEach((process) => {
      const data = processData[process.id];
      if (!data?.entries) return;

      // Add process start marker first
      const processStartPayload: ProcessStartPayload = {
        process_id: process.id,
        command: process.command || '',
        working_directory: process.working_directory,
        environment: process.environment,
      };

      allEntries.push({
        id: `${process.id}-start`,
        timestamp: process.started_at || new Date().toISOString(),
        level: 'info',
        message: `Process started: ${process.run_reason}`,
        source: 'system',
        process_id: process.id,
      });

      // Then add all logs for this process (skip the injected PROCESS_START entry)
      data.entries.forEach(
        (
          patchEntry:
            | PatchType
            | { type: 'PROCESS_START'; content: ProcessStartPayload },
          index: number
        ) => {
          // Skip the injected PROCESS_START entry since we handle it above
          if ('type' in patchEntry && patchEntry.type === 'PROCESS_START') return;

          let channel: string | undefined;
          let payload: string | NormalizedEntry;

          if ('type' in patchEntry) {
            switch (patchEntry.type) {
            case 'STDOUT':
              channel = 'stdout';
              payload = patchEntry.content;
              break;
            case 'STDERR':
              channel = 'stderr';
              payload = patchEntry.content;
              break;
            case 'NORMALIZED_ENTRY':
              channel = 'normalized';
              payload = patchEntry.content;
              break;
            default:
              // Skip unknown patch types
              return;
            }
          } else {
            // Handle PatchType entries (which don't have 'type' property)
            return; // Skip for now
          }

          allEntries.push({
            id: `${process.id}-${index}`,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: typeof payload === 'string' ? payload : JSON.stringify(payload),
            source: channel,
            process_id: process.id,
          });
        }
      );
    });

    // Limit entries (no sorting needed since we build in order)
    return allEntries.slice(-MAX_ENTRIES);
  }, [processData, processes]);

  return { entries, isConnected, error };
};
