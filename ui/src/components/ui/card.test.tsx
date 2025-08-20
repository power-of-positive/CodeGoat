import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders card with children', () => {
      render(
        <Card>
          <div data-testid="card-content">Card Content</div>
        </Card>
      );
      
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('CardHeader', () => {
    it('renders header with children', () => {
      render(
        <CardHeader>
          <div data-testid="header-content">Header Content</div>
        </CardHeader>
      );
      
      expect(screen.getByTestId('header-content')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      const { container } = render(<CardHeader>Content</CardHeader>);
      const header = container.firstChild;
      
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('applies custom className', () => {
      const { container } = render(<CardHeader className="custom-header">Content</CardHeader>);
      const header = container.firstChild;
      
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('renders title with children', () => {
      render(<CardTitle>Test Title</CardTitle>);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders as h3 element', () => {
      render(<CardTitle>Test Title</CardTitle>);
      
      const title = screen.getByText('Test Title');
      expect(title.tagName).toBe('H3');
    });

    it('applies default classes', () => {
      render(<CardTitle>Test Title</CardTitle>);
      const title = screen.getByText('Test Title');
      
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Test Title</CardTitle>);
      const title = screen.getByText('Test Title');
      
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('renders description with children', () => {
      render(<CardDescription>Test Description</CardDescription>);
      
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders as p element', () => {
      render(<CardDescription>Test Description</CardDescription>);
      
      const description = screen.getByText('Test Description');
      expect(description.tagName).toBe('P');
    });

    it('applies default classes', () => {
      render(<CardDescription>Test Description</CardDescription>);
      const description = screen.getByText('Test Description');
      
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom-description">Test Description</CardDescription>);
      const description = screen.getByText('Test Description');
      
      expect(description).toHaveClass('custom-description');
    });
  });

  describe('CardContent', () => {
    it('renders content with children', () => {
      render(
        <CardContent>
          <div data-testid="content">Content Area</div>
        </CardContent>
      );
      
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild;
      
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('applies custom className', () => {
      const { container } = render(<CardContent className="custom-content">Content</CardContent>);
      const content = container.firstChild;
      
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('Integration', () => {
    it('renders complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card body content</p>
          </CardContent>
        </Card>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });

    it('handles complex nested content', () => {
      render(
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Settings</CardTitle>
            <CardDescription className="text-gray-500">
              Manage your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-testid="setting-1">Setting 1</div>
            <div data-testid="setting-2">Setting 2</div>
          </CardContent>
        </Card>
      );
      
      expect(screen.getByText('Settings')).toHaveClass('text-lg');
      expect(screen.getByText('Manage your preferences')).toHaveClass('text-gray-500');
      expect(screen.getByTestId('setting-1')).toBeInTheDocument();
      expect(screen.getByTestId('setting-2')).toBeInTheDocument();
    });
  });
});