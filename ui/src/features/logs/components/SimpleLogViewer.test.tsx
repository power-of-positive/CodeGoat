import { render, screen } from '@testing-library/react';
import SimpleLogViewer from './SimpleLogViewer';
import type { UnifiedLogEntry } from '../../../shared/types/logs';

// Mock Virtuoso
jest.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent, atBottomStateChange, className }: any) => (
    <div data-testid="virtuoso" className={className}>
      {data.map((item: any, index: number) => (
        <div key={index} data-testid={`virtuoso-item-${index}`}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  ),
}));

// Mock RawLogText
jest.mock('./RawLogText', () => {
  return function MockRawLogText({ content, channel, className }: any) {
    return (
      <div data-testid="raw-log-text" data-channel={channel} className={className}>
        {content}
      </div>
    );
  };
});

describe('SimpleLogViewer', () => {
  describe('basic rendering', () => {
    it('renders no logs message when entries are empty', () => {
      render(<SimpleLogViewer entries={[]} />);
      
      expect(screen.getByText('No logs available')).toBeInTheDocument();
      expect(screen.queryByTestId('virtuoso')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Test log'
      }];

      const { container } = render(
        <SimpleLogViewer entries={entries} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('stdout and stderr entries', () => {
    it('renders simple stdout entries', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Hello stdout'
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
      expect(screen.getByText('Hello stdout')).toBeInTheDocument();
      expect(screen.getByTestId('raw-log-text')).toHaveAttribute('data-channel', 'stdout');
    });

    it('renders simple stderr entries', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-2',
        ts: 2,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stderr',
        payload: 'Error message'
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByTestId('raw-log-text')).toHaveAttribute('data-channel', 'stderr');
    });

    it('splits multi-line stdout content', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-3',
        ts: 3,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Line 1\nLine 2\nLine 3'
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('skips empty lines', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-4',
        ts: 4,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Line 1\n\n\nLine 2\n   \nLine 3'
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
      // Should only have 3 items, not 6
      expect(screen.getAllByTestId(/virtuoso-item-/)).toHaveLength(3);
    });
  });

  describe('normalized entries', () => {
    it('handles user messages with tool results', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-5',
        ts: 5,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool_123456789',
                content: 'Tool output line 1\nTool output line 2'
              },
              {
                type: 'text',
                text: 'User comment'
              }
            ]
          }
        } as any
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[Tool Result 23456789]')).toBeInTheDocument();
      expect(screen.getByText('Tool output line 1')).toBeInTheDocument();
      expect(screen.getByText('Tool output line 2')).toBeInTheDocument();
      expect(screen.getByText('> User comment')).toBeInTheDocument();
    });

    it('handles user messages with string content', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-6',
        ts: 6,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          type: 'user',
          message: {
            content: 'Simple user message'
          }
        } as any
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('> Simple user message')).toBeInTheDocument();
    });

    it('handles tool results with JSON content', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-7',
        ts: 7,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool_987',
                content: { result: 'success', data: [1, 2, 3] }
              }
            ]
          }
        } as any
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[Tool Result tool_987]')).toBeInTheDocument();
      expect(screen.getByText(/result.*success/)).toBeInTheDocument();
      expect(screen.getByText(/"data"/)).toBeInTheDocument();
    });

    it('handles assistant messages', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-8',
        ts: 8,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          entry_type: { type: 'assistant_message' },
          content: 'Assistant response\nMultiple lines',
          timestamp: '2023-01-01T00:00:00Z'
        }
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('Assistant response')).toBeInTheDocument();
      expect(screen.getByText('Multiple lines')).toBeInTheDocument();
    });

    it('handles tool use entries', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-9',
        ts: 9,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          entry_type: { 
            type: 'tool_use',
            tool_name: 'TestTool',
            action_type: { action: 'other', description: 'Tool action' }
          },
          content: 'Tool execution\nSecond line',
          timestamp: '2023-01-01T00:00:00Z'
        }
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[TestTool]')).toBeInTheDocument();
      expect(screen.getByText(/Tool execution/)).toBeInTheDocument();
      expect(screen.getByText(/Second line/)).toBeInTheDocument();
    });

    it('handles tool use without tool name', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-10',
        ts: 10,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          entry_type: { 
            type: 'tool_use',
            tool_name: 'Tool',
            action_type: { action: 'other', description: 'Tool action' }
          },
          content: 'Tool content',
          timestamp: '2023-01-01T00:00:00Z'
        }
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[Tool]')).toBeInTheDocument();
      expect(screen.getByText(/Tool content/)).toBeInTheDocument();
    });

    it('handles generic content with string', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-11',
        ts: 11,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          entry_type: { type: 'assistant_message' },
          content: 'Generic content\nWith multiple lines',
          timestamp: '2023-01-01T00:00:00Z'
        }
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('Generic content')).toBeInTheDocument();
      expect(screen.getByText('With multiple lines')).toBeInTheDocument();
    });

    it('handles complex JSON objects', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-12',
        ts: 12,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          complexData: {
            nested: 'value',
            array: [1, 2, 3]
          },
          metadata: 'test'
        } as any
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      // Should render as JSON with stderr channel
      const rawLogTexts = screen.getAllByTestId('raw-log-text');
      expect(rawLogTexts.some(el => el.getAttribute('data-channel') === 'stderr')).toBe(true);
      expect(screen.getByText(/complexData/)).toBeInTheDocument();
    });

    it('handles unparseable objects gracefully', () => {
      // Create a circular reference object
      const circularObj: any = { prop: 'value' };
      circularObj.circular = circularObj;

      const entries: UnifiedLogEntry[] = [{
        id: 'test-13',
        ts: 13,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: circularObj
      }];

      // Mock JSON.stringify to throw error
      const originalStringify = JSON.stringify;
      jest.spyOn(JSON, 'stringify').mockImplementation(() => {
        throw new Error('Circular reference');
      });

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[Complex Object - cannot display]')).toBeInTheDocument();
      
      // Restore original
      JSON.stringify = originalStringify;
    });
  });

  describe('multiple entries', () => {
    it('processes multiple entries correctly', () => {
      const entries: UnifiedLogEntry[] = [
        {
          id: 'test-14',
          ts: 14,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'stdout',
          payload: 'First entry'
        },
        {
          id: 'test-15',
          ts: 15,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'stderr',
          payload: 'Error entry'
        },
        {
          id: 'test-16',
          ts: 16,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'normalized',
          payload: {
            entry_type: { type: 'assistant_message' },
            content: 'Assistant message',
            timestamp: '2023-01-01T00:00:00Z'
          }
        }
      ];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('First entry')).toBeInTheDocument();
      expect(screen.getByText('Error entry')).toBeInTheDocument();
      expect(screen.getByText('Assistant message')).toBeInTheDocument();
    });

    it('flattens multi-line entries correctly', () => {
      const entries: UnifiedLogEntry[] = [
        {
          id: 'test-17',
          ts: 17,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'stdout',
          payload: 'Line 1\nLine 2'
        },
        {
          id: 'test-18',
          ts: 18,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'stderr',
          payload: 'Error 1\nError 2'
        }
      ];

      render(<SimpleLogViewer entries={entries} />);
      
      // Should have 4 virtuoso items (2 lines each from 2 entries)
      expect(screen.getAllByTestId(/virtuoso-item-/)).toHaveLength(4);
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });
  });

  describe('props and configuration', () => {
    it('handles followOutput prop', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-19',
        ts: 19,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Test content'
      }];

      const { rerender } = render(
        <SimpleLogViewer entries={entries} followOutput={false} />
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
      
      // Re-render with followOutput enabled
      rerender(<SimpleLogViewer entries={entries} followOutput={true} />);
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with default props', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-20',
        ts: 20,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Default props test'
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('Default props test')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty string payload', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-21',
        ts: 21,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: ''
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      // Should show no logs since empty string gets filtered out
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });

    it('handles whitespace-only payload', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-22',
        ts: 22,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: '   \n  \t  \n   '
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      // Should show no logs since whitespace-only lines get filtered out
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });

    it('handles non-string, non-object payload', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-23',
        ts: 23,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 42 as any  // Invalid payload type
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      // Should show no logs since number payload isn't handled
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });

    it('handles unknown channel types', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-24',
        ts: 24,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'unknown_channel' as any,
        payload: 'Unknown content'
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      // Should show no logs since unknown channel isn't processed
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });
  });

  describe('tool result edge cases', () => {
    it('handles tool result without tool_use_id', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-25',
        ts: 25,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                content: 'Tool content without ID'
              }
            ]
          }
        } as any
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[Tool Result 0]')).toBeInTheDocument();
      expect(screen.getByText('Tool content without ID')).toBeInTheDocument();
    });

    it('handles tool result with short tool_use_id', () => {
      const entries: UnifiedLogEntry[] = [{
        id: 'test-26',
        ts: 26,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'short',
                content: 'Short ID tool content'
              }
            ]
          }
        } as any
      }];

      render(<SimpleLogViewer entries={entries} />);
      
      expect(screen.getByText('[Tool Result short]')).toBeInTheDocument();
      expect(screen.getByText('Short ID tool content')).toBeInTheDocument();
    });
  });
});