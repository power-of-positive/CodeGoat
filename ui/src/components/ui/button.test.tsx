import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600', 'text-white', 'px-4', 'py-2');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outlined</Button>);
    const button = screen.getByRole('button', { name: 'Outlined' });
    
    expect(button).toHaveClass('border', 'border-gray-300', 'hover:bg-gray-50');
  });

  it('renders with small size', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button', { name: 'Small' });
    
    expect(button).toHaveClass('h-9', 'px-3', 'rounded-md');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: 'Clickable' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: 'Disabled' });
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:pointer-events-none');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: 'Custom' });
    
    expect(button).toHaveClass('custom-class');
  });
});