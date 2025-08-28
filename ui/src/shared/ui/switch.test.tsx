import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from './switch';

describe('Switch', () => {
  const mockOnCheckedChange = jest.fn();

  beforeEach(() => {
    mockOnCheckedChange.mockClear();
  });

  it('renders as a button with switch role', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement.tagName).toBe('BUTTON');
  });

  it('sets aria-checked correctly when checked', () => {
    render(<Switch checked={true} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('sets aria-checked correctly when unchecked', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onCheckedChange with true when clicked while unchecked', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    expect(mockOnCheckedChange).toHaveBeenCalledTimes(1);
    expect(mockOnCheckedChange).toHaveBeenCalledWith(true);
  });

  it('calls onCheckedChange with false when clicked while checked', () => {
    render(<Switch checked={true} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    expect(mockOnCheckedChange).toHaveBeenCalledTimes(1);
    expect(mockOnCheckedChange).toHaveBeenCalledWith(false);
  });

  it('applies disabled state correctly', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} disabled={true} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
  });

  it('does not call onCheckedChange when disabled and clicked', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} disabled={true} />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    expect(mockOnCheckedChange).not.toHaveBeenCalled();
  });

  it('applies custom id when provided', () => {
    render(<Switch id="custom-switch" checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('id', 'custom-switch');
  });

  it('applies custom className when provided', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} className="custom-class" />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveClass('custom-class');
  });

  it('applies checked styling when checked', () => {
    render(<Switch checked={true} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement.className).toContain('bg-blue-600');
  });

  it('applies unchecked styling when unchecked', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement.className).toContain('bg-gray-200');
  });

  it('applies disabled styling when disabled', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} disabled={true} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement.className).toContain('disabled:cursor-not-allowed');
    expect(switchElement.className).toContain('disabled:opacity-50');
  });

  it('renders thumb with correct translation when checked', () => {
    const { container } = render(<Switch checked={true} onCheckedChange={mockOnCheckedChange} />);
    
    const thumb = container.querySelector('span');
    expect(thumb).toHaveClass('translate-x-6');
  });

  it('renders thumb with correct translation when unchecked', () => {
    const { container } = render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const thumb = container.querySelector('span');
    expect(thumb).toHaveClass('translate-x-1');
  });

  it('uses default disabled value when not provided', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).not.toBeDisabled();
  });

  it('uses default className when not provided', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement.className).toContain('relative');
  });

  it('maintains accessibility with proper focus states', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement.className).toContain('focus:outline-none');
    expect(switchElement.className).toContain('focus:ring-2');
    expect(switchElement.className).toContain('focus:ring-blue-500');
  });

  it('has proper button type', () => {
    render(<Switch checked={false} onCheckedChange={mockOnCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('type', 'button');
  });
});