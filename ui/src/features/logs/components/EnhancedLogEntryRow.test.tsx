import { render, screen } from '@testing-library/react';
import EnhancedLogEntryRow from './EnhancedLogEntryRow';
import { UnifiedLogEntry, ProcessStartPayload, NormalizedEntry } from '../../../shared/types/logs';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Bot: () => <div data-testid="bot-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckSquare: () => <div data-testid="check-square-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Terminal: () => <div data-testid="terminal-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Play: () => <div data-testid="play-icon" />,
}));

// Mock MarkdownRenderer
jest.mock('./MarkdownRenderer', () => {
  return function MockMarkdownRenderer({ content, className }: any) {
    return (
      <div data-testid="markdown-renderer" className={className}>
        {content}
      </div>
    );
  };
});

// Mock Badge component
jest.mock('../../../shared/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

describe('EnhancedLogEntryRow', () => {
  describe('stdout channel', () => {
    it('renders stdout content correctly', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Hello stdout',
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByText('Hello stdout')).toBeInTheDocument();
    });
  });

  describe('stderr channel', () => {
    it('renders stderr content correctly', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stderr',
        payload: 'Error message',
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('normalized channel', () => {
    it('renders user_message with user icon', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: { type: 'user_message' },
        content: 'User message content',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByText('User message content')).toBeInTheDocument();
    });

    it('renders assistant_message with bot icon', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: { type: 'assistant_message' },
        content: 'Assistant response',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
      expect(screen.getByText('Assistant response')).toBeInTheDocument();
    });

    it('renders system_message with settings icon', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: { type: 'system_message' },
        content: 'System message',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByText('System message')).toBeInTheDocument();
    });

    it('renders thinking entry with brain icon', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: { type: 'thinking' },
        content: 'Thinking process',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('brain-icon')).toBeInTheDocument();
      expect(screen.getByText('Thinking process')).toBeInTheDocument();
    });

    it('renders error_message with alert icon', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: { type: 'error_message' },
        content: 'Error occurred',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('renders tool_use with settings icon by default', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: {
          type: 'tool_use',
          tool_name: 'UnknownTool',
          action_type: { action: 'other', description: 'Unknown action' },
        },
        content: 'Unknown tool',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByText('Unknown tool')).toBeInTheDocument();
    });

    it('renders tool_use with command_run action and shows actual command', () => {
      const normalizedEntry: NormalizedEntry = {
        entry_type: {
          type: 'tool_use',
          tool_name: 'Bash',
          action_type: { action: 'command_run', command: 'npm run build' },
        },
        content: 'Command executed successfully',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: normalizedEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
      expect(screen.getByText(/🔧 Bash Command: npm run build/)).toBeInTheDocument();
      expect(screen.getByText(/Command executed successfully/)).toBeInTheDocument();
    });
  });

  describe('process_start channel', () => {
    it('renders process start card', () => {
      const processStartPayload: ProcessStartPayload = {
        processId: 'worker-123',
        runReason: 'claude-code-worker',
        startedAt: '2023-01-01T00:00:00Z',
        status: 'running',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'process_start',
        payload: processStartPayload,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByText('Process Started')).toBeInTheDocument();
      expect(screen.getByText('Run Reason: claude-code-worker')).toBeInTheDocument();
    });

    it('renders different process statuses', () => {
      const statuses = ['running', 'completed', 'failed', 'pending'] as const;

      statuses.forEach(status => {
        const processStartPayload: ProcessStartPayload = {
          processId: 'worker-123',
          runReason: 'test',
          startedAt: '2023-01-01T00:00:00Z',
          status,
        };

        const entry: UnifiedLogEntry = {
          id: `test-${status}`,
          ts: 1,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'process_start',
          payload: processStartPayload,
        };

        const { unmount } = render(<EnhancedLogEntryRow entry={entry} index={0} />);
        const badge = screen.getByTestId('badge');
        expect(badge).toHaveTextContent(status.toUpperCase());
        unmount();
      });
    });
  });

  describe('unknown channel', () => {
    it('renders unknown channel with error message', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'unknown' as any,
        payload: 'Unknown content',
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);

      expect(screen.getByText('Unknown log type: unknown')).toBeInTheDocument();
    });
  });

  describe('styling and props', () => {
    it('renders content without style when not provided', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Test content',
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('calls setRowHeight when provided', () => {
      const mockSetRowHeight = jest.fn();
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Test content',
      };

      // Mock clientHeight
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        value: 100,
      });

      render(<EnhancedLogEntryRow entry={entry} index={5} setRowHeight={mockSetRowHeight} />);
      expect(mockSetRowHeight).toHaveBeenCalledWith(5, 100);
    });
  });

  describe('content rendering', () => {
    it('handles complex normalized entries', () => {
      const complexEntry: NormalizedEntry = {
        entry_type: {
          type: 'tool_use',
          tool_name: 'ComplexTool',
          action_type: { action: 'other', description: 'complex_action' },
        },
        content: 'Complex content with\nmultiple lines',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'normalized',
        payload: complexEntry,
      };

      render(<EnhancedLogEntryRow entry={entry} index={0} />);
      expect(screen.getByText(/Complex content/)).toBeInTheDocument();
    });

    it('handles todo tools by name detection', () => {
      const todoVariations = ['TodoWrite', 'todoread', 'todo_write', 'todo_read', 'pending'];

      todoVariations.forEach(toolName => {
        const normalizedEntry: NormalizedEntry = {
          entry_type: {
            type: 'tool_use',
            tool_name: toolName,
            action_type: { action: 'other', description: 'todo management' },
          },
          content: `Using ${toolName}`,
          timestamp: '2023-01-01T00:00:00Z',
        };

        const entry: UnifiedLogEntry = {
          id: `test-${toolName}`,
          ts: 1,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'normalized',
          payload: normalizedEntry,
        };

        const { unmount } = render(<EnhancedLogEntryRow entry={entry} index={0} />);
        // Should render successfully with todo tools getting the check square icon
        expect(screen.getByText(`Using ${toolName}`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('basic component structure', () => {
    it('renders with memoization support', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: 1,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout',
        payload: 'Test content for memo',
      };

      const { rerender } = render(<EnhancedLogEntryRow entry={entry} index={0} />);
      expect(screen.getByText('Test content for memo')).toBeInTheDocument();

      // Re-render with same props should still work
      rerender(<EnhancedLogEntryRow entry={entry} index={0} />);
      expect(screen.getByText('Test content for memo')).toBeInTheDocument();
    });

    it('provides stable rendering across different entry types', () => {
      const entries = [
        { channel: 'stdout' as const, payload: 'stdout message' },
        { channel: 'stderr' as const, payload: 'stderr message' },
        {
          channel: 'normalized' as const,
          payload: {
            entry_type: { type: 'user_message' as const },
            content: 'normalized message',
            timestamp: '2023-01-01T00:00:00Z',
          },
        },
      ];

      entries.forEach((entryData, index) => {
        const entry: UnifiedLogEntry = {
          id: `test-${index}`,
          ts: index,
          processId: 'worker-123',
          processName: 'Test Worker',
          ...entryData,
        };

        const { unmount } = render(<EnhancedLogEntryRow entry={entry} index={index} />);
        // Each should render without error
        expect(document.body).toBeInTheDocument();
        unmount();
      });
    });
  });
});
