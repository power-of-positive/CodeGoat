import { useEffect, useState, useRef } from 'react';
import type { UnifiedLogEntry, ProcessStartPayload } from '../shared/types/logs';
import type { NormalizedEntry } from '../shared/types/index';

interface UseEnhancedLogStreamResult {
  entries: UnifiedLogEntry[];
  isConnected: boolean;
  error: string | null;
}

export const useEnhancedLogStream = (
  workerId: string, 
  enabled: boolean = true
): UseEnhancedLogStreamResult => {
  const [entries, setEntries] = useState<UnifiedLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const entryCounterRef = useRef(0);

  useEffect(() => {
    if (!enabled || !workerId) {
      // Close connection and reset state
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setEntries([]);
      setIsConnected(false);
      setError(null);
      entryCounterRef.current = 0;
      return;
    }

    // Clear entries when worker changes
    setEntries([]);
    setError(null);
    entryCounterRef.current = 0;

    // Skip EventSource in test environment
    if (typeof EventSource === 'undefined') {
      // Only log in development, not in tests
      if (process.env.NODE_ENV !== 'test') {
        console.warn('EventSource not available in test environment');
      }
      return;
    }

    // Connect to enhanced log streaming endpoint
    const eventSource = new EventSource(`/api/claude-workers/${workerId}/enhanced-logs`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.warn(`🔗 Enhanced log stream connected for worker: ${workerId}`);
      setError(null);
      setIsConnected(true);
      
      // Add process start marker
      const processStartPayload: ProcessStartPayload = {
        processId: workerId,
        runReason: 'codingagent',
        startedAt: new Date().toISOString(),
        status: 'running',
      };

      const startEntry: UnifiedLogEntry = {
        id: `${workerId}-start`,
        ts: entryCounterRef.current++,
        processId: workerId,
        processName: 'Claude Worker',
        channel: 'process_start',
        payload: processStartPayload,
      };

      setEntries([startEntry]);
    };

    // Handle json_patch events (new format from server)
    eventSource.addEventListener('json_patch', (event) => {
      try {
        const patches = JSON.parse(event.data);
        const newEntries: UnifiedLogEntry[] = [];
        console.warn(`📦 Received ${patches.length} patches for worker ${workerId}`);
        
        patches.forEach((patch: { value?: { type: string; content: string | NormalizedEntry } }) => {
          const value = patch?.value;
          if (!value || !value.type) {
            return;
          }

          let channel: UnifiedLogEntry['channel'];
          let payload: string | NormalizedEntry;

          switch (value.type) {
            case 'STDOUT':
              channel = 'stdout';
              payload = value.content;
              break;
            case 'STDERR':
              channel = 'stderr';
              payload = value.content;
              break;
            case 'NORMALIZED_ENTRY':
              channel = 'normalized';
              payload = value.content;
              break;
            default:
              return; // Skip unknown patch types
          }

          const entry: UnifiedLogEntry = {
            id: `${workerId}-${entryCounterRef.current}`,
            ts: entryCounterRef.current++,
            processId: workerId,
            processName: 'Claude Worker',
            channel,
            payload,
          };

          newEntries.push(entry);
        });

        if (newEntries.length > 0) {
          setEntries(prev => [...prev, ...newEntries]);
        }
      } catch (e) {
        console.error('Failed to parse json_patch:', e);
        setError('Failed to process log update');
      }
    });

    eventSource.addEventListener('finished', () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.onerror = (error) => {
      console.error(`❌ Enhanced log stream error for worker ${workerId}:`, error);
      setError('Connection failed');
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [workerId, enabled]);

  return { entries, isConnected, error };
};