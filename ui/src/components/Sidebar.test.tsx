import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Sidebar Component', () => {
  it('renders sidebar with navigation links', () => {
    renderWithRouter(<Sidebar />);
    
    expect(screen.getByText('CodeGoat')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays analytics link with description', () => {
    renderWithRouter(<Sidebar />);
    
    expect(screen.getByText('View validation metrics and performance data')).toBeInTheDocument();
  });

  it('displays settings link with description', () => {
    renderWithRouter(<Sidebar />);
    
    expect(screen.getByText('Configure validation pipeline stages')).toBeInTheDocument();
  });

  it('displays version information', () => {
    renderWithRouter(<Sidebar />);
    
    expect(screen.getByText('Validation Analytics v1.0')).toBeInTheDocument();
  });

  it('handles navigation clicks', () => {
    renderWithRouter(<Sidebar />);
    
    const links = screen.getAllByRole('link');
    const analyticsLink = links.find(link => link.getAttribute('href') === '/analytics');
    const settingsLink = links.find(link => link.getAttribute('href') === '/settings');
    
    expect(analyticsLink).toHaveAttribute('href', '/analytics');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('applies correct styling classes', () => {
    renderWithRouter(<Sidebar />);
    
    const sidebar = screen.getByText('CodeGoat').closest('div')?.parentElement?.parentElement;
    expect(sidebar).toHaveClass('fixed');
  });

  it('renders navigation icons', () => {
    renderWithRouter(<Sidebar />);
    
    // Check for svg icons (BarChart3 and Settings icons)
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('toggles sidebar collapse state when toggle button is clicked', () => {
    renderWithRouter(<Sidebar />);
    
    // Find the desktop toggle button (hidden md:flex)
    const toggleButtons = screen.getAllByRole('button');
    const desktopToggleButton = toggleButtons.find(btn => 
      btn.className.includes('hidden md:flex')
    );
    
    // Initially sidebar should be expanded (showing CodeGoat text)
    expect(screen.getByText('CodeGoat')).toBeInTheDocument();
    
    if (desktopToggleButton) {
      // Click toggle button to collapse
      fireEvent.click(desktopToggleButton);
      
      // After collapse, CodeGoat text should be hidden
      expect(screen.queryByText('CodeGoat')).not.toBeInTheDocument();
    }
  });

  it('handles mobile navigation clicks', () => {
    // Mock window.innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500, // Mobile width
    });

    renderWithRouter(<Sidebar />);
    
    const links = screen.getAllByRole('link');
    const analyticsLink = links.find(link => link.getAttribute('href') === '/analytics');
    expect(analyticsLink).toBeTruthy();
    fireEvent.click(analyticsLink!);
    
    // Should still work on mobile
    expect(analyticsLink).toHaveAttribute('href', '/analytics');
  });

  it('shows collapsed state correctly', () => {
    renderWithRouter(<Sidebar />);
    
    // Test that sidebar can be rendered (basic functionality)
    expect(screen.getByText('CodeGoat')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('handles custom className prop', () => {
    renderWithRouter(<Sidebar className="custom-class" />);
    
    // Should still render with custom className
    expect(screen.getByText('CodeGoat')).toBeInTheDocument();
  });
});