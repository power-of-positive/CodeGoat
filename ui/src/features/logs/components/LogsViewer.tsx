// Improved logs viewer using react-virtuoso like vibe-kanban
import { useRef, useCallback, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { AlertCircle, Terminal } from 'lucide-react';
import LogEntryRow from './LogEntryRow';
import VibeLogs from './VibeLogs';
import type { UnifiedLogEntry } from '../../../shared/types/logs';

interface LogsViewerProps {
  entries: UnifiedLogEntry[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  followOutput?: boolean;
  className?: string;
  useVibeLogComponent?: boolean;
  setRowHeight?: (index: number, height: number) => void;
}

export default function LogsViewer({
  entries,
  isLoading = false,
  error = null,
  title: _title = 'Logs',
  followOutput = true,
  className = '',
  useVibeLogComponent = true,
  setRowHeight,
}: LogsViewerProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (followOutput && entries && entries.length > 0) {
      // Small delay to allow virtuoso to update
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: entries.length - 1,
          align: 'end',
        });
      });
    }
  }, [entries, followOutput]);

  // Memoized item content to prevent unnecessary rerenders
  const itemContent = useCallback(
    (index: number, entry: UnifiedLogEntry) => {
      if (useVibeLogComponent) {
        return (
          <VibeLogs
            entry={entry}
            index={index}
          />
        );
      } else {
        return (
          <LogEntryRow
            entry={entry}
            index={index}
            setRowHeight={setRowHeight || (() => {})}
          />
        );
      }
    },
    [useVibeLogComponent, setRowHeight]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Terminal className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Loading logs...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Error loading logs: {error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!entries || entries.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No logs available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${className}`}>
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={entries}
        itemContent={itemContent}
        followOutput={followOutput ? 'smooth' : false}
        increaseViewportBy={{ top: 0, bottom: 600 }}
        overscan={5}
        components={{
          Footer: () => <div style={{ height: '20px' }} />,
        }}
      />
    </div>
  );
}