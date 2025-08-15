import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock the Analytics and Settings components
jest.mock('./components/Analytics', () => ({
  Analytics: () => <div>Analytics Page</div>,
}));

jest.mock('./components/Settings', () => ({
  Settings: () => <div>Settings Page</div>,
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
  Navigate: () => <div>Navigate to analytics</div>,
}));

describe('App', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderApp = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  };

  it('renders without crashing', () => {
    renderApp();
    expect(screen.getByText('Analytics Page')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = renderApp();
    const mainDiv = container.querySelector('.min-h-screen');
    
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv).toHaveClass('min-h-screen', 'bg-gray-50');
  });

  it('has max-width container', () => {
    const { container } = renderApp();
    const containerDiv = container.querySelector('.max-w-7xl');
    
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('max-w-7xl', 'mx-auto');
  });
});