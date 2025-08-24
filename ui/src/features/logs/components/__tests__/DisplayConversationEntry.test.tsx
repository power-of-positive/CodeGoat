import { render, screen, fireEvent } from '@testing-library/react';
import DisplayConversationEntry from '../DisplayConversationEntry';
import type { NormalizedEntry } from '../../../../shared/types/logs';

describe('DisplayConversationEntry', () => {
  const baseEntry: NormalizedEntry = {
    timestamp: '2024-01-01T12:30:45Z',
    entry_type: { type: 'user_message' },
    content: 'Test message content'
  };

  it('should render basic user message', () => {
    render(<DisplayConversationEntry entry={baseEntry} index={0} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('should display timestamp when provided', () => {
    render(<DisplayConversationEntry entry={baseEntry} index={0} />);
    
    const timestamp = new Date(baseEntry.timestamp!).toLocaleTimeString();
    expect(screen.getByText(timestamp)).toBeInTheDocument();
  });

  it('should not display timestamp when not provided', () => {
    const entryWithoutTimestamp = { ...baseEntry, timestamp: undefined };
    
    render(<DisplayConversationEntry entry={entryWithoutTimestamp} index={0} />);
    
    // Only content should be present, no timestamp
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.queryByText(/\d+:\d+:\d+/)).not.toBeInTheDocument();
  });

  describe('entry type icons and styling', () => {
    const entryTypes = [
      { type: 'user_message', expectedText: 'User message' },
      { type: 'assistant_message', expectedText: 'Assistant response' },
      { type: 'system_message', expectedText: 'System message' },
      { type: 'thinking', expectedText: 'AI thinking' },
      { type: 'error_message', expectedText: 'Error occurred' }
    ] as const;

    entryTypes.forEach(({ type, expectedText }) => {
      it(`should render ${type} with correct icon`, () => {
        const entry = {
          ...baseEntry,
          entry_type: { type },
          content: expectedText
        };
        
        render(<DisplayConversationEntry entry={entry} index={0} />);
        
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });
  });

  describe('tool use entries', () => {
    it('should render file read tool use', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'Read',
          action_type: { action: 'file_read', path: '/test/file.txt' }
        },
        content: 'Reading file content...'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      expect(screen.getByText('Reading file content...')).toBeInTheDocument();
    });

    it('should render file write tool use', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'Write',
          action_type: { action: 'file_write', path: '/test/file.txt' }
        },
        content: 'Writing file content...'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      expect(screen.getByText('Writing file content...')).toBeInTheDocument();
    });

    it('should render command run tool use with mono font', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'Bash',
          action_type: { action: 'command_run', command: 'npm install' }
        },
        content: 'npm install'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      const content = screen.getByText('npm install');
      expect(content).toHaveClass('font-mono');
    });

    it('should render search tool use', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'Grep',
          action_type: { action: 'search', query: 'pattern' }
        },
        content: 'Searching for pattern...'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      expect(screen.getByText('Searching for pattern...')).toBeInTheDocument();
    });

    it('should render web fetch tool use', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'WebFetch',
          action_type: { action: 'web_fetch', url: 'https://example.com' }
        },
        content: 'Fetching web content...'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      expect(screen.getByText('Fetching web content...')).toBeInTheDocument();
    });

    it('should render task create tool use', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'Task',
          action_type: { action: 'task_create', description: 'Create new task' }
        },
        content: 'Creating task...'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      expect(screen.getByText('Creating task...')).toBeInTheDocument();
    });

    it('should render plan presentation with special styling', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'ExitPlanMode',
          action_type: { action: 'plan_presentation', plan: 'Implementation plan' }
        },
        content: '## Implementation Plan\n\n1. Step one\n2. Step two'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      // Check that the plan presentation styling is applied
      const content = screen.getByText(/Implementation Plan/);
      expect(content.parentElement).toHaveClass('border-l-4', 'border-blue-400');
    });
  });

  describe('TODO tool special handling', () => {
    const todoToolNames = ['TodoWrite', 'todowrite', 'TodoRead', 'todoread', 'todo_write', 'todo_read'];
    
    todoToolNames.forEach(toolName => {
      it(`should apply special styling for ${toolName}`, () => {
        const entry: NormalizedEntry = {
          ...baseEntry,
          entry_type: {
            type: 'tool_use',
            tool_name: toolName,
            action_type: { action: 'task_create', description: 'TODO task' }
          },
          content: 'TODO: Complete task'
        };
        
        render(<DisplayConversationEntry entry={entry} index={0} />);
        
        const content = screen.getByText('TODO: Complete task');
        expect(content).toHaveClass('font-mono', 'text-purple-700', 'bg-purple-50');
      });
    });
  });

  describe('error message handling', () => {
    it('should render single-line error message normally', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'error_message' },
        content: 'Single line error'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      expect(screen.getByText('Single line error')).toBeInTheDocument();
      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });

    it('should render multi-line error message with expand/collapse', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'error_message' },
        content: 'First line of error\nSecond line of error\nThird line of error'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      // Should show first line and "Show more" button
      expect(screen.getByText('First line of error')).toBeInTheDocument();
      expect(screen.getByText('Show more')).toBeInTheDocument();
      expect(screen.queryByText('Second line of error')).not.toBeInTheDocument();
    });

    it('should expand multi-line error when "Show more" is clicked', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'error_message' },
        content: 'First line of error\nSecond line of error\nThird line of error'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      fireEvent.click(screen.getByText('Show more'));
      
      expect(screen.getByText(/First line of error[\s\S]*Second line of error[\s\S]*Third line of error/)).toBeInTheDocument();
      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });

    it('should collapse multi-line error when "Show less" is clicked', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'error_message' },
        content: 'First line of error\nSecond line of error\nThird line of error'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      // Expand first
      fireEvent.click(screen.getByText('Show more'));
      expect(screen.getByText('Show less')).toBeInTheDocument();
      
      // Then collapse
      fireEvent.click(screen.getByText('Show less'));
      expect(screen.getByText('Show more')).toBeInTheDocument();
      expect(screen.queryByText('Show less')).not.toBeInTheDocument();
    });

    it('should make error icon clickable for multi-line errors', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'error_message' },
        content: 'First line of error\nSecond line of error'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      // Find the expand/collapse button (should be the first button)
      const buttons = screen.getAllByRole('button');
      const iconButton = buttons[0];
      expect(iconButton).toBeInTheDocument();
      
      // Clicking icon should expand
      fireEvent.click(iconButton);
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('should apply error message styling', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'error_message' },
        content: 'Error message'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      const content = screen.getByText('Error message');
      expect(content).toHaveClass('text-red-600', 'font-mono', 'bg-red-50');
    });
  });

  describe('markdown rendering', () => {
    it('should render assistant messages with markdown support', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'assistant_message' },
        content: 'This has **bold** formatting.'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      // Check that the content is rendered (markdown rendering depends on component implementation)
      expect(screen.getByText('bold')).toBeInTheDocument();
      const container = screen.getByText('bold').closest('div');
      expect(container).toHaveTextContent('This has');
    });

    it('should render markdown in plan presentation', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: {
          type: 'tool_use',
          tool_name: 'ExitPlanMode',
          action_type: { action: 'plan_presentation', plan: 'Bold plan with code' }
        },
        content: '**Bold plan** with `code`'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      const container = screen.getByText('Bold plan').parentElement;
      expect(container?.innerHTML).toContain('<strong>Bold plan</strong>');
      expect(container?.innerHTML).toContain('<code');
    });

    it('should not render markdown in other entry types', () => {
      const entry: NormalizedEntry = {
        ...baseEntry,
        entry_type: { type: 'user_message' },
        content: 'This has **bold** formatting that should not render.'
      };
      
      render(<DisplayConversationEntry entry={entry} index={0} />);
      
      // Should render as plain text
      expect(screen.getByText('This has **bold** formatting that should not render.')).toBeInTheDocument();
    });
  });

  it('should apply hover styling to container', () => {
    render(<DisplayConversationEntry entry={baseEntry} index={0} />);
    
    const container = screen.getByText('Test message content').closest('.px-4');
    expect(container).toHaveClass('hover:bg-gray-50', 'dark:hover:bg-gray-800/50');
  });

  it('should handle missing action_type gracefully', () => {
    const entry: NormalizedEntry = {
      ...baseEntry,
      entry_type: {
        type: 'tool_use',
        tool_name: 'UnknownTool',
        action_type: undefined as any
      },
      content: 'Unknown tool content'
    };
    
    render(<DisplayConversationEntry entry={entry} index={0} />);
    
    // Should not crash and should render content
    expect(screen.getByText('Unknown tool content')).toBeInTheDocument();
  });

  it('should handle unknown entry type with fallback icon', () => {
    const entry: NormalizedEntry = {
      ...baseEntry,
      entry_type: {
        type: 'unknown_type' as any
      },
      content: 'Unknown entry type content'
    };
    
    render(<DisplayConversationEntry entry={entry} index={0} />);
    
    // Should not crash and should render content with fallback icon
    expect(screen.getByText('Unknown entry type content')).toBeInTheDocument();
  });
});