import React from 'react';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label Component', () => {
  it('renders with default styling', () => {
    render(<Label data-testid="test-label">Test Label</Label>);
    const label = screen.getByTestId('test-label');

    expect(label).toBeInTheDocument();
    expect(label).toHaveClass(
      'block',
      'text-sm',
      'font-medium',
      'text-gray-700',
      'mb-1'
    );
    expect(label).toHaveTextContent('Test Label');
  });

  it('applies custom className', () => {
    render(
      <Label className="custom-class" data-testid="test-label">
        Test Label
      </Label>
    );
    const label = screen.getByTestId('test-label');

    expect(label).toHaveClass('custom-class');
    expect(label).toHaveClass('block', 'text-sm', 'font-medium'); // Still has default classes
  });

  it('passes through HTML label attributes', () => {
    render(
      <Label htmlFor="test-input" title="Test tooltip" data-testid="test-label">
        Test Label
      </Label>
    );
    const label = screen.getByTestId('test-label');

    expect(label).toHaveAttribute('for', 'test-input');
    expect(label).toHaveAttribute('title', 'Test tooltip');
  });

  it('renders children correctly', () => {
    render(
      <Label data-testid="test-label">
        <span>Nested Content</span>
        <strong>Bold Text</strong>
      </Label>
    );
    const label = screen.getByTestId('test-label');

    expect(label).toContainHTML('<span>Nested Content</span>');
    expect(label).toContainHTML('<strong>Bold Text</strong>');
  });

  it('handles empty children', () => {
    render(<Label data-testid="test-label"> </Label>);
    const label = screen.getByTestId('test-label');

    expect(label).toBeInTheDocument();
  });

  it('works with form associations', () => {
    render(
      <div>
        <Label htmlFor="associated-input">Associated Label</Label>
        <input id="associated-input" type="text" />
      </div>
    );

    const label = screen.getByText('Associated Label');
    const input = screen.getByRole('textbox');

    expect(label).toHaveAttribute('for', 'associated-input');
    expect(input).toHaveAttribute('id', 'associated-input');
  });
});
