import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea data-testid="test-textarea" />);

    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-class" data-testid="test-textarea" />);

    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toHaveClass('custom-class');
  });

  it('forwards props to textarea element', () => {
    render(
      <Textarea
        placeholder="Test placeholder"
        rows={5}
        data-testid="test-textarea"
      />
    );

    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toHaveAttribute('placeholder', 'Test placeholder');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('handles value changes', () => {
    render(<Textarea data-testid="test-textarea" />);

    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test content' } });

    expect(textarea.value).toBe('Test content');
  });

  it('supports controlled component pattern', () => {
    const handleChange = jest.fn();
    render(
      <Textarea
        value="Controlled value"
        onChange={handleChange}
        data-testid="test-textarea"
      />
    );

    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Controlled value');

    fireEvent.change(textarea, { target: { value: 'New value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Textarea disabled data-testid="test-textarea" />);

    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toBeDisabled();
  });
});
