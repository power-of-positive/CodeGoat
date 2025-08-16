import { render, screen, waitFor } from '@testing-library/react';
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

const mockValidationMetrics = {
  totalRuns: 50,
  successfulRuns: 40,
  failedRuns: 10,
  successRate: 80,
  averageDuration: 120,
  stageMetrics: {
    lint: {
      id: 'lint',
      name: 'Code Linting',
      enabled: true,
      attempts: 45,
      successes: 40,
      successRate: 88.8,
      averageDuration: 30,
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
      expect(screen.getByRole('heading', { name: /success rate/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /avg duration/i })).toBeInTheDocument();
    });
  });

  it('displays metrics values', async () => {
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument(); // Total runs
      expect(screen.getByText('80%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('120s')).toBeInTheDocument(); // Average duration
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
});