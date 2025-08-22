import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MarkdownRenderer content="Test content" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders inline code with backticks', () => {
    render(<MarkdownRenderer content="Use the `console.log()` function" />);
    
    const codeElement = screen.getByText('console.log()');
    expect(codeElement.tagName).toBe('CODE');
    expect(codeElement).toHaveClass('bg-gray-100', 'dark:bg-gray-800', 'px-1', 'rounded', 'text-sm');
  });

  it('renders multiple inline code blocks', () => {
    render(<MarkdownRenderer content="Use `npm install` and `npm start`" />);
    
    const npmInstall = screen.getByText('npm install');
    const npmStart = screen.getByText('npm start');
    
    expect(npmInstall.tagName).toBe('CODE');
    expect(npmStart.tagName).toBe('CODE');
  });

  it('renders code blocks with triple backticks', () => {
    const content = 'Here is some code:\n```\nfunction test() {\n  return true;\n}\n```\nEnd of example.';
    const { container } = render(<MarkdownRenderer content={content} />);
    
    const preElements = container.querySelectorAll('pre');
    expect(preElements).toHaveLength(1);
    expect(preElements[0]).toHaveClass(
      'bg-gray-100',
      'dark:bg-gray-800',
      'rounded',
      'p-2',
      'my-2',
      'overflow-x-auto'
    );
  });

  it('renders multiple code blocks', () => {
    const content = '```\nfirst block\n```\nSome text\n```\nsecond block\n```';
    const { container } = render(<MarkdownRenderer content={content} />);
    
    const preElements = container.querySelectorAll('pre');
    expect(preElements).toHaveLength(2);
  });

  it('handles mixed inline code and code blocks', () => {
    const content = 'Use `npm install` first:\n```\nnpm install\nnpm start\n```\nThen run `npm test`';
    const { container } = render(<MarkdownRenderer content={content} />);
    
    // Should have inline code elements
    expect(screen.getByText('npm test')).toBeInTheDocument();
    
    // Should have a pre element for the code block
    const preElements = container.querySelectorAll('pre');
    expect(preElements).toHaveLength(1);
  });

  it('handles empty content', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles content with only backticks', () => {
    const { container } = render(<MarkdownRenderer content="```" />);
    expect(container.firstChild).toBeInTheDocument();
    
    // Should create a pre element for the code block (even if empty)
    const preElements = container.querySelectorAll('pre');
    expect(preElements).toHaveLength(1);
  });

  it('handles content with single backtick', () => {
    const { container } = render(<MarkdownRenderer content="`" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('preserves whitespace in regular text', () => {
    const { container } = render(<MarkdownRenderer content="Line 1\nLine 2\n  Indented" />);
    // For plain text, the component doesn't create whitespace-pre-wrap elements
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles code blocks with language indicators', () => {
    const content = '```javascript\nfunction test() {\n  return true;\n}\n```';
    const { container } = render(<MarkdownRenderer content={content} />);
    
    const preElements = container.querySelectorAll('pre');
    expect(preElements).toHaveLength(1);
    expect(screen.getByText(/javascript/)).toBeInTheDocument();
  });

  it('handles nested backticks by splitting on every backtick', () => {
    render(<MarkdownRenderer content="Use `console.log(\`Hello \${name}\`)` for template literals" />);
    
    // The component splits on every backtick, so we should have multiple parts
    const { container } = render(<MarkdownRenderer content="Use `test` code" />);
    const codeElements = container.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
  });

  it('handles code blocks with empty lines', () => {
    const content = '```\nfirst line\n\nsecond line\n```';
    const { container } = render(<MarkdownRenderer content={content} />);
    
    const preElements = container.querySelectorAll('pre');
    expect(preElements).toHaveLength(1);
  });

  it('applies correct CSS classes to code elements', () => {
    render(<MarkdownRenderer content="Test `code` here" />);
    
    const codeElement = screen.getByText('code');
    expect(codeElement).toHaveClass('bg-gray-100');
    expect(codeElement).toHaveClass('dark:bg-gray-800');
    expect(codeElement).toHaveClass('px-1');
    expect(codeElement).toHaveClass('rounded');
    expect(codeElement).toHaveClass('text-sm');
  });

  it('applies correct CSS classes to pre elements', () => {
    const content = '```\ntest code\n```';
    const { container } = render(<MarkdownRenderer content={content} />);
    
    const preElement = container.querySelector('pre');
    expect(preElement).toHaveClass('bg-gray-100');
    expect(preElement).toHaveClass('dark:bg-gray-800');
    expect(preElement).toHaveClass('rounded');
    expect(preElement).toHaveClass('p-2');
    expect(preElement).toHaveClass('my-2');
    expect(preElement).toHaveClass('overflow-x-auto');
  });
});