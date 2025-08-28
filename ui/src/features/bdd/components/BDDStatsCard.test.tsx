import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatsCard } from './BDDStatsCard';

// Mock icon component
const MockIcon = ({ className }: { className?: string }) => (
  <div className={className} data-testid="mock-icon">Icon</div>
);

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Test Title',
    count: 42,
    icon: MockIcon,
    testId: 'test-count'
  };

  it('renders the title correctly', () => {
    render(<StatsCard {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders the count with correct test id', () => {
    render(<StatsCard {...defaultProps} />);
    const countElement = screen.getByTestId('test-count');
    expect(countElement).toBeInTheDocument();
    expect(countElement).toHaveTextContent('42');
  });

  it('renders the icon with correct class', () => {
    render(<StatsCard {...defaultProps} />);
    const icon = screen.getByTestId('mock-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-8', 'w-8', 'text-gray-400');
  });

  it('renders with zero count', () => {
    render(<StatsCard {...defaultProps} count={0} />);
    const countElement = screen.getByTestId('test-count');
    expect(countElement).toHaveTextContent('0');
  });

  it('renders with large count', () => {
    render(<StatsCard {...defaultProps} count={999999} />);
    const countElement = screen.getByTestId('test-count');
    expect(countElement).toHaveTextContent('999999');
  });

  it('renders with different title', () => {
    render(<StatsCard {...defaultProps} title="Different Title" />);
    expect(screen.getByText('Different Title')).toBeInTheDocument();
  });

  it('renders with different test id', () => {
    render(<StatsCard {...defaultProps} testId="custom-test-id" />);
    expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
  });

  it('applies correct CSS classes to title', () => {
    render(<StatsCard {...defaultProps} />);
    const title = screen.getByText('Test Title');
    expect(title).toHaveClass('text-sm', 'font-medium', 'text-gray-600');
  });

  it('applies correct CSS classes to count', () => {
    render(<StatsCard {...defaultProps} />);
    const count = screen.getByTestId('test-count');
    expect(count).toHaveClass('text-2xl', 'font-bold');
  });

  it('renders card structure correctly', () => {
    const { container } = render(<StatsCard {...defaultProps} />);
    
    // Check for card elements
    const cardContent = container.querySelector('.p-4');
    expect(cardContent).toBeInTheDocument();
    
    const flexContainer = container.querySelector('.flex.items-center.justify-between');
    expect(flexContainer).toBeInTheDocument();
  });

  it('renders with custom icon component', () => {
    const CustomIcon = ({ className }: { className?: string }) => (
      <span className={className} data-testid="custom-icon">★</span>
    );

    render(<StatsCard {...defaultProps} icon={CustomIcon} />);
    const customIcon = screen.getByTestId('custom-icon');
    expect(customIcon).toBeInTheDocument();
    expect(customIcon).toHaveTextContent('★');
  });

  it('renders negative count correctly', () => {
    render(<StatsCard {...defaultProps} count={-5} />);
    const countElement = screen.getByTestId('test-count');
    expect(countElement).toHaveTextContent('-5');
  });

  it('renders with empty title', () => {
    render(<StatsCard {...defaultProps} title="" />);
    const titleElement = screen.getByText('', { selector: '.text-sm.font-medium.text-gray-600' });
    expect(titleElement).toBeInTheDocument();
  });
});