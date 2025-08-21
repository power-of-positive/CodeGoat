import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { ValidationRunDetail } from './ValidationRunDetail';
import { analyticsApi, taskApi } from '../lib/api';
import { ValidationRun } from '../../shared/types';

// Mock the API
jest.mock('../lib/api', () => ({
  analyticsApi: {
    getValidationRuns: jest.fn(),
  },
  taskApi: {
    getTasks: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ runId: 'test-run-123' }),
  useNavigate: () => mockNavigate,
}));

const mockValidationRun: ValidationRun = {
  id: 'test-run-123',
  timestamp: '2024-01-15T10:30:00.000Z',
  success: true,
  duration: 45000,
  stages: [
    {
      id: 'lint',
      name: 'Code Linting',
      success: true,
      duration: 5000,
      attempt: 1,
      output: 'All lint checks passed',
    },
    {
      id: 'typecheck',
      name: 'Type Checking',
      success: false,
      duration: 8000,
      attempt: 2,
      output: 'TypeScript compilation completed',
      error: 'Type error in file.ts:15',
    },
  ],
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ValidationRunDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for taskApi to prevent unexpected calls
    (taskApi.getTasks as jest.Mock).mockResolvedValue([]);
  });

  it('should render loading state initially', () => {
    (analyticsApi.getValidationRuns as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<ValidationRunDetail />);

    expect(
      screen.getByText('Loading validation run details...')
    ).toBeInTheDocument();
  });

  it('should render error state when API fails', async () => {
    (analyticsApi.getValidationRuns as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load')).toBeInTheDocument();
      expect(
        screen.getByText('Could not load validation run details')
      ).toBeInTheDocument();
    });
  });

  it('should render not found state when run does not exist', async () => {
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue(
      [] // Empty array, so run won't be found
    );
    (taskApi.getTasks as jest.Mock).mockResolvedValue(
      [] // Empty array, no tasks with validation runs
    );

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Run Not Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The validation run with ID "test-run-123" could not be found.'
        )
      ).toBeInTheDocument();
    });
  });

  it('should render validation run details when data is available', async () => {
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      mockValidationRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Validation Run Details')).toBeInTheDocument();
      expect(screen.getByText(/Run ID: test-run-123/)).toBeInTheDocument();
      expect(screen.getByText('Validation Passed')).toBeInTheDocument();
    });

    // Check summary stats (using more specific selectors)
    expect(screen.getByText('Total Stages')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();

    // Check stage details
    expect(screen.getByText('Code Linting')).toBeInTheDocument();
    expect(screen.getByText('Type Checking')).toBeInTheDocument();
  });

  it('should show stage logs when Show Logs button is clicked', async () => {
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      mockValidationRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Validation Run Details')).toBeInTheDocument();
    });

    // Find and click the "Show Logs" button for the failed stage
    const showLogsButtons = screen.getAllByText('Show Logs');
    expect(showLogsButtons).toHaveLength(2); // Two stages with logs

    // Click on the button for the failed stage (should be the second one)
    act(() => {
      showLogsButtons[1].click();
    });

    await waitFor(() => {
      expect(screen.getByText('Hide Logs')).toBeInTheDocument();
      expect(screen.getByText('Error Output:')).toBeInTheDocument();
      expect(screen.getByText('Type error in file.ts:15')).toBeInTheDocument();
      expect(screen.getByText('Standard Output:')).toBeInTheDocument();
      expect(
        screen.getByText('TypeScript compilation completed')
      ).toBeInTheDocument();
    });
  });

  it('should navigate back to analytics when back button is clicked', async () => {
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      mockValidationRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Back to Analytics')).toBeInTheDocument();
    });

    act(() => {
      screen.getByText('Back to Analytics').click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/analytics');
  });

  it('should handle failed validation run correctly', async () => {
    const failedRun: ValidationRun = {
      ...mockValidationRun,
      success: false,
      stages: mockValidationRun.stages.map((stage) => ({
        ...stage,
        success: false,
      })),
    };

    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      failedRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Validation Failed')).toBeInTheDocument();
    });

    // Check that the failed stats are correct using specific labels
    const stageCards = screen.getAllByText('2');
    expect(stageCards.length).toBeGreaterThan(0); // Should find stage count numbers
    expect(screen.getByText('Total Stages')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
