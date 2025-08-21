import { render, screen } from '@testing-library/react';
import LogEntryRow from '../LogEntryRow';
import type { UnifiedLogEntry, ProcessStartPayload } from '../../../types/logs';
import type { NormalizedEntry } from '../../../../shared/types';

const mockSetRowHeight = jest.fn();

describe('LogEntryRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UnifiedLogEntry handling', () => {
    it('should render stdout UnifiedLogEntry', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-1',
        ts: Date.now(),
        processId: 'proc-1',
        processName: 'test-process',
        channel: 'stdout',
        payload: 'Test stdout message'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Test stdout message')).toBeInTheDocument();
    });

    it('should render stderr UnifiedLogEntry', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-2',
        ts: Date.now(),
        processId: 'proc-1',
        processName: 'test-process',
        channel: 'stderr',
        payload: 'Test error message'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render process_start UnifiedLogEntry', () => {
      const payload: ProcessStartPayload = {
        runReason: 'codingagent',
        startedAt: '2024-01-01T12:30:45Z',
        status: 'running',
        processId: 'proc-1'
      };

      const entry: UnifiedLogEntry = {
        id: 'test-3',
        ts: Date.now(),
        processId: 'proc-1',
        processName: 'test-process',
        channel: 'process_start',
        payload
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Coding Agent')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    it('should render normalized UnifiedLogEntry', () => {
      const normalizedEntry: NormalizedEntry = {
        timestamp: '2024-01-01T12:30:45Z',
        entry_type: { type: 'user_message' },
        content: 'Test normalized message'
      };

      const entry: UnifiedLogEntry = {
        id: 'test-4',
        ts: Date.now(),
        processId: 'proc-1',
        processName: 'test-process',
        channel: 'normalized',
        payload: normalizedEntry
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Test normalized message')).toBeInTheDocument();
    });

    it('should render unknown channel with error message', () => {
      const entry: UnifiedLogEntry = {
        id: 'test-5',
        ts: Date.now(),
        processId: 'proc-1',
        processName: 'test-process',
        channel: 'unknown' as any,
        payload: 'Some payload'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Unknown log channel: unknown')).toBeInTheDocument();
    });
  });

  describe('String entry handling', () => {
    it('should parse simple string entry', () => {
      const entry = 'Simple log message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Simple log message')).toBeInTheDocument();
    });

    it('should parse entry with timestamp', () => {
      const entry = '10:30:45 AM Log message with timestamp';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('10:30:45 AM')).toBeInTheDocument();
      expect(screen.getByText('Log message with timestamp')).toBeInTheDocument();
    });

    it('should parse entry with level', () => {
      const entry = '10:30:45 AM [ERROR] Error message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('10:30:45 AM')).toBeInTheDocument();
      expect(screen.getByText('ERROR')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should parse entry with prefix', () => {
      const entry = '10:30:45 AM STDOUT: Output message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('10:30:45 AM')).toBeInTheDocument();
      expect(screen.getByText('STDOUT:')).toBeInTheDocument();
      expect(screen.getByText('Output message')).toBeInTheDocument();
    });

    it('should parse structured log without timestamp', () => {
      const entry = '[INFO] Information message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('INFO')).toBeInTheDocument();
      expect(screen.getByText('Information message')).toBeInTheDocument();
    });

    it('should parse prefixed content without timestamp', () => {
      const entry = 'STDERR: Error output';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('STDERR:')).toBeInTheDocument();
      expect(screen.getByText('Error output')).toBeInTheDocument();
    });

    it('should clean HTML entities', () => {
      const entry = 'Message with &quot;quotes&quot; and &amp; symbols';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Message with "quotes" and & symbols')).toBeInTheDocument();
    });

    it('should handle escaped characters', () => {
      const entry = 'Message with \\n newlines and \\" quotes';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText(/Message with.*newlines and.*quotes/)).toBeInTheDocument();
    });
  });

  describe('Level colors', () => {
    const levels = [
      { level: 'ERROR', expectedClass: 'bg-red-600' },
      { level: 'err', expectedClass: 'bg-red-600' },
      { level: 'WARN', expectedClass: 'bg-yellow-600' },
      { level: 'warning', expectedClass: 'bg-yellow-600' },
      { level: 'INFO', expectedClass: 'bg-blue-600' },
      { level: 'DEBUG', expectedClass: 'bg-gray-600' },
      { level: 'OTHER', expectedClass: 'bg-green-600' }
    ];

    levels.forEach(({ level, expectedClass }) => {
      it(`should apply correct color for ${level} level`, () => {
        const entry = `[${level}] Test message`;
        
        render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
        
        const levelElement = screen.getByText(level);
        expect(levelElement).toHaveClass(expectedClass);
      });
    });
  });

  describe('Prefix handling', () => {
    it('should render STDERR prefix correctly', () => {
      const entry = 'STDERR: Error message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      // Check individual parts since they're in separate spans
      expect(screen.getByText('STDERR:')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should render STDOUT prefix correctly', () => {
      const entry = 'STDOUT: Output message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      // Check individual parts since they're in separate spans
      expect(screen.getByText('STDOUT:')).toBeInTheDocument();
      expect(screen.getByText('Output message')).toBeInTheDocument();
    });
  });

  describe('LogEntry object handling', () => {
    it('should render stdout LogEntry', () => {
      const entry = {
        id: 'log-1',
        channel: 'stdout' as const,
        payload: 'Stdout message',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Stdout message')).toBeInTheDocument();
    });

    it('should render stderr LogEntry', () => {
      const entry = {
        id: 'log-2',
        channel: 'stderr' as const,
        payload: 'Error message',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should render process_start LogEntry', () => {
      const entry = {
        id: 'log-3',
        channel: 'process_start' as const,
        payload: {
          runReason: 'worker',
          startedAt: '2024-01-01T12:30:45Z',
          status: 'completed' as const,
          processId: 'proc-123'
        },
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Claude Worker')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should render info LogEntry', () => {
      const entry = {
        id: 'log-4',
        channel: 'info' as const,
        payload: 'Information message',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('[INFO] Information message')).toBeInTheDocument();
    });

    it('should render error LogEntry', () => {
      const entry = {
        id: 'log-5',
        channel: 'error' as const,
        payload: 'Error occurred',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('[ERROR] Error occurred')).toBeInTheDocument();
    });

    it('should render warn LogEntry', () => {
      const entry = {
        id: 'log-6',
        channel: 'warn' as const,
        payload: 'Warning message',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('[WARN] Warning message')).toBeInTheDocument();
    });

    it('should render debug LogEntry', () => {
      const entry = {
        id: 'log-7',
        channel: 'debug' as const,
        payload: 'Debug message',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('[DEBUG] Debug message')).toBeInTheDocument();
    });

    it('should handle unknown LogEntry channel', () => {
      const entry = {
        id: 'log-8',
        channel: 'unknown' as any,
        payload: 'Unknown message',
        timestamp: '2024-01-01T12:30:45Z'
      };

      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Unknown log type: unknown')).toBeInTheDocument();
    });
  });

  describe('Content handling', () => {
    it('should display log content properly', () => {
      const entry = 'Simple log message';
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText('Simple log message')).toBeInTheDocument();
    });

    it('should handle complex content gracefully', () => {
      const complexContent = 'Message with {"json": "content"} embedded';
      const entry = `Info: ${complexContent}`;
      
      render(<LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />);
      
      expect(screen.getByText(/Message with.*json.*content/)).toBeInTheDocument();
    });
  });

  describe('Style application', () => {
    it('should apply style when provided', () => {
      const entry = 'Test message';
      const style = { color: 'red', fontSize: '14px' };
      
      const { container } = render(
        <LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} style={style} />
      );
      
      const styledDiv = container.firstChild as HTMLElement;
      expect(styledDiv.style.color).toBe('red');
      expect(styledDiv.style.fontSize).toBe('14px');
    });

    it('should not apply style wrapper when not provided', () => {
      const entry = 'Test message';
      
      const { container } = render(
        <LogEntryRow entry={entry} index={0} setRowHeight={mockSetRowHeight} />
      );
      
      // Should not have a wrapper div with inline styles
      expect(container.firstChild).toHaveClass('px-3');
    });
  });

  describe('Row height callback', () => {
    it('should call setRowHeight when component mounts', () => {
      const entry = 'Test message';
      
      render(<LogEntryRow entry={entry} index={5} setRowHeight={mockSetRowHeight} />);
      
      expect(mockSetRowHeight).toHaveBeenCalledWith(5, expect.any(Number));
    });
  });


  it('should be memoized for performance', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const MemoizedLogEntryRow = require('../LogEntryRow').default;
    expect(MemoizedLogEntryRow.$$typeof).toBe(Symbol.for('react.memo'));
  });
});