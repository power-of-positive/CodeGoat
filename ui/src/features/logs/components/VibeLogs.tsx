// Simplified log viewer using vibe-kanban approach
import React, { memo, useEffect, useRef } from 'react';
import {
  User,
  Bot,
  Brain,
  Settings,
  AlertCircle,
  CheckSquare,
  Eye,
  Edit,
  Terminal,
  Search,
  Globe,
  Plus,
  Play,
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import RawLogText from './RawLogText';
import { UnifiedLogEntry, ProcessStartPayload, NormalizedEntry } from '../../../shared/types/logs';

interface VibeLogsProps {
  entry: UnifiedLogEntry;
  index: number;
  style?: React.CSSProperties;
  setRowHeight?: (index: number, height: number) => void;
}

const getEntryIcon = (entryType: {
  type: string;
  tool_name?: string;
  action_type?: { action: string };
}) => {
  if (entryType.type === 'user_message') {
    return <User className="h-4 w-4 text-blue-600" />;
  }
  if (entryType.type === 'assistant_message') {
    return <Bot className="h-4 w-4 text-green-600" />;
  }
  if (entryType.type === 'system_message') {
    return <Settings className="h-4 w-4 text-gray-600" />;
  }
  if (entryType.type === 'thinking') {
    return <Brain className="h-4 w-4 text-purple-600" />;
  }
  if (entryType.type === 'error_message') {
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  }
  if (entryType.type === 'tool_use') {
    const { action_type: actionType, tool_name: toolName } = entryType;

    // Special handling for TODO tools
    if (
      actionType?.action === 'todo_management' ||
      (toolName &&
        (toolName.toLowerCase() === 'todowrite' ||
          toolName.toLowerCase() === 'todoread' ||
          toolName.toLowerCase() === 'todo_write' ||
          toolName.toLowerCase() === 'todo_read' ||
          toolName.toLowerCase() === 'pending'))
    ) {
      return <CheckSquare className="h-4 w-4 text-purple-600" />;
    }

    if (actionType?.action === 'file_read') {
      return <Eye className="h-4 w-4 text-orange-600" />;
    } else if (actionType?.action === 'file_edit') {
      return <Edit className="h-4 w-4 text-red-600" />;
    } else if (actionType?.action === 'command_run') {
      return <Terminal className="h-4 w-4 text-yellow-600" />;
    } else if (actionType?.action === 'search') {
      return <Search className="h-4 w-4 text-indigo-600" />;
    } else if (actionType?.action === 'web_fetch') {
      return <Globe className="h-4 w-4 text-cyan-600" />;
    } else if (actionType?.action === 'task_create') {
      return <Plus className="h-4 w-4 text-teal-600" />;
    } else if (actionType?.action === 'plan_presentation') {
      return <CheckSquare className="h-4 w-4 text-blue-600" />;
    }
    return <Settings className="h-4 w-4 text-gray-600" />;
  }
  return <Settings className="h-4 w-4 text-gray-400" />;
};

const getContentClassName = (entryType: {
  type: string;
  tool_name?: string;
  action_type?: { action: string };
}) => {
  const baseClasses = 'text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-100';

  if (entryType.type === 'tool_use' && entryType.action_type?.action === 'command_run') {
    return `${baseClasses} font-mono`;
  }

  if (entryType.type === 'error_message') {
    return `${baseClasses} text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded`;
  }

  // Special styling for TODO lists
  if (
    entryType.type === 'tool_use' &&
    (entryType.action_type?.action === 'todo_management' ||
      (entryType.tool_name &&
        (entryType.tool_name.toLowerCase() === 'todowrite' ||
          entryType.tool_name.toLowerCase() === 'todoread' ||
          entryType.tool_name.toLowerCase() === 'todo_write' ||
          entryType.tool_name.toLowerCase() === 'todo_read' ||
          entryType.tool_name.toLowerCase() === 'pending')))
  ) {
    return `${baseClasses} font-mono bg-zinc-50 dark:bg-zinc-900/40 px-2 py-1 rounded`;
  }

  // Special styling for plan presentations
  if (entryType.type === 'tool_use' && entryType.action_type?.action === 'plan_presentation') {
    return `${baseClasses} text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded-md border-l-4 border-blue-400`;
  }

  return baseClasses;
};

const shouldRenderMarkdown = (entryType: { type: string }) => {
  return (
    entryType.type === 'assistant_message' ||
    entryType.type === 'system_message' ||
    entryType.type === 'user_message' ||
    entryType.type === 'thinking' ||
    entryType.type === 'tool_use'
  );
};

const ProcessStartCard: React.FC<{ payload: ProcessStartPayload }> = ({ payload }) => {
  const statusColors = {
    running: 'bg-blue-100 text-blue-800 border-blue-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    failed: 'bg-red-100 text-red-800 border-red-300',
    stopped: 'bg-gray-100 text-gray-800 border-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-3">
        <Play className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
              Process Started
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[payload.status as keyof typeof statusColors] || statusColors.running}`}
            >
              {payload.status.toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>Run Reason: {payload.runReason}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DisplayConversationEntry: React.FC<{ entry: NormalizedEntry; index: number }> = ({
  entry,
  index: _index,
}) => {
  return (
    <div className="px-4 py-1">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getEntryIcon(entry.entry_type)}</div>
        <div className="flex-1 min-w-0">
          <div className={getContentClassName(entry.entry_type)}>
            {shouldRenderMarkdown(entry.entry_type) ? (
              <MarkdownRenderer
                content={entry.content}
                className="whitespace-pre-wrap break-words"
              />
            ) : (
              entry.content
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function VibeLogs({ entry, index, style, setRowHeight }: VibeLogsProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    if (rowRef.current && setRowHeight) {
      const height = rowRef.current.clientHeight;
      // Only call setRowHeight if it's a meaningful height and actually changed
      if (height > 0 && height !== lastHeightRef.current) {
        lastHeightRef.current = height;
        setRowHeight(index, height);
      }
    }
    // Only run when content actually changes, not on every render
  }, [entry.payload, index, setRowHeight]);

  const content = (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0" ref={rowRef}>
      {(() => {
        switch (entry.channel) {
          case 'stdout':
            return (
              <div className="flex gap-2 px-4 py-1">
                <RawLogText content={entry.payload as string} channel="stdout" />
              </div>
            );
          case 'stderr':
            return (
              <div className="flex gap-2 px-4 py-1">
                <RawLogText content={entry.payload as string} channel="stderr" />
              </div>
            );
          case 'normalized':
            return (
              <DisplayConversationEntry entry={entry.payload as NormalizedEntry} index={index} />
            );
          case 'process_start':
            return <ProcessStartCard payload={entry.payload as ProcessStartPayload} />;
          default:
            return (
              <div className="px-4 py-1">
                <div className="text-red-500 dark:text-red-400 text-xs">
                  Unknown log type: {entry.channel}
                </div>
              </div>
            );
        }
      })()}
    </div>
  );

  return style ? <div style={style}>{content}</div> : content;
}

// Memoize to optimize react-window performance
export default memo(VibeLogs, (prevProps, nextProps) => {
  // Only re-render if entry content, index, or style actually changed
  return (
    JSON.stringify(prevProps.entry) === JSON.stringify(nextProps.entry) &&
    prevProps.index === nextProps.index &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
    prevProps.setRowHeight === nextProps.setRowHeight
  );
});
