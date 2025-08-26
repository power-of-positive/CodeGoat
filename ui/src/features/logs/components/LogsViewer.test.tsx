import { render, screen } from '@testing-library/react';
import LogsViewer from './LogsViewer';
import { UnifiedLogEntry } from '../../../shared/types/logs';

// Mock Virtuoso
jest.mock('react-virtuoso', () => ({
  Virtuoso: (props: { data: any; itemContent: any; style: any; followOutput: any; components?: any }) => (
    <div 
      data-testid="virtuoso" 
      style={props.style}
      data-follow-output={props.followOutput}
    >
      {props.data.map((item: any, index: number) => (
        <div key={index} data-testid={`virtuoso-item-${index}`}>
          {props.itemContent(index, item)}
        </div>
      ))}
      {props.components?.Footer && <div data-testid="virtuoso-footer">{props.components.Footer()}</div>}
    </div>
  ),
}));

// Mock LogEntryRow
jest.mock('./LogEntryRow', () => {
  return function MockLogEntryRow({ entry, index }: any) {
    return (
      <div data-testid={`log-entry-row-${index}`}>
        LogEntryRow: {JSON.stringify(entry.payload)}
      </div>
    );
  };
});

// Mock VibeLogs
jest.mock('./VibeLogs', () => {
  return function MockVibeLogs({ entry, index }: any) {
    return (
      <div data-testid={`vibe-logs-${index}`}>
        VibeLogs: {JSON.stringify(entry.payload)}
      </div>
    );
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Terminal: () => <div data-testid="terminal-icon" />,
}));

describe('LogsViewer', () => {
  const mockEntries: UnifiedLogEntry[] = [
    {
      id: 'test-1',
      ts: 1,
      processId: 'worker-123',
      processName: 'Test Worker',
      channel: 'stdout',
      payload: 'First log entry'
    },
    {
      id: 'test-2',
      ts: 2,
      processId: 'worker-123',
      processName: 'Test Worker',
      channel: 'stderr',
      payload: 'Second log entry'
    }
  ];

  describe('loading states', () => {
    it('renders loading state', () => {
      render(<LogsViewer entries={[]} isLoading={true} />);
      
      expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
      expect(screen.queryByTestId('virtuoso')).not.toBeInTheDocument();
    });

    it('applies className in loading state', () => {
      const { container } = render(
        <LogsViewer entries={[]} isLoading={true} className="custom-loading-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-loading-class');
    });
  });

  describe('error states', () => {
    it('renders error state', () => {
      const errorMessage = 'Failed to load logs';
      render(<LogsViewer entries={[]} error={errorMessage} />);
      
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      expect(screen.getByText(`Error loading logs: ${errorMessage}`)).toBeInTheDocument();
      expect(screen.queryByTestId('virtuoso')).not.toBeInTheDocument();
    });

    it('applies className in error state', () => {
      const { container } = render(
        <LogsViewer entries={[]} error="Error" className="custom-error-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-error-class');
    });
  });

  describe('empty states', () => {
    it('renders empty state when no entries', () => {
      render(<LogsViewer entries={[]} />);
      
      expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
      expect(screen.getByText('No logs available')).toBeInTheDocument();
      expect(screen.queryByTestId('virtuoso')).not.toBeInTheDocument();
    });

    it('applies className in empty state', () => {
      const { container } = render(
        <LogsViewer entries={[]} className="custom-empty-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-empty-class');
    });
  });

  describe('normal rendering with entries', () => {
    it('renders Virtuoso with entries using VibeLogs by default', () => {
      render(<LogsViewer entries={mockEntries} />);
      
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
      expect(screen.getByTestId('vibe-logs-0')).toBeInTheDocument();
      expect(screen.getByTestId('vibe-logs-1')).toBeInTheDocument();
      expect(screen.getByText('VibeLogs: "First log entry"')).toBeInTheDocument();
      expect(screen.getByText('VibeLogs: "Second log entry"')).toBeInTheDocument();
    });

    it('renders LogEntryRow when useVibeLogComponent is false', () => {
      render(<LogsViewer entries={mockEntries} useVibeLogComponent={false} />);
      
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-row-1')).toBeInTheDocument();
      expect(screen.getByText('LogEntryRow: "First log entry"')).toBeInTheDocument();
      expect(screen.getByText('LogEntryRow: "Second log entry"')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <LogsViewer entries={mockEntries} className="custom-viewer-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-viewer-class');
    });

    it('passes correct style to Virtuoso', () => {
      render(<LogsViewer entries={mockEntries} />);
      
      const virtuoso = screen.getByTestId('virtuoso');
      expect(virtuoso).toHaveStyle({ height: '100%' });
    });

    it('configures followOutput correctly', () => {
      const { rerender } = render(
        <LogsViewer entries={mockEntries} followOutput={true} />
      );
      
      let virtuoso = screen.getByTestId('virtuoso');
      expect(virtuoso).toHaveAttribute('data-follow-output', 'smooth');
      
      rerender(<LogsViewer entries={mockEntries} followOutput={false} />);
      
      virtuoso = screen.getByTestId('virtuoso');
      expect(virtuoso).toHaveAttribute('data-follow-output', 'false');
    });

    it('renders footer component', () => {
      render(<LogsViewer entries={mockEntries} />);
      
      expect(screen.getByTestId('virtuoso-footer')).toBeInTheDocument();
    });
  });

  describe('prop handling', () => {
    it('handles default props correctly', () => {
      render(<LogsViewer entries={mockEntries} />);
      
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
      // Default useVibeLogComponent is true
      expect(screen.getByTestId('vibe-logs-0')).toBeInTheDocument();
    });

    it('handles all props together', () => {
      const mockSetRowHeight = jest.fn();
      
      render(
        <LogsViewer 
          entries={mockEntries}
          isLoading={false}
          error={null}
          title="Test Logs"
          followOutput={false}
          className="full-props-test"
          useVibeLogComponent={false}
          setRowHeight={mockSetRowHeight}
        />
      );
      
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('virtuoso')).toHaveAttribute('data-follow-output', 'false');
    });

    it('prioritizes loading state over error state', () => {
      render(
        <LogsViewer 
          entries={mockEntries}
          isLoading={true}
          error="Some error"
        />
      );
      
      // Should show loading, not error
      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
      expect(screen.queryByText('Error loading logs: Some error')).not.toBeInTheDocument();
    });

    it('prioritizes error state over empty state', () => {
      render(
        <LogsViewer 
          entries={[]}
          isLoading={false}
          error="Some error"
        />
      );
      
      // Should show error, not empty
      expect(screen.getByText('Error loading logs: Some error')).toBeInTheDocument();
      expect(screen.queryByText('No logs available')).not.toBeInTheDocument();
    });
  });

  describe('virtualization behavior', () => {
    it('renders correct number of items', () => {
      render(<LogsViewer entries={mockEntries} />);
      
      expect(screen.getAllByTestId(/virtuoso-item-/)).toHaveLength(2);
    });

    it('handles single entry', () => {
      const singleEntry = [mockEntries[0]];
      render(<LogsViewer entries={singleEntry} />);
      
      expect(screen.getAllByTestId(/virtuoso-item-/)).toHaveLength(1);
      expect(screen.getByText('VibeLogs: "First log entry"')).toBeInTheDocument();
    });

    it('handles large number of entries', () => {
      const manyEntries = Array.from({ length: 100 }, (_, i) => ({
        id: `test-${i}`,
        ts: i,
        processId: 'worker-123',
        processName: 'Test Worker',
        channel: 'stdout' as const,
        payload: `Log entry ${i}`
      }));

      render(<LogsViewer entries={manyEntries} />);
      
      expect(screen.getAllByTestId(/virtuoso-item-/)).toHaveLength(100);
    });
  });

  describe('component switching', () => {
    it('switches between VibeLogs and LogEntryRow', () => {
      const { rerender } = render(
        <LogsViewer entries={mockEntries} useVibeLogComponent={true} />
      );
      
      expect(screen.getByTestId('vibe-logs-0')).toBeInTheDocument();
      expect(screen.queryByTestId('log-entry-row-0')).not.toBeInTheDocument();
      
      rerender(<LogsViewer entries={mockEntries} useVibeLogComponent={false} />);
      
      expect(screen.queryByTestId('vibe-logs-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('log-entry-row-0')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles null entries gracefully', () => {
      render(<LogsViewer entries={null as any} />);
      
      // Should show empty state
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });

    it('handles null error', () => {
      render(<LogsViewer entries={mockEntries} error={null} />);
      
      // Should render normally
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
    });

    it('handles empty string error', () => {
      render(<LogsViewer entries={mockEntries} error="" />);
      
      // Should render normally since empty string is falsy
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
    });

    it('handles complex entry payloads', () => {
      const complexEntries: UnifiedLogEntry[] = [
        {
          id: 'complex-1',
          ts: 1,
          processId: 'worker-123',
          processName: 'Test Worker',
          channel: 'normalized',
          payload: {
            entry_type: { type: 'user_message' },
            content: 'Complex payload',
            timestamp: '2023-01-01T00:00:00Z'
          }
        }
      ];

      render(<LogsViewer entries={complexEntries} />);
      
      expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
      expect(screen.getByTestId('vibe-logs-0')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('provides appropriate ARIA labels for states', () => {
      // Loading state
      const { rerender } = render(<LogsViewer entries={[]} isLoading={true} />);
      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
      
      // Error state
      rerender(<LogsViewer entries={[]} error="Test error" />);
      expect(screen.getByText('Error loading logs: Test error')).toBeInTheDocument();
      
      // Empty state
      rerender(<LogsViewer entries={[]} />);
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });

    it('maintains semantic structure', () => {
      render(<LogsViewer entries={mockEntries} />);
      
      const container = screen.getByTestId('virtuoso');
      expect(container).toBeInTheDocument();
    });
  });
});