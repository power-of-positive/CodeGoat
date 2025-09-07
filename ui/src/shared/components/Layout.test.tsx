import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';

// Mock the Sidebar component
jest.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

describe('Layout', () => {
  const renderLayout = (children: React.ReactNode) => {
    return render(
      <BrowserRouter>
        <Layout>{children}</Layout>
      </BrowserRouter>
    );
  };

  it('renders the layout with sidebar and children', () => {
    renderLayout(<div data-testid="test-content">Test Content</div>);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = renderLayout(<div>Content</div>);

    const layoutDiv = container.firstChild;
    expect(layoutDiv).toHaveClass('min-h-screen', 'bg-gray-50', 'dark:bg-gray-900');

    const mainContent = container.querySelector('.md\\:ml-64');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveClass('transition-all', 'duration-300');

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('min-h-screen');
  });

  it('renders multiple children correctly', () => {
    renderLayout(
      <>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('renders empty when no children provided', () => {
    renderLayout(null);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement.children.length).toBe(0);
  });
});
