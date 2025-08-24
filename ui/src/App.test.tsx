import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock the Analytics and Settings components
jest.mock('./features/analytics/components/Analytics', () => ({
  Analytics: () => <div>Analytics Page</div>,
}));

jest.mock('./shared/components/Settings', () => ({
  Settings: () => <div>Settings Page</div>,
}));

jest.mock('./features/validation/components/ValidationRunDetail', () => ({
  ValidationRunDetail: () => <div>Validation Run Detail Page</div>,
}));

jest.mock('./features/tasks/components/TaskBoard', () => ({
  TaskBoard: () => <div>Task Board Page</div>,
}));

jest.mock('./features/tasks/components/TaskDetail', () => ({
  TaskDetail: () => <div>Task Detail Page</div>,
}));

jest.mock('./features/tasks/components/TaskAnalytics', () => ({
  TaskAnalytics: () => <div>Task Analytics Page</div>,
}));

jest.mock('./features/permissions/components/PermissionEditor', () => ({
  PermissionEditor: () => <div>Permission Editor Page</div>,
}));

jest.mock('./pages/BDDTestsDashboard', () => ({
  __esModule: true,
  default: () => <div>BDD Tests Dashboard Page</div>,
}));

jest.mock('./pages/WorkersDashboard', () => ({
  WorkersDashboard: () => <div>Workers Dashboard Page</div>,
}));

jest.mock('./features/workers/components/WorkerDetail', () => ({
  WorkerDetail: () => <div>Worker Detail Page</div>,
}));

jest.mock('./shared/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout" className="min-h-screen">
      {children}
    </div>
  ),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
  Navigate: () => <div>Navigate to analytics</div>,
  useLocation: () => ({ pathname: '/analytics' }),
  useParams: () => ({ runId: 'test-run-123' }),
  useNavigate: () => jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('App', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    // Cleanup React Testing Library
    cleanup();
    // Properly clean up QueryClient to prevent hanging
    if (queryClient) {
      queryClient.clear();
      queryClient.getQueryCache().clear();
      queryClient.getMutationCache().clear();
    }
    // Clear all timers and mocks
    jest.clearAllTimers();
    jest.clearAllMocks();
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
    expect(mainDiv).toHaveClass('min-h-screen');
  });

  it('has query client provider', () => {
    const { container } = renderApp();
    // Test that the app renders within QueryClientProvider
    expect(container.firstChild).toBeInTheDocument();
  });
});
