import { useEffect, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import RawLogText from './RawLogText';
import type { UnifiedLogEntry } from '../../../shared/types/logs';

// Display configuration constants
const TOOL_USE_ID_DISPLAY_LENGTH = -8;

interface SimpleLogViewerProps {
  entries: UnifiedLogEntry[];
  className?: string;
  followOutput?: boolean;
}

export default function SimpleLogViewer({
  entries,
  className = '',
  followOutput = true,
}: SimpleLogViewerProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const didInitScroll = useRef(false);
  const prevLenRef = useRef(0);
  const [atBottom, setAtBottom] = useState(true);

  // Convert complex entries to simple text lines for better display (vibe-kanban approach)
  const processedLogs = entries.flatMap((entry) => {
    const lines: Array<{ content: string; channel: 'stdout' | 'stderr' }> = [];
    
    if (entry.channel === 'stdout' || entry.channel === 'stderr') {
      // Simple string payload - handle like vibe-kanban
      if (typeof entry.payload === 'string') {
        // Split multi-line content to prevent huge blocks
        const contentLines = entry.payload.split('\n');
        contentLines.forEach(line => {
          if (line.trim()) {  // Skip empty lines
            lines.push({
              content: line,
              channel: entry.channel as 'stdout' | 'stderr'
            });
          }
        });
      }
    } else if (entry.channel === 'normalized' && typeof entry.payload === 'object') {
      // Handle complex JSON payloads by extracting readable content
      const payload = entry.payload as unknown as Record<string, unknown>;
      
      // Handle user messages with tool results (like user's example)
      if (payload.type === 'user' && typeof payload.message === 'object' && payload.message !== null && 'content' in payload.message) {
        const content = (payload.message as Record<string, unknown>).content;
        if (Array.isArray(content)) {
          content.forEach((item: Record<string, unknown>, index: number) => {
            if (item.type === 'tool_result' && item.content) {
              // Extract just the actual content, split by lines
              const toolContent = typeof item.content === 'string' 
                ? item.content 
                : JSON.stringify(item.content, null, 2);
              
              // Add tool result header
              lines.push({
                content: `[Tool Result ${typeof item.tool_use_id === 'string' ? item.tool_use_id.slice(TOOL_USE_ID_DISPLAY_LENGTH) : index}]`,
                channel: 'stdout'
              });
              
              // Split content into readable lines
              const contentLines = toolContent.split('\n');
              contentLines.forEach(line => {
                if (line.trim()) {
                  lines.push({
                    content: line,
                    channel: 'stdout'
                  });
                }
              });
            } else if (item.type === 'text' && typeof item.text === 'string') {
              lines.push({
                content: `> ${item.text}`,
                channel: 'stdout'
              });
            }
          });
        } else if (typeof content === 'string') {
          lines.push({
            content: `> ${content}`,
            channel: 'stdout'
          });
        }
      } 
      // Handle assistant responses  
      else if (typeof payload.entry_type === 'object' && payload.entry_type !== null && 'type' in payload.entry_type && 
               (payload.entry_type as Record<string, unknown>).type === 'assistant_message' && typeof payload.content === 'string') {
        const contentLines = payload.content.split('\n');
        contentLines.forEach(line => {
          if (line.trim()) {
            lines.push({
              content: line,
              channel: 'stdout'
            });
          }
        });
      } 
      // Handle tool use
      else if (typeof payload.entry_type === 'object' && payload.entry_type !== null && 'type' in payload.entry_type && 
               (payload.entry_type as Record<string, unknown>).type === 'tool_use' && typeof payload.content === 'string') {
        const toolName = (payload.entry_type as Record<string, unknown>)?.tool_name || 'Tool';
        lines.push({
          content: `[${toolName}]`,
          channel: 'stdout'
        });
        
        const contentLines = payload.content.split('\n');
        contentLines.forEach(line => {
          if (line.trim()) {
            lines.push({
              content: `  ${line}`,
              channel: 'stdout'
            });
          }
        });
      }
      // Generic content fallback
      else if (payload.content && typeof payload.content === 'string') {
        const contentLines = payload.content.split('\n');
        contentLines.forEach(line => {
          if (line.trim()) {
            lines.push({
              content: line,
              channel: 'stdout'
            });
          }
        });
      }
      // Handle raw JSON objects that don't fit patterns
      else if (typeof payload === 'object') {
        try {
          const jsonStr = JSON.stringify(payload, null, 2);
          const jsonLines = jsonStr.split('\n');
          jsonLines.forEach(line => {
            if (line.trim()) {
              lines.push({
                content: line,
                channel: 'stderr'  // Use stderr color for raw JSON
              });
            }
          });
        } catch {
          lines.push({
            content: '[Complex Object - cannot display]',
            channel: 'stderr'
          });
        }
      }
    }
    
    return lines;
  });

  // Auto-scroll behavior exactly like vibe-kanban
  useEffect(() => {
    if (!didInitScroll.current && processedLogs.length > 0 && followOutput) {
      didInitScroll.current = true;
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: processedLogs.length - 1,
          align: 'end',
        });
      });
    }
  }, [processedLogs.length, followOutput]);

  useEffect(() => {
    const prev = prevLenRef.current;
    const grewBy = processedLogs.length - prev;
    prevLenRef.current = processedLogs.length;

    const LARGE_BURST = 10;
    if (grewBy >= LARGE_BURST && atBottom && processedLogs.length > 0 && followOutput) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: processedLogs.length - 1,
          align: 'end',
        });
      });
    }
  }, [processedLogs.length, atBottom, followOutput]);

  const formatLogLine = (logLine: { content: string; channel: 'stdout' | 'stderr' }, index: number) => {
    return (
      <RawLogText
        key={index}
        content={logLine.content}
        channel={logLine.channel}
        className="text-sm px-4 py-1"
      />
    );
  };

  return (
    <div className={`h-full ${className}`}>
      {processedLogs.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No logs available
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          className="flex-1 rounded-lg"
          data={processedLogs}
          itemContent={(index, logLine) => formatLogLine(logLine, index)}
          atBottomStateChange={setAtBottom}
          followOutput={followOutput && atBottom ? 'smooth' : false}
          increaseViewportBy={{ top: 0, bottom: 600 }}
        />
      )}
    </div>
  );
}