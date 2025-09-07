import { render, screen } from '@testing-library/react';
import StdoutEntry from '../StdoutEntry';

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

describe('StdoutEntry', () => {
  it('should render simple text content using RawLogText', () => {
    const content = 'Simple stdout message';

    render(<StdoutEntry content={content} />);

    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getByTestId('raw-log-text')).toHaveAttribute('data-channel', 'stdout');
  });

  it('should render JSON content as-is without parsing', () => {
    const jsonContent = JSON.stringify({ content: 'Should not be extracted' });

    render(<StdoutEntry content={jsonContent} />);

    // Should render the raw JSON string, not the extracted content
    expect(screen.getByText(jsonContent)).toBeInTheDocument();
    expect(screen.queryByText('Should not be extracted')).not.toBeInTheDocument();
  });

  it('should apply correct container styling', () => {
    const content = 'Test content';

    const { container } = render(<StdoutEntry content={content} />);

    const containerDiv = container.firstChild;
    expect(containerDiv).toHaveClass('flex', 'gap-2', 'px-4');
  });

  it('should handle empty content', () => {
    render(<StdoutEntry content="" />);

    expect(screen.getByTestId('raw-log-text')).toBeInTheDocument();
    expect(screen.getByTestId('raw-log-text')).toHaveAttribute('data-channel', 'stdout');
  });

  it('should handle timestamp prop for backward compatibility', () => {
    const content = 'Test message';
    const timestamp = '14:25:30';

    // Should not fail when timestamp is provided (for backward compatibility)
    render(<StdoutEntry content={content} timestamp={timestamp} />);

    expect(screen.getByText(content)).toBeInTheDocument();
    // Timestamp is ignored in the new vibe-kanban style implementation
  });

  it('should handle multiline content', () => {
    const content = 'Line 1\nLine 2\nLine 3';

    render(<StdoutEntry content={content} />);

    const rawLogText = screen.getByTestId('raw-log-text');
    expect(rawLogText).toBeInTheDocument();
    expect(rawLogText.textContent).toContain('Line 1');
    expect(rawLogText.textContent).toContain('Line 2');
    expect(rawLogText.textContent).toContain('Line 3');
  });

  it('should handle special characters and ANSI codes', () => {
    const content = '\x1b[32mGreen text\x1b[0m';

    render(<StdoutEntry content={content} />);

    expect(screen.getByText(content)).toBeInTheDocument();
  });
});
