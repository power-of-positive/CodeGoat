import { render, screen } from '@testing-library/react';
import StderrEntry from '../StderrEntry';

// Mock RawLogText component
jest.mock('../RawLogText', () => {
  return {
    __esModule: true,
    default: ({ content, channel }: { content: string; channel: string }) => (
      <span data-testid="raw-log-text" data-channel={channel}>
        {content}
      </span>
    ),
  };
});

describe('StderrEntry', () => {
  it('should render simple text content using RawLogText', () => {
    const content = 'Error message';

    render(<StderrEntry content={content} />);

    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getByTestId('raw-log-text')).toHaveAttribute('data-channel', 'stderr');
  });

  it('should apply correct container styling', () => {
    const content = 'Error content';

    const { container } = render(<StderrEntry content={content} />);

    const containerDiv = container.firstChild;
    expect(containerDiv).toHaveClass('flex', 'gap-2', 'px-4');
  });

  it('should handle empty content', () => {
    render(<StderrEntry content="" />);

    expect(screen.getByTestId('raw-log-text')).toBeInTheDocument();
    expect(screen.getByTestId('raw-log-text')).toHaveAttribute('data-channel', 'stderr');
  });

  it('should handle timestamp prop for backward compatibility', () => {
    const content = 'Error message';
    const timestamp = '14:25:30';

    // Should not fail when timestamp is provided (for backward compatibility)
    render(<StderrEntry content={content} timestamp={timestamp} />);

    expect(screen.getByText(content)).toBeInTheDocument();
    // Timestamp is ignored in the new vibe-kanban style implementation
  });

  it('should handle multiline content', () => {
    const content = 'Error line 1\nError line 2\nError line 3';

    render(<StderrEntry content={content} />);

    const rawLogText = screen.getByTestId('raw-log-text');
    expect(rawLogText).toBeInTheDocument();
    expect(rawLogText.textContent).toContain('Error line 1');
    expect(rawLogText.textContent).toContain('Error line 2');
    expect(rawLogText.textContent).toContain('Error line 3');
  });

  it('should handle special characters and ANSI codes', () => {
    const content = '\x1b[31mRed error text\x1b[0m';

    render(<StderrEntry content={content} />);

    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('should render JSON content as-is without parsing', () => {
    const jsonContent = JSON.stringify({ error: 'Should not be extracted' });

    render(<StderrEntry content={jsonContent} />);

    // Should render the raw JSON string, not the extracted content
    expect(screen.getByText(jsonContent)).toBeInTheDocument();
    expect(screen.queryByText('Should not be extracted')).not.toBeInTheDocument();
  });
});
