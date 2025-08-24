import { memo, useEffect, useRef, useMemo } from 'react';
import { User, Bot, Terminal, AlertCircle, CheckCircle, FileText, MessageSquare, Settings } from 'lucide-react';
import StdoutEntry from './StdoutEntry';
import StderrEntry from './StderrEntry';
import ProcessStartCard from './ProcessStartCard';
import DisplayConversationEntry from './DisplayConversationEntry';
import type { UnifiedLogEntry, ProcessStartPayload } from '../../../shared/types/logs';
import type { NormalizedEntry } from '../../../shared/types/logs';
import { formatStableTimestamp } from '../../../utils/timestamp';

export interface LogEntry {
  id: string;
  channel: 'stdout' | 'stderr' | 'process_start' | 'info' | 'error' | 'warn' | 'debug';
  payload: string | {
    runReason: string;
    startedAt: string;
    status: 'running' | 'completed' | 'failed' | 'pending';
    processId?: string;
  };
  timestamp: string;
}

interface LogEntryRowProps {
  entry: LogEntry | string | UnifiedLogEntry; // Support multiple entry types
  index: number;
  style?: React.CSSProperties;
  setRowHeight: (index: number, height: number) => void;
}

// Helper functions to detect message types and get appropriate icons
const getMessageTypeAndIcon = (content: string) => {
  const lowerContent = content.toLowerCase();
  
  // User messages
  if (content.includes('👤') || content.includes('user:') || content.includes('Human:') || lowerContent.includes('user said:')) {
    return {
      type: 'user_message',
      icon: <User className="h-4 w-4 text-blue-500" />,
      color: 'text-blue-300',
      bgColor: 'bg-blue-950/20 border-l-4 border-blue-400'
    };
  }
  
  // Assistant messages  
  if (content.includes('🤖') || content.includes('assistant:') || content.includes('Claude:') || lowerContent.includes('claude said:')) {
    return {
      type: 'assistant_message', 
      icon: <Bot className="h-4 w-4 text-green-500" />,
      color: 'text-green-300',
      bgColor: 'bg-green-950/20 border-l-4 border-green-400'
    };
  }
  
  // Tool usage
  if (content.includes('📁') || lowerContent.includes('tool use') || lowerContent.includes('using tool') || 
      lowerContent.includes('read tool') || lowerContent.includes('edit tool') || lowerContent.includes('bash tool')) {
    return {
      type: 'tool_use',
      icon: <FileText className="h-4 w-4 text-orange-500" />,
      color: 'text-orange-300',
      bgColor: 'bg-orange-950/20 border-l-4 border-orange-400'
    };
  }
  
  // System messages
  if (lowerContent.includes('system:') || lowerContent.includes('[system]') || 
      lowerContent.includes('validation') || lowerContent.includes('pipeline')) {
    return {
      type: 'system_message',
      icon: <Settings className="h-4 w-4 text-purple-500" />,
      color: 'text-purple-300', 
      bgColor: 'bg-purple-950/20 border-l-4 border-purple-400'
    };
  }
  
  // Success messages
  if (lowerContent.includes('✅') || lowerContent.includes('success') || lowerContent.includes('completed') || 
      lowerContent.includes('passed') || content.includes('🎉')) {
    return {
      type: 'success_message',
      icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
      color: 'text-emerald-300',
      bgColor: 'bg-emerald-950/20 border-l-4 border-emerald-400'
    };
  }
  
  // Error messages
  if (lowerContent.includes('❌') || lowerContent.includes('error') || lowerContent.includes('failed') || 
      lowerContent.includes('[error]') || content.includes('🚫')) {
    return {
      type: 'error_message',
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      color: 'text-red-300',
      bgColor: 'bg-red-950/20 border-l-4 border-red-400'
    };
  }
  
  // Command/terminal output
  if (content.includes('$') || lowerContent.includes('command:') || lowerContent.includes('running:') ||
      lowerContent.includes('executing:')) {
    return {
      type: 'command_output',
      icon: <Terminal className="h-4 w-4 text-cyan-500" />,
      color: 'text-cyan-300',
      bgColor: 'bg-cyan-950/20 border-l-4 border-cyan-400'
    };
  }
  
  // Default message
  return {
    type: 'info_message',
    icon: <MessageSquare className="h-4 w-4 text-gray-500" />,
    color: 'text-gray-300',
    bgColor: 'bg-gray-900/50'
  };
};

function LogEntryRow({ entry, index, style, setRowHeight }: LogEntryRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rowRef.current && setRowHeight) {
      const height = rowRef.current.clientHeight;
      setRowHeight(index, height);
    }
  }, [index, setRowHeight]);

  // Clean and parse the log entry (memoized to prevent recomputation) - must be called at top level
  const { parsedEntry, messageContent, messageType, isUnifiedEntry, shouldSkip } = useMemo(() => {
    // Handle UnifiedLogEntry (from useProcessesLogs hook)
    if (typeof entry === 'object' && 'channel' in entry && 'ts' in entry) {
      return { parsedEntry: null, messageContent: '', messageType: null, isUnifiedEntry: true, shouldSkip: false };
    }

    // Handle simple string entries (backwards compatibility)
    if (typeof entry === 'string') {
      // Filter out suggestion and warning lines
      if (entry.includes('💡 Suggestion:') || 
          entry.includes('Target:') || 
          entry.includes('Action:') ||
          entry.includes('⚠️  COMMAND WARNING:')) {
        return { parsedEntry: null, messageContent: '', messageType: null, isUnifiedEntry: false, shouldSkip: true };
      }
      
      const cleanEntry = cleanLogEntry(entry);
      const parsedEntry = parseLogLine(cleanEntry, index);
      const messageContent = extractContentFromResponse(parsedEntry.content);
      const messageType = getMessageTypeAndIcon(messageContent);
      return { parsedEntry, messageContent, messageType, isUnifiedEntry: false, shouldSkip: false };
    }
    return { parsedEntry: null, messageContent: '', messageType: null, isUnifiedEntry: false, shouldSkip: false };
  }, [entry, index]);

  // Handle UnifiedLogEntry (from useProcessesLogs hook)
  if (isUnifiedEntry) {
    const unifiedEntry = entry as UnifiedLogEntry;
    const content = (
      <div className="border-b border-gray-700 last:border-b-0" ref={rowRef}>
        {(() => {
          switch (unifiedEntry.channel) {
            case 'stdout':
              return (
                <StdoutEntry
                  content={unifiedEntry.payload as string}
                  timestamp={formatStableTimestamp(unifiedEntry.ts)}
                />
              );
            case 'stderr':
              return (
                <StderrEntry
                  content={unifiedEntry.payload as string}
                  timestamp={formatStableTimestamp(unifiedEntry.ts)}
                />
              );
            case 'process_start':
              return (
                <ProcessStartCard
                  payload={unifiedEntry.payload as ProcessStartPayload}
                />
              );
            case 'normalized':
              return (
                <DisplayConversationEntry
                  entry={unifiedEntry.payload as NormalizedEntry}
                  index={index}
                  diffDeletable={false}
                />
              );
            default:
              return (
                <div className="px-3 py-1">
                  <div className="text-red-500 text-xs">
                    Unknown log channel: {unifiedEntry.channel}
                  </div>
                </div>
              );
          }
        })()}
      </div>
    );
    return style ? <div style={style}>{content}</div> : content;
  }

  // Handle simple string entries (backwards compatibility)
  if (typeof entry === 'string') {
    // Filter out suggestion and warning lines
    if (shouldSkip || !parsedEntry || !messageType) {
      return null; // Skip rendering these lines
    }
    
    const content = (
      <div className={`px-3 py-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50 ${messageType.bgColor}`} ref={rowRef}>
        <div className="flex items-start gap-3 min-h-[1.5rem]">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {messageType.icon}
          </div>
          
          {/* Timestamp */}
          <span className="text-gray-500 flex-shrink-0 text-xs min-w-[70px] mt-0.5">
            {parsedEntry.timestamp}
          </span>
          
          {/* Level badge if present */}
          {parsedEntry.level && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getLevelColor(parsedEntry.level)} flex-shrink-0`}>
              {parsedEntry.level}
            </span>
          )}
          
          {/* Prefix if present */}
          {parsedEntry.prefix && (
            <span className={`font-semibold ${getPrefixColor(parsedEntry.prefix)} flex-shrink-0`}>
              {parsedEntry.prefix}:
            </span>
          )}
          
          {/* Message content */}
          <div className={`break-words leading-relaxed whitespace-pre-wrap flex-1 min-w-0 text-sm ${messageType.color}`}>
            {messageContent}
          </div>
        </div>
      </div>
    );
    return style ? <div style={style}>{content}</div> : content;
  }

  // Helper function to extract content from response objects
  function extractContentFromResponse(content: string): string {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      
      // If it's a response object with content, extract just the content
      if (parsed && typeof parsed === 'object') {
        // Handle various response formats
        if (parsed.content && typeof parsed.content === 'string') {
          return parsed.content;
        }
        
        // Handle array content (like from Claude API responses)
        if (Array.isArray(parsed.content)) {
          return parsed.content
            .map((item: unknown) => {
              if (typeof item === 'string') {
                return item;
              }
              if (item && typeof item === 'object' && 'text' in item) {
                return (item as { text: string }).text;
              }
              return JSON.stringify(item);
            })
            .join('\n');
        }
        
        // Handle message content structure
        if (parsed.message && parsed.message.content) {
          if (typeof parsed.message.content === 'string') {
            return parsed.message.content;
          }
          if (Array.isArray(parsed.message.content)) {
            return parsed.message.content
              .map((item: unknown) => {
                if (typeof item === 'string') {
                  return item;
                }
                if (item && typeof item === 'object' && 'text' in item) {
                  return (item as { text: string }).text;
                }
                return JSON.stringify(item);
              })
              .join('\n');
          }
        }
        
        // Handle text field directly
        if (parsed.text && typeof parsed.text === 'string') {
          return parsed.text;
        }
        
        // Handle response data field
        if (parsed.data && typeof parsed.data === 'object') {
          if (parsed.data.content) {
            return typeof parsed.data.content === 'string' 
              ? parsed.data.content 
              : JSON.stringify(parsed.data.content);
          }
          if (parsed.data.text) {
            return parsed.data.text;
          }
        }
        
        // Handle tool messages
        if (parsed.tool_name && parsed.parameters) {
          return `🔧 ${parsed.tool_name}: ${JSON.stringify(parsed.parameters, null, 2)}`;
        }
        
        // Handle status messages
        if (parsed.status && parsed.message) {
          return `${parsed.status}: ${parsed.message}`;
        }
        
        // Handle error objects
        if (parsed.error) {
          if (typeof parsed.error === 'string') {
            return `❌ Error: ${parsed.error}`;
          }
          if (parsed.error.message) {
            return `❌ Error: ${parsed.error.message}`;
          }
        }
      }
    } catch {
      // Not JSON, return original content but try to clean it up
    }
    
    // Clean up common patterns in non-JSON content
    let cleanContent = content;
    
    // Remove common log prefixes
    cleanContent = cleanContent.replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\s*/, '');
    cleanContent = cleanContent.replace(/^\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\s*/, '');
    
    // Clean up escaped characters
    cleanContent = cleanContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
    
    // Truncate extremely long messages but preserve readability
    if (cleanContent.length > 1000) {
      cleanContent = cleanContent.substring(0, 1000) + '\n\n... (message truncated)';
    }
    
    return cleanContent.trim();
  }

  // Helper functions for parsing
  function cleanLogEntry(logEntry: string): string {
    // Remove HTML entities and clean up escaped content
    return logEntry
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .trim();
  }

  function parseLogLine(logEntry: string, index?: number): { timestamp: string; level?: string; prefix?: string; content: string } {
    // Check for timestamp at start (HH:MM:SS AM/PM format)
    const timestampMatch = logEntry.match(/^(\d{1,2}:\d{2}:\d{2}\s*[AP]M)\s*(.*)$/);
    if (timestampMatch) {
      const remainingContent = timestampMatch[2];
      
      // Check for log level in remaining content
      const levelMatch = remainingContent.match(/^\[(\w+)\]\s*(.*)$/);
      if (levelMatch) {
        return {
          timestamp: timestampMatch[1],
          level: levelMatch[1],
          content: levelMatch[2]
        };
      }
      
      // Check for prefixed content like STDOUT:, STDERR: (filter out suggestions)
      const prefixMatch = remainingContent.match(/^(STDOUT|STDERR|🚫):\s*(.*)$/);
      if (prefixMatch) {
        return {
          timestamp: timestampMatch[1],
          prefix: prefixMatch[1],
          content: prefixMatch[2]
        };
      }
      
      return {
        timestamp: timestampMatch[1],
        content: remainingContent
      };
    }

    // Check for ISO timestamp format (YYYY-MM-DDTHH:MM:SS.sssZ)
    const isoTimestampMatch = logEntry.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s*(.*)$/);
    if (isoTimestampMatch) {
      return {
        timestamp: formatStableTimestamp(isoTimestampMatch[1]),
        content: isoTimestampMatch[2]
      };
    }

    // Generate stable fallback timestamp based on index
    const generateStableTimestamp = (index?: number): string => {
      if (index !== undefined) {
        // Create a stable but different timestamp for each entry
        const baseTime = new Date('2024-01-01T00:00:00Z');
        baseTime.setSeconds(baseTime.getSeconds() + (index * 10)); // 10 seconds apart
        return formatStableTimestamp(baseTime.getTime());
      }
      return '00:00:00';
    };

    // Check for structured log format like [INFO], [ERROR], etc.
    const structuredMatch = logEntry.match(/^\[(\w+)\]\s*(.*)$/);
    if (structuredMatch) {
      return {
        level: structuredMatch[1],
        content: structuredMatch[2],
        timestamp: generateStableTimestamp(index)
      };
    }

    // Check for prefixed content like STDOUT:, STDERR: (filter out suggestions)
    const prefixMatch = logEntry.match(/^(STDOUT|STDERR|🚫):\s*(.*)$/);
    if (prefixMatch) {
      return {
        prefix: prefixMatch[1],
        content: prefixMatch[2],
        timestamp: generateStableTimestamp(index)
      };
    }

    // For entries without timestamps, use a stable fallback
    return {
      content: logEntry,
      timestamp: generateStableTimestamp(index)
    };
  }

  function getLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'error':
      case 'err':
        return 'bg-red-600 text-white';
      case 'warn':
      case 'warning':
        return 'bg-yellow-600 text-white';
      case 'info':
        return 'bg-blue-600 text-white';
      case 'debug':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-green-600 text-white';
    }
  }

  function getPrefixColor(prefix: string): string {
    switch (prefix) {
      case 'STDERR':
        return 'text-red-700 dark:text-red-300';
      case 'STDOUT':
        return 'text-green-700 dark:text-green-300';
      case '🚫':
        return 'text-red-700 dark:text-red-300';
      // Suggestion prefix removed
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  }


  const getLogColor = (channel: string) => {
    switch (channel) {
      case 'stderr':
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warn':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      case 'debug':
        return 'text-gray-700 dark:text-gray-300';
      case 'stdout':
      default:
        return 'text-green-700 dark:text-green-300';
    }
  };

  const content = (
    <div className="border-b border-gray-700 last:border-b-0" ref={rowRef}>
      {(() => {
        switch (entry.channel) {
          case 'stdout':
            return (
              <StdoutEntry
                content={entry.payload as string}
                timestamp={formatStableTimestamp(('timestamp' in entry && entry.timestamp) || ('ts' in entry && entry.ts) || Date.now())}
              />
            );
          case 'stderr':
            return (
              <StderrEntry
                content={entry.payload as string}
                timestamp={formatStableTimestamp(('timestamp' in entry && entry.timestamp) || ('ts' in entry && entry.ts) || Date.now())}
              />
            );
          case 'process_start':
            return (
              <ProcessStartCard
                payload={entry.payload as {
                  runReason: string;
                  startedAt: string;
                  status: 'running' | 'completed' | 'failed' | 'pending';
                  processId?: string;
                }}
              />
            );
          case 'info':
          case 'error':
          case 'warn':
          case 'debug':
            return (
              <div className="flex gap-2 text-xs font-mono px-3 py-1">
                <span className="text-gray-500 flex-shrink-0">
                  {formatStableTimestamp(entry.timestamp)}
                </span>
                <span className={`break-all ${getLogColor(entry.channel)}`}>
                  [{entry.channel.toUpperCase()}] {entry.payload as string}
                </span>
              </div>
            );
          default:
            return (
              <div className="px-3 py-1">
                <div className="text-red-500 text-xs">
                  Unknown log type: {typeof entry === 'object' && entry && 'channel' in entry ? (entry as { channel: string }).channel : 'unknown'}
                </div>
              </div>
            );
        }
      })()}
    </div>
  );

  return style ? <div style={style}>{content}</div> : content;
}

// Memoize to optimize react-window performance with custom comparison
export default memo(LogEntryRow, (prevProps, nextProps) => {
  // Only re-render if entry content, index, or style actually changed
  return (
    prevProps.entry === nextProps.entry &&
    prevProps.index === nextProps.index &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
    prevProps.setRowHeight === nextProps.setRowHeight
  );
});