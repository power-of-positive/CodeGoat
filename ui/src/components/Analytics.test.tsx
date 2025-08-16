import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from './Analytics';
import { analyticsApi } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  analyticsApi: {
    getValidationMetrics: jest.fn(),
    getValidationRuns: jest.fn(),
  },
}));

// Mock recharts components since they don't work well in Jest environment
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
}));

const mockValidationMetrics = {
  totalRuns: 50,
  successfulRuns: 40,
  failedRuns: 10,
  successRate: 0.8, // As decimal, will be converted to 80% in display
  averageDuration: 120000, // In milliseconds, will be converted to 120s in display
  stageMetrics: {
    lint: {
      id: 'lint',
      name: 'Code Linting',
      enabled: true,
      attempts: 45,
      successes: 40,
      successRate: 0.888, // As decimal, will be converted to 88.8% in display
      averageDuration: 30000, // In milliseconds
      totalRuns: 45,
    },
  },
};

const mockRecentRuns = [
  {
    id: '1',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    status: 'success' as const,
    duration: 120,
    stages: [
      {
        id: 'lint',
        name: 'Code Linting',
        status: 'success' as const,
        duration: 30,
        order: 1,
      },
    ],
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Analytics Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (analyticsApi.getValidationMetrics as jest.Mock).mockResolvedValue(mockValidationMetrics);
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue(mockRecentRuns);
  });

  it('renders analytics page with correct title', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /validation analytics/i })).toBeInTheDocument();
      expect(screen.getByText(/track validation pipeline performance/i)).toBeInTheDocument();
    });
  });

  it('displays metrics cards', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /total runs/i })).toBeInTheDocument();
      // Use getAllByRole to handle multiple success rate and duration headings
      const successRateHeadings = screen.getAllByRole('heading', { name: /success rate/i });
      expect(successRateHeadings.length).toBeGreaterThan(0);
      const durationHeadings = screen.getAllByRole('heading', { name: /duration/i });
      expect(durationHeadings.length).toBeGreaterThan(0);
    });
  });

  it('displays metrics values', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      // Use getAllByText to handle multiple "50" elements and check the right one
      const allFiftyElements = screen.getAllByText('50');
      const totalRunsFifty = allFiftyElements.find(el => 
        el.className.includes('text-2xl font-bold')
      );
      expect(totalRunsFifty).toBeInTheDocument();
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // Success rate (shows 1 decimal place)
      expect(screen.getByText('120.0s')).toBeInTheDocument(); // Average duration (shows 1 decimal place)
    });
  });

  it('displays refresh button', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  it('displays recent validation runs section', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /recent validation runs/i })).toBeInTheDocument();
    });
  });

  it('displays stage performance overview section', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /stage performance overview/i })).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (analyticsApi.getValidationMetrics as jest.Mock).mockRejectedValue(new Error('API Error'));
    (analyticsApi.getValidationRuns as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    renderWithProviders(<Analytics />);
    
    // Check for loading skeleton animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('calls refetch when refresh button is clicked', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    // Clear previous calls
    jest.clearAllMocks();
    
    // Click refresh button
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    
    // Should call refetch for both queries
    expect(analyticsApi.getValidationMetrics).toHaveBeenCalled();
    expect(analyticsApi.getValidationRuns).toHaveBeenCalled();
  });
});