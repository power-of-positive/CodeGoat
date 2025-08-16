import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';

describe('Input Component', () => {
  it('renders with default styling', () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border', 'border-gray-300', 'rounded', 'px-3', 'py-2');
  });

  it('accepts and displays a value', () => {
    render(<Input value="test value" onChange={() => {}} data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    
    expect(input.value).toBe('test value');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    
    expect(input).toHaveClass('custom-class');
    expect(input).toHaveClass('border', 'border-gray-300'); // Still has default classes
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('passes through HTML input attributes', () => {
    render(
      <Input 
        placeholder="Enter text" 
        type="email" 
        disabled 
        data-testid="test-input" 
      />
    );
    const input = screen.getByTestId('test-input');
    
    expect(input).toHaveAttribute('placeholder', 'Enter text');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeDisabled();
  });

  it('handles focus events properly', () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    
    input.focus();
    expect(input).toHaveFocus();
  });
});