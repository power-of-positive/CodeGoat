import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Settings } from './Settings';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>{component}</BrowserRouter>
  );
};

describe('Settings Component', () => {

  it('renders settings page with correct title', () => {
    renderWithProviders(<Settings />);

    expect(
      screen.getByRole('heading', { name: /^settings$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/configure codegoat application settings/i)
    ).toBeInTheDocument();
  });

  it('displays validation pipeline card with link to stage management', () => {
    renderWithProviders(<Settings />);

    expect(
      screen.getByRole('heading', { name: /validation pipeline/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/configure validation stages, priorities, and execution settings/i)
    ).toBeInTheDocument();
    
    const stageManagementButton = screen.getByRole('link', { name: /manage validation stages/i });
    expect(stageManagementButton).toBeInTheDocument();
    expect(stageManagementButton.getAttribute('href')).toBe('/stage-management');
  });

  it('displays security & permissions card with link to permissions page', () => {
    renderWithProviders(<Settings />);

    expect(
      screen.getByRole('heading', { name: /security & permissions/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/configure executor security permissions/i)
    ).toBeInTheDocument();
    
    const permissionsButton = screen.getByRole('link', { name: /configure permissions/i });
    expect(permissionsButton).toBeInTheDocument();
    expect(permissionsButton.getAttribute('href')).toBe('/permissions');
  });

  it('displays analytics & monitoring card with link to analytics page', () => {
    renderWithProviders(<Settings />);

    expect(
      screen.getByRole('heading', { name: /analytics & monitoring/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/view analytics dashboards, performance metrics/i)
    ).toBeInTheDocument();
    
    const analyticsButton = screen.getByRole('link', { name: /view analytics/i });
    expect(analyticsButton).toBeInTheDocument();
    expect(analyticsButton.getAttribute('href')).toBe('/analytics');
  });

  it('displays system information card', () => {
    renderWithProviders(<Settings />);

    expect(
      screen.getByRole('heading', { name: /system information/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/version:/i)).toBeInTheDocument();
    expect(screen.getByText(/environment:/i)).toBeInTheDocument();
    expect(screen.getByText(/node\.js:/i)).toBeInTheDocument();
    expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
    
    // More specific selector for the environment value
    const environmentValue = screen.getByText('Development', { 
      selector: 'span.font-mono' 
    });
    expect(environmentValue).toBeInTheDocument();
  });

  it('displays quick access section with navigation links', () => {
    renderWithProviders(<Settings />);

    expect(
      screen.getByRole('heading', { name: /quick access/i })
    ).toBeInTheDocument();

    const quickAccessLinks = [
      { name: /stage management/i, href: '/stage-management' },
      { name: /permissions/i, href: '/permissions' },
      { name: /analytics/i, href: '/analytics' },
      { name: /workers/i, href: '/workers' },
    ];

    quickAccessLinks.forEach(({ name, href }) => {
      const link = screen.getAllByRole('link', { name }).find(
        (link) => link.getAttribute('href') === href
      );
      expect(link).toBeInTheDocument();
    });
  });
});
