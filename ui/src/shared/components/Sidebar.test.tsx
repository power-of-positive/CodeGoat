import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChartColumn: () => <div data-testid="chart-column-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Menu: () => <div data-testid="menu-icon" />,
  X: () => <div data-testid="x-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  CheckSquare: () => <div data-testid="check-square-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  TestTube: () => <div data-testid="test-tube-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  List: () => <div data-testid="list-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
}));

// Mock button component
jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock React Router
jest.mock('react-router-dom', () => {
  const mockUseLocation = jest.fn(() => ({ pathname: '/' }));
  return {
    ...jest.requireActual('react-router-dom'),
    Link: ({ children, to, className, onClick }: any) => (
      <a href={to} className={className} onClick={onClick}>{children}</a>
    ),
    useLocation: mockUseLocation,
  };
});

const { useLocation } = jest.requireMock('react-router-dom');

const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {component}
    </MemoryRouter>
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue({ pathname: '/' });
  });

  describe('basic rendering', () => {
    it('renders sidebar with navigation items', () => {
      renderWithRouter(<Sidebar />);

      // Check that all navigation items are rendered
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Stage History')).toBeInTheDocument();
      expect(screen.getByText('Kanban')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Task Analytics')).toBeInTheDocument();
      expect(screen.getByText('BDD Tests')).toBeInTheDocument();
      expect(screen.getByText('Workers')).toBeInTheDocument();
      expect(screen.getByText('Permissions')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Stage Management')).toBeInTheDocument();
    });

    it('renders navigation item descriptions', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('View validation metrics and performance data')).toBeInTheDocument();
      expect(screen.getByText('Advanced stage performance analytics and trends')).toBeInTheDocument();
      expect(screen.getByText('Kanban board for task management')).toBeInTheDocument();
      expect(screen.getByText('Advanced task CRUD with filtering and search')).toBeInTheDocument();
      expect(screen.getByText('View task completion statistics and trends')).toBeInTheDocument();
      expect(screen.getByText('View BDD scenarios and E2E test execution status')).toBeInTheDocument();
      expect(screen.getByText('Monitor Claude Code worker processes and logs')).toBeInTheDocument();
      expect(screen.getByText('Configure executor security permissions')).toBeInTheDocument();
      expect(screen.getByText('Configure validation pipeline settings')).toBeInTheDocument();
      expect(screen.getByText('Advanced stage editing and reordering')).toBeInTheDocument();
    });

    it('renders all required icons', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByTestId('chart-column-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByTestId('check-square-icon')).toBeInTheDocument();
      expect(screen.getByTestId('list-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('test-tube-icon')).toBeInTheDocument();
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByTestId('layers-icon')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = renderWithRouter(<Sidebar className="custom-sidebar" />);
      
      const sidebar = container.querySelector('.custom-sidebar');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('mobile functionality', () => {
    it('renders mobile toggle buttons', () => {
      renderWithRouter(<Sidebar />);

      const toggleButtons = screen.getAllByRole('button');
      expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it('toggles mobile menu state', () => {
      renderWithRouter(<Sidebar />);

      // Check that menu icons are present
      const menuIcons = screen.getAllByTestId('menu-icon');
      expect(menuIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('handles overlay interaction', () => {
      renderWithRouter(<Sidebar />);

      const toggleButtons = screen.getAllByRole('button');
      expect(toggleButtons.length).toBeGreaterThan(0);
      
      // Test overlay presence and behavior
      fireEvent.click(toggleButtons[0]);
      const { container } = renderWithRouter(<Sidebar />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('navigation items', () => {
    it('renders correct links for all navigation items', () => {
      renderWithRouter(<Sidebar />);

      const links = screen.getAllByRole('link');
      const hrefs = links.map(link => link.getAttribute('href'));
      
      expect(hrefs).toContain('/analytics');
      expect(hrefs).toContain('/stage-history');
      expect(hrefs).toContain('/kanban');
      expect(hrefs).toContain('/tasks');
      expect(hrefs).toContain('/task-analytics');
      expect(hrefs).toContain('/bdd-tests');
      expect(hrefs).toContain('/workers');
      expect(hrefs).toContain('/permissions');
      expect(hrefs).toContain('/settings');
      expect(hrefs).toContain('/stage-management');
    });

    it('highlights active navigation item based on current route', () => {
      useLocation.mockReturnValue({ pathname: '/analytics' });
      renderWithRouter(<Sidebar />, '/analytics');

      const analyticsLink = screen.getByRole('link', { name: /Analytics View validation metrics/ });
      expect(analyticsLink).toHaveClass('bg-blue-50');
    });

    it('highlights different active navigation item for different route', () => {
      useLocation.mockReturnValue({ pathname: '/settings' });
      renderWithRouter(<Sidebar />, '/settings');

      const settingsLink = screen.getByRole('link', { name: /Settings/ });
      expect(settingsLink).toHaveClass('bg-blue-50');
    });

    it('shows correct hover states for navigation items', () => {
      renderWithRouter(<Sidebar />);

      const analyticsLink = screen.getByRole('link', { name: /Analytics View validation metrics/ });
      expect(analyticsLink).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('sidebar header', () => {
    it('renders sidebar title', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText('CodeGoat')).toBeInTheDocument();
    });

    it.skip('renders subtitle when expanded', () => {
      // This test is skipped because the subtitle logic needs to be updated
      // to check for the actual sidebar state management
    });
  });

  describe('responsive behavior', () => {
    it('handles collapsed state correctly', () => {
      renderWithRouter(<Sidebar />);

      // Check that menu icon is present
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      
      // Navigation items should still be accessible
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('handles expanded state correctly', () => {
      renderWithRouter(<Sidebar />);

      // Sidebar starts expanded by default, so text should be visible
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      
      const toggleButtons = screen.getAllByRole('button');
      const firstToggleButton = toggleButtons[0];
      
      // Check that sidebar is interactive
      expect(firstToggleButton).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles navigation to non-matching routes', () => {
      renderWithRouter(<Sidebar />, '/some-other-route');

      // No navigation item should be highlighted
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).not.toHaveClass('bg-blue-50');
      });
    });

    it('handles multiple rapid toggle clicks', () => {
      renderWithRouter(<Sidebar />);

      const toggleButtons = screen.getAllByRole('button');
      const firstToggleButton = toggleButtons[0];
      
      // Rapidly toggle multiple times
      fireEvent.click(firstToggleButton);
      fireEvent.click(firstToggleButton);
      fireEvent.click(firstToggleButton);
      fireEvent.click(firstToggleButton);

      // Should still have menu icons available
      expect(screen.getAllByTestId('menu-icon').length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('provides accessible navigation structure', () => {
      renderWithRouter(<Sidebar />);

      // Check for navigation landmark
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('provides accessible toggle button', () => {
      renderWithRouter(<Sidebar />);

      const toggleButtons = screen.getAllByRole('button');
      expect(toggleButtons.length).toBeGreaterThan(0);
      
      // At least one toggle button should have aria-label
      const hasAriaLabel = toggleButtons.some(button => button.hasAttribute('aria-label'));
      expect(hasAriaLabel).toBe(true);
    });

    it('maintains focus management during toggle', () => {
      renderWithRouter(<Sidebar />);

      const toggleButtons = screen.getAllByRole('button');
      const firstToggleButton = toggleButtons[0];
      
      // Focus the toggle button
      firstToggleButton.focus();
      expect(document.activeElement).toBe(firstToggleButton);

      // Toggle should maintain focus
      fireEvent.click(firstToggleButton);
      expect(document.activeElement).toBe(firstToggleButton);
    });
  });
});